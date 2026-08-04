"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { XIcon } from "lucide-react";
import { toast } from "sonner";

import { api, apiErrorMessage } from "@/lib/api";
import { useClientAuth } from "@/lib/client-auth";
import { BRAND_INITIALS, BRAND_NAME } from "@/lib/brand";
import type { SignupPayload, State, SubscribableCategory, TerritoryKind, TerritoryOption } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useClientAuth();

  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Business details
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessZip, setBusinessZip] = useState("");
  const [industry, setIndustry] = useState("");

  // Territory
  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [cityId, setCityId] = useState("");
  const [territoryKind, setTerritoryKind] = useState<TerritoryKind>("zip");
  const [territoryValues, setTerritoryValues] = useState<string[]>([]);
  const [options, setOptions] = useState<TerritoryOption[]>([]);
  // Starts true: the default territory kind ("zip") is a picklist kind whose
  // options are fetched once a city is selected.
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [radiusInput, setRadiusInput] = useState("");

  // Categories
  const [categories, setCategories] = useState<SubscribableCategory[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const isPicklistKind = territoryKind !== "radius";
  const requiresTerritoryValues = territoryKind !== "zip";
  const selectedState = states.find((s) => s.cities.some((c) => c.id === cityId));
  const selectedCity = selectedState?.cities.find((c) => c.id === cityId);

  // Fetch the state/city list once, then auto-select the first state's
  // first city — today there's only ever one (Illinois -> Chicago), so
  // there's no meaningful "pick one" step to force the user through.
  useEffect(() => {
    let cancelled = false;
    api
      .geoStates()
      .then((res) => {
        if (cancelled) return;
        setStates(res);
        if (res.length > 0 && res[0].cities.length > 0) {
          setCityId(res[0].cities[0].id);
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
  }, []);

  // Fetch the real option list whenever the (picklist) territory kind or
  // selected city changes. Radius has no picklist, so there's nothing to
  // fetch or clear — the list simply isn't rendered while territoryKind === "radius".
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
    setCityId(state?.cities[0]?.id ?? "");
    setTerritoryValues([]);
  }

  function handleCityChange(nextCityId: string | null) {
    if (nextCityId === null) return;
    setCityId(nextCityId);
    setTerritoryValues([]);
  }

  // The value shapes (and, for picklists, the valid option set) differ per
  // kind, so switching kinds resets whatever was previously selected/entered.
  function handleTerritoryKindChange(kind: TerritoryKind) {
    setTerritoryKind(kind);
    setTerritoryValues([]);
    setRadiusInput("");
    if (kind !== "radius") setLoadingOptions(true);
  }

  function toggleTerritoryValue(value: string, checked: boolean) {
    setTerritoryValues((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)));
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
    setTerritoryValues((prev) => [...prev, trimmed]);
    setRadiusInput("");
  }

  function removeTerritoryValue(value: string) {
    setTerritoryValues((prev) => prev.filter((v) => v !== value));
  }

  function toggleCategory(category: SubscribableCategory, checked: boolean) {
    setCategories((prev) => (checked ? [...prev, category] : prev.filter((c) => c !== category)));
  }

  const canSubmit =
    (!requiresTerritoryValues || territoryValues.length > 0) &&
    categories.length > 0 &&
    password.length >= 8 &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (requiresTerritoryValues && territoryValues.length === 0) {
      toast.error("Add at least one territory value before continuing.");
      return;
    }
    if (categories.length === 0) {
      toast.error("Select at least one lead category before continuing.");
      return;
    }

    const payload: SignupPayload = {
      email,
      password,
      company_name: companyName,
      contact_name: contactName,
      contact_phone: contactPhone || undefined,
      business_address: businessAddress || undefined,
      business_city: businessCity || undefined,
      business_state: businessState || undefined,
      business_zip: businessZip || undefined,
      industry: industry || undefined,
      city_id: cityId,
      territory_kind: territoryKind,
      territory_values: territoryValues,
      categories,
    };

    setSubmitting(true);
    try {
      const client = await signup(payload);
      // Brand-new signups always start unpaid (see backend ClientStatus.UNPAID
      // default) — send them to checkout before they ever see the dashboard.
      router.push(client.status === "active" ? "/dashboard" : "/payment");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Link href="/" className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold tracking-tight">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
              {BRAND_INITIALS}
            </span>
            {BRAND_NAME}
          </Link>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Tell us where to look and what to look for. One quick payment step next, then we start matching leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
            {/* Account */}
            <section className="flex flex-col gap-4">
              <h3 className="font-heading text-sm font-semibold">Account</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="company_name">Company name *</Label>
                  <Input
                    id="company_name"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Pest Control"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contact_name">Contact name *</Label>
                  <Input
                    id="contact_name"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contact_phone">Contact phone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    autoComplete="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(555) 555-0100"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Business details */}
            <section className="flex flex-col gap-4">
              <h3 className="font-heading text-sm font-semibold">Business details</h3>
              <p className="-mt-2 text-xs text-muted-foreground">Optional — helps us tailor your account.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="business_address">Business address</Label>
                  <Input
                    id="business_address"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="business_city">City</Label>
                  <Input
                    id="business_city"
                    value={businessCity}
                    onChange={(e) => setBusinessCity(e.target.value)}
                    placeholder="Chicago"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="business_state">State</Label>
                  <Input
                    id="business_state"
                    value={businessState}
                    onChange={(e) => setBusinessState(e.target.value)}
                    placeholder="IL"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="business_zip">Zip</Label>
                  <Input
                    id="business_zip"
                    value={businessZip}
                    onChange={(e) => setBusinessZip(e.target.value)}
                    placeholder="60601"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Pest control"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Territory */}
            <section className="flex flex-col gap-4">
              <div>
                <h3 className="font-heading text-sm font-semibold">Where do you want leads?</h3>
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
                <Select
                  value={territoryKind}
                  onValueChange={(value) => handleTerritoryKindChange(value as TerritoryKind)}
                >
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
                    {requiresTerritoryValues ? "Select at least one *" : "Zip codes (optional)"}
                    {!requiresTerritoryValues && selectedCity && (
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
                      {territoryValues.map((value) => (
                        <Badge key={value} variant="secondary" className="gap-1 pr-1">
                          {value}
                          <button
                            type="button"
                            onClick={() => removeTerritoryValue(value)}
                            aria-label={`Remove ${value}`}
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

            <Separator />

            {/* Categories */}
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

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
              {!canSubmit && !submitting && (
                <p className="text-center text-xs text-muted-foreground">
                  Password (8+ characters) and at least one category are required
                  {requiresTerritoryValues ? ", along with at least one territory value" : ""}.
                </p>
              )}
            </div>
          </form>

          <p className="mt-2 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
