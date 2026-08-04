import logging
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from app.models.client import Client
from app.models.enums import ClientStatus, ViolationSeverity
from app.models.inspection import InspectionEvent
from app.models.territory import Territory
from app.repositories.factory import Repositories
from app.services.territory_matching import territory_matches

logger = logging.getLogger(__name__)

REPEAT_OFFENDER_WINDOW_DAYS = 365
SAME_RESTAURANT_COOLDOWN_DAYS = 90

# rank_score v1 species bonuses (rodent/rat share the top bonus rather than stacking)
_PEST_SPECIES_SCORES: list[tuple[frozenset[str], int]] = [
    (frozenset({"rodent", "rat"}), 50),
    (frozenset({"mouse"}), 30),
    (frozenset({"roach"}), 20),
    (frozenset({"fly"}), 10),
]


def compute_rank_score(event: InspectionEvent, *, repeat_offender: bool) -> float:
    """rank_score v1 (deterministic; ship this, replace with a learned model
    at M5 only). A property of the event's violations, not of any one
    client match, so it's computed once per event.

    Two adjustments adopted from a sibling project's v1 review after
    checking real data:
    - a bare species-bonus scoring undercounts real pest leads: many real
      pest citations name no species at all (e.g. "conditions conducive to
      pests" with no observed rodent/roach), so they'd otherwise score
      identically to an unrelated sanitation/equipment lead. `category ==
      pest` alone is given a baseline (+15) independent of species.
    - summing every bonus uncapped can push a bad non-closure (multi-species
      repeat-offender critical pest citation) above 100, which would let it
      outrank an actual closure. Every non-closure contribution is capped
      below the closure bonus rather than trusting the weights never to
      collide.
    """
    categories: set[str] = set()
    species: set[str] = set()
    has_closure = False
    has_critical = False
    confidences: list[float] = []

    for violation in event.violations:
        categories.add(violation.category.value)
        if violation.severity == ViolationSeverity.CLOSURE:
            has_closure = True
        if violation.severity == ViolationSeverity.CRITICAL:
            has_critical = True
        if violation.species:
            species.update(s.lower() for s in violation.species)
        if violation.ai_confidence is not None:
            confidences.append(float(violation.ai_confidence))

    score = 0.0
    if "pest" in categories:
        score += 15
    for species_set, points in _PEST_SPECIES_SCORES:
        if species & species_set:
            score += points
    if repeat_offender:
        score += 15
    if has_critical:
        score += 10
    if confidences:
        # numeric_score_norm: mean classifier confidence (already 0-1); Chicago
        # has no jurisdiction numeric score (contrast UK's hygiene rating).
        score += sum(confidences) / len(confidences)

    score = min(score, 99.0)
    if has_closure:
        score += 100
    return score


def run_lead_matching(repos: Repositories, *, since: datetime, now: datetime) -> int:
    """Event-centric candidate matching:

      candidate leads: new events joined to clients on territory + category subscription
      territory match: zip in territories.value OR borough/local_authority match OR
        (kind='radius' AND haversine(restaurant.lat,lng, center) <= km)
      exclude: restaurant_id in do_not_contact
      exclude: exists lead for (client_id, restaurant_id) with created_at > now()-interval '90 days'
      exclusivity: if any client in this market has exclusive=true and territory covers the
        restaurant, route ONLY to that client

    'restaurant_id' is (source_city, license_number) — Chicago's
    license_number is the stable per-establishment id across repeat
    inspections; there's no separate normalized restaurants table. Events
    with no license_number can't be identified as a repeat restaurant, so
    they're never blocked by do_not_contact/90-day dedup and never count as
    a repeat offender.

    Returns the number of client_leads created.
    """
    events = repos.events.get_leads_since(since)
    if not events:
        return 0

    territories = repos.territories.get_all_with_client()
    blocked = repos.do_not_contact.get_all_blocked()
    recent_restaurant_keys = repos.client_leads.get_recent_restaurant_keys(
        now - timedelta(days=SAME_RESTAURANT_COOLDOWN_DAYS)
    )
    existing_pairs = repos.client_leads.get_existing_pairs([event.id for event in events])

    restaurant_keys = [(event.source_city, event.license_number) for event in events if event.license_number]
    pest_counts = repos.events.count_pest_events_by_restaurant(
        restaurant_keys, now - timedelta(days=REPEAT_OFFENDER_WINDOW_DAYS)
    )

    new_rows: list[dict[str, Any]] = []
    for event in events:
        restaurant_key = (event.source_city, event.license_number) if event.license_number else None
        repeat_offender = bool(restaurant_key and pest_counts.get(restaurant_key, 0) >= 2)
        rank_score = compute_rank_score(event, repeat_offender=repeat_offender)

        candidates: dict[UUID, tuple[Territory, Client]] = {}
        for territory in territories:
            client = territory.client
            if client is None or not client.is_active or client.status != ClientStatus.ACTIVE:
                continue
            if client.id in candidates:
                continue  # already matched via a different territory of theirs
            if not territory_matches(territory, event):
                continue
            if not _category_subscription_matches(client, event):
                continue
            if restaurant_key and (client.id, *restaurant_key) in blocked:
                continue
            if restaurant_key and (client.id, *restaurant_key) in recent_restaurant_keys:
                continue
            candidates[client.id] = (territory, client)

        if not candidates:
            continue

        # Exclusivity only narrows the candidate set built above — it never
        # bypasses subscription/territory/dedup matching. An exclusive
        # client with no interest in this violation category (or outside
        # their territory) still shouldn't receive it just for being
        # exclusive elsewhere.
        exclusive_clients = [client for _, client in candidates.values() if client.is_exclusive]
        if exclusive_clients:
            chosen = min(exclusive_clients, key=lambda c: c.created_at)
            if len(exclusive_clients) > 1:
                logger.warning(
                    "multiple exclusive clients matched restaurant %s/%s; routing to earliest-created (%s)",
                    event.source_city,
                    event.license_number,
                    chosen.id,
                )
            candidates = {chosen.id: candidates[chosen.id]}

        for client_id, (territory, _client) in candidates.items():
            if (client_id, event.id) in existing_pairs:
                continue
            new_rows.append(
                {
                    "client_id": client_id,
                    "inspection_event_id": event.id,
                    "territory_id": territory.id,
                    "matched_at": now,
                    "rank_score": rank_score,
                }
            )

    if not new_rows:
        return 0

    return len(repos.client_leads.bulk_create(new_rows))


def _category_subscription_matches(client: Client, event: InspectionEvent) -> bool:
    subscribed = {sub.category for sub in client.category_subscriptions}
    if not subscribed:
        return False
    event_categories = {violation.category for violation in event.violations}
    return bool(subscribed & event_categories)
