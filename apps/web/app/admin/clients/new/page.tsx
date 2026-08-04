"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TerritoryCategoryFields, type TerritoryCategoryValue } from "@/components/admin/territory-category-fields";
import { useAdminAuth } from "@/lib/admin-auth";
import { api, apiErrorMessage } from "@/lib/api";
import type { AdminCreateClientPayload } from "@/lib/types";

export default function AdminNewClientPage() {
  const router = useRouter();
  const { loading, isAdmin, token } = useAdminAuth();

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

  // Territory + categories
  const [territoryCategory, setTerritoryCategory] = useState<TerritoryCategoryValue>({
    cityId: "",
    territoryKind: "zip",
    territoryValues: [],
    categories: [],
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/admin/login");
    }
  }, [loading, isAdmin, router]);

  const requiresTerritoryValues = territoryCategory.territoryKind !== "zip";
  const canSubmit =
    (!requiresTerritoryValues || territoryCategory.territoryValues.length > 0) &&
    territoryCategory.categories.length > 0 &&
    password.length >= 8 &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (requiresTerritoryValues && territoryCategory.territoryValues.length === 0) {
      toast.error("Add at least one territory value before continuing.");
      return;
    }
    if (territoryCategory.categories.length === 0) {
      toast.error("Select at least one lead category before continuing.");
      return;
    }

    const payload: AdminCreateClientPayload = {
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
      city_id: territoryCategory.cityId,
      territory_kind: territoryCategory.territoryKind,
      territory_values: territoryCategory.territoryValues,
      categories: territoryCategory.categories,
    };

    setSubmitting(true);
    try {
      const result = await api.adminCreateClient(token, payload);
      toast.success("Client created.");
      router.push(`/admin/clients/${result.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center gap-2">
        <Badge variant="secondary">Admin</Badge>
        <h1 className="text-xl font-semibold">Add client</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create a client account</CardTitle>
          <CardDescription>
            Set up their login, territory matching, and lead categories — same as self-service signup.
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
              <p className="-mt-2 text-xs text-muted-foreground">Optional — helps tailor their account.</p>
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

            <TerritoryCategoryFields value={territoryCategory} onChange={setTerritoryCategory} />

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? "Creating client…" : "Create client"}
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
            <Link href="/admin/clients" className="font-medium text-foreground hover:underline">
              &larr; Back to clients
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
