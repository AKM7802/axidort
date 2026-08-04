"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { api, apiErrorMessage } from "@/lib/api";
import type { City, State, SubscribableCategory, TerritoryKind, TerritoryOption } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const TERRITORY_KIND_OPTIONS: { value: TerritoryKind; label: string; hint: string }[] = [
  { value: "zip", label: "Zip code", hint: "Optionally narrow to specific zip codes — leave empty to match the whole city." },
  { value: "borough", label: "Borough", hint: "Match leads within specific boroughs." },
  { value: "local_authority", label: "Local authority", hint: "Match leads within a specific local authority." },
  { value: "radius", label: "Radius", hint: "Match leads within a distance of a lat/lon point." },
];

const CATEGORY_OPTIONS: { value: SubscribableCategory; label: string; hint: string }[] = [
  { value: "pest", label: "Pest", hint: "Rodents, insects, and other pest violations." },
  { value: "sanitation", label: "Sanitation", hint: "Cleanliness, food handling, and hygiene violations." },
  { value: "equipment", label: "Equipment", hint: "Broken or non-compliant equipment." },
  { value: "plumbing", label: "Plumbing", hint: "Plumbing, water supply, and drainage violations." },
  { value: "temperature", label: "Temperature", hint: "Food storage and holding temperature violations." },
];

const RADIUS_PATTERN = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*\d+(\.\d+)?$/;

export interface TerritoryCategoryValue {
  /** Empty string means "not yet chosen" — the component auto-fills it
   * with the first available state's first city once GET /geo/states
   * loads (today that's always Illinois -> Chicago, the only one seeded). */
  cityId: string;
  territoryKind: TerritoryKind;
  /** May be empty when territoryKind is "zip" — means "match the whole
   * city" rather than "no territory". Required non-empty for every other kind. */
  territoryValues: string[];
  categories: SubscribableCategory[];
}

/**
 * State -> city -> (optional zip) -> category picker, matching the same UX
 * as app/signup/page.tsx's territory/category sections. Shared between the
 * admin "add client" form and the client edit form so both stay in sync with
 * the same picking rules (real values from GET /territories/options for
 * picklist kinds, freeform "lat,lon,radius_km" chips for radius).
 */
