from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.repositories.interfaces import (
    CategorySubscriptionRepository,
    ClientLeadRepository,
    ClientRepository,
    DoNotContactRepository,
    EmailDigestRepository,
    GeoRepository,
    InspectionEventRepository,
    NotificationPreferenceRepository,
    PasswordResetTokenRepository,
    PaymentRepository,
    ReviewQueueRepository,
    SubscriptionRepository,
    TerritoryOptionRepository,
    TerritoryRepository,
    ViolationRepository,
    ZipMappingFlagRepository,
)
from app.repositories.sqlalchemy_repo import (
    SqlAlchemyCategorySubscriptionRepository,
    SqlAlchemyClientLeadRepository,
    SqlAlchemyClientRepository,
    SqlAlchemyDoNotContactRepository,
    SqlAlchemyEmailDigestRepository,
    SqlAlchemyGeoRepository,
    SqlAlchemyInspectionEventRepository,
    SqlAlchemyNotificationPreferenceRepository,
    SqlAlchemyPasswordResetTokenRepository,
    SqlAlchemyPaymentRepository,
    SqlAlchemyReviewQueueRepository,
    SqlAlchemySubscriptionRepository,
    SqlAlchemyTerritoryOptionRepository,
    SqlAlchemyTerritoryRepository,
    SqlAlchemyViolationRepository,
    SqlAlchemyZipMappingFlagRepository,
)


@dataclass
class Repositories:
    clients: ClientRepository
    territories: TerritoryRepository
    territory_options: TerritoryOptionRepository
    category_subscriptions: CategorySubscriptionRepository
    do_not_contact: DoNotContactRepository
    events: InspectionEventRepository
    violations: ViolationRepository
    review_queue: ReviewQueueRepository
    notification_preferences: NotificationPreferenceRepository
    client_leads: ClientLeadRepository
    email_digests: EmailDigestRepository
    password_reset_tokens: PasswordResetTokenRepository
    geo: GeoRepository
    zip_mapping_flags: ZipMappingFlagRepository
    subscriptions: SubscriptionRepository
    payments: PaymentRepository


def build_repositories(session: Session) -> Repositories:
    """The single wiring point between the abstract repository interfaces
    and a concrete storage backend. Service code depends only on the
    interfaces in `interfaces.py`; to move off SQLAlchemy/Postgres (e.g. to
    Supabase's PostgREST client or another store entirely), swap the
    implementations constructed here — nothing in app/services/ changes.
    """

    return Repositories(
        clients=SqlAlchemyClientRepository(session),
        territories=SqlAlchemyTerritoryRepository(session),
        territory_options=SqlAlchemyTerritoryOptionRepository(session),
        category_subscriptions=SqlAlchemyCategorySubscriptionRepository(session),
        do_not_contact=SqlAlchemyDoNotContactRepository(session),
        events=SqlAlchemyInspectionEventRepository(session),
        violations=SqlAlchemyViolationRepository(session),
        review_queue=SqlAlchemyReviewQueueRepository(session),
        notification_preferences=SqlAlchemyNotificationPreferenceRepository(session),
        client_leads=SqlAlchemyClientLeadRepository(session),
        email_digests=SqlAlchemyEmailDigestRepository(session),
        password_reset_tokens=SqlAlchemyPasswordResetTokenRepository(session),
        geo=SqlAlchemyGeoRepository(session),
        zip_mapping_flags=SqlAlchemyZipMappingFlagRepository(session),
        subscriptions=SqlAlchemySubscriptionRepository(session),
        payments=SqlAlchemyPaymentRepository(session),
    )