export function TerritoryCategoryFields({
  value,
  onChange,
}: {
  value: TerritoryCategoryValue;
  onChange: (next: TerritoryCategoryValue) => void;
}) {
  const { cityId, territoryKind, territoryValues, categories } = value;

  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);

  const [options, setOptions] = useState<TerritoryOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(territoryKind !== "radius");
  const [radiusInput, setRadiusInput] = useState("");

  const isPicklistKind = territoryKind !== "radius";
  const isZipKind = territoryKind === "zip";

  const selectedState = states.find((s) => s.cities.some((c) => c.id === cityId));
  const selectedCity = selectedState?.cities.find((c) => c.id === cityId);

  // Fetch the state/city list once, then auto-select the first state's
  // first city if nothing's chosen yet — today there's only ever one, so
  // there's no meaningful "pick one" step to force the user through.
  useEffect(() => {
    let cancelled = false;
    api
      .geoStates()
      .then((res) => {
        if (cancelled) return;
        setStates(res);
        if (!cityId && res.length > 0 && res[0].cities.length > 0) {
          onChange({ ...value, cityId: res[0].cities[0].id });
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch the real option list whenever the (picklist) territory kind or
  // selected city changes. Radius has no picklist, so there's nothing to
  // fetch or clear — the list simply isn't rendered while kind === "radius".
  useEffect(() => {
    if (territoryKind === "radius" || !cityId) return;
    let cancelled = false;
    setLoadingOptions(true);
    api
      .territoryOptions(cityId, territoryKind)
      .then((opts) => {
        if (!cancelled) setOptions(opts);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [territoryKind, cityId]);

  function handleStateChange(stateId: string | null) {
    if (stateId === null) return;
    const state = states.find((s) => s.id === stateId);
    const firstCity = state?.cities[0];
    onChange({ ...value, cityId: firstCity?.id ?? "", territoryValues: [] });
  }

  function handleCityChange(nextCityId: string | null) {
    if (nextCityId === null) return;
    onChange({ ...value, cityId: nextCityId, territoryValues: [] });
  }

  function handleTerritoryKindChange(kind: TerritoryKind) {
    setRadiusInput("");
    onChange({ ...value, territoryKind: kind, territoryValues: [] });
  }

  function toggleTerritoryValue(v: string, checked: boolean) {
    onChange({
      ...value,
      territoryValues: checked ? [...territoryValues, v] : territoryValues.filter((tv) => tv !== v),
    });
  }

  function addRadiusValue() {
    const trimmed = radiusInput.trim();
    if (!trimmed) return;
    if (!RADIUS_PATTERN.test(trimmed)) {
      toast.error("Use the format lat,lon,radius_km — e.g. 43.65,-79.38,15");
      return;
    }
    if (territoryValues.includes(trimmed)) {
      toast.error("That radius value is already added.");
      return;
    }
    onChange({ ...value, territoryValues: [...territoryValues, trimmed] });
    setRadiusInput("");
  }

  function removeTerritoryValue(v: string) {
    onChange({ ...value, territoryValues: territoryValues.filter((tv) => tv !== v) });
  }

  function toggleCategory(category: SubscribableCategory, checked: boolean) {
    onChange({
      ...value,
      categories: checked ? [...categories, category] : categories.filter((c) => c !== category),
    });
  }

  return (
    <>
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-heading text-sm font-semibold">Where do they want leads?</h3>
          <p className="text-xs text-muted-foreground">
            Pick a state and city, then optionally narrow to specific zip codes.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state">State *</Label>
            {loadingStates ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={selectedState?.id ?? ""} onValueChange={handleStateChange}>
                <SelectTrigger id="state" className="w-full">
                  <SelectValue placeholder="Select a state">
                    {(v: string | null) => states.find((s) => s.id === v)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City *</Label>
            {loadingStates ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={cityId} onValueChange={handleCityChange} disabled={!selectedState}>
                <SelectTrigger id="city" className="w-full">
                  <SelectValue placeholder="Select a city">
                    {(v: string | null) => selectedState?.cities.find((c) => c.id === v)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectedState?.cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="territory_kind">Territory type *</Label>
          <Select value={territoryKind} onValueChange={(v) => handleTerritoryKindChange(v as TerritoryKind)}>
            <SelectTrigger id="territory_kind" className="w-full">
              <SelectValue placeholder="Select a territory type" />
            </SelectTrigger>
            <SelectContent>
              {TERRITORY_KIND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {TERRITORY_KIND_OPTIONS.find((o) => o.value === territoryKind)?.hint}
          </p>
        </div>

        {isPicklistKind ? (
          <div className="flex flex-col gap-1.5">
            <Label>
              {isZipKind ? "Zip codes (optional)" : "Select at least one *"}
              {isZipKind && selectedCity && (
                <span className="ml-1 font-normal text-muted-foreground">
                  — none selected matches all of {selectedCity.name}
                </span>
              )}
            </Label>
            <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-lg border border-input p-2">
              {loadingOptions ? (
                <div className="flex flex-col gap-2 p-1">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ) : options.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No options available for this territory type.</p>
              ) : (
                options.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={territoryValues.includes(opt.value)}
                      onCheckedChange={(checked) => toggleTerritoryValue(opt.value, checked === true)}
                    />
                    {opt.label ?? opt.value}
                  </label>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="radius_input">Add a radius value *</Label>
            <div className="flex gap-2">
              <Input
                id="radius_input"
                value={radiusInput}
                onChange={(e) => setRadiusInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRadiusValue();
                  }
                }}
                placeholder="43.65,-79.38,15 (lat,lon,radius_km)"
              />
              <Button type="button" variant="outline" onClick={addRadiusValue}>
                Add
              </Button>
            </div>
            {territoryValues.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {territoryValues.map((v) => (
                  <Badge key={v} variant="secondary" className="gap-1 pr-1">
                    {v}
                    <button
                      type="button"
                      onClick={() => removeTerritoryValue(v)}
                      aria-label={`Remove ${v}`}
                      className="ml-0.5 rounded-full opacity-70 hover:opacity-100"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-heading text-sm font-semibold">What kind of leads?</h3>
          <p className="text-xs text-muted-foreground">Select at least one violation category.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3 text-sm hover:bg-muted"
            >
              <Checkbox
                className="mt-0.5"
                checked={categories.includes(opt.value)}
                onCheckedChange={(checked) => toggleCategory(opt.value, checked === true)}
              />
              <span>
                <span className="block font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
