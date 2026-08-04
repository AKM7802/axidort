"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TerritoryCategoryFields, type TerritoryCategoryValue } from "@/components/admin/territory-category-fields";
import { api, apiErrorMessage } from "@/lib/api";
import type { AdminClient, AdminUpdateClientPayload, ClientStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Canceled" },
];

export function ClientEditForm({
  token,
  client,
  onUpdated,
}: {
  token: string;
  client: AdminClient;
  onUpdated: (client: AdminClient) => void;
}) {
  // A "city" kind territory (whole-city match) stores the city's id as its
  // value — extract it directly. Any other kind doesn't carry a city
  // reference on the Territory row itself, so cityId starts empty and
  // TerritoryCategoryFields auto-fills it once GET /geo/states loads.
  const firstTerritory = client.territories[0];
  const initialCityId = firstTerritory?.kind === "city" ? firstTerritory.value : "";

  const [territoryCategory, setTerritoryCategory] = useState<TerritoryCategoryValue>({
    cityId: initialCityId,
    territoryKind: firstTerritory?.kind === "city" ? "zip" : (firstTerritory?.kind ?? "zip"),
    territoryValues: firstTerritory?.kind === "city" ? [] : client.territories.map((t) => t.value),
    categories: client.category_subscriptions
      .map((c) => c.category)
      .filter((c): c is AdminUpdateClientPayload["categories"][number] =>
        c === "pest" || c === "sanitation" || c === "equipment" || c === "plumbing" || c === "temperature",
      ),
  });
  const [isActive, setIsActive] = useState(client.is_active);
  const [isExclusive, setIsExclusive] = useState(client.is_exclusive);
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [submitting, setSubmitting] = useState(false);

  const requiresTerritoryValues = territoryCategory.territoryKind !== "zip";
  const canSubmit =
    (!requiresTerritoryValues || territoryCategory.territoryValues.length > 0) &&
    territoryCategory.categories.length > 0 &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (requiresTerritoryValues && territoryCategory.territoryValues.length === 0) {
      toast.error("Add at least one territory value before continuing.");
      return;
    }
    if (territoryCategory.categories.length === 0) {
      toast.error("Select at least one lead category before continuing.");
      return;
    }

    const payload: AdminUpdateClientPayload = {
      city_id: territoryCategory.cityId,
      territory_kind: territoryCategory.territoryKind,
      territory_values: territoryCategory.territoryValues,
      categories: territoryCategory.categories,
      is_active: isActive,
      is_exclusive: isExclusive,
      status,
    };

    setSubmitting(true);
    try {
      const updated = await api.adminUpdateClient(token, client.id, payload);
      toast.success("Client updated.");
      onUpdated(updated);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit client</CardTitle>
        <CardDescription>
          Territory and category changes fully replace this client&apos;s existing set — submit the complete desired
          set every time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
          <TerritoryCategoryFields value={territoryCategory} onChange={setTerritoryCategory} />

          <Separator />

          <section className="flex flex-col gap-4">
            <h3 className="font-heading text-sm font-semibold">Account status</h3>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
                <SelectTrigger id="status" className="w-full sm:w-64">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3 text-sm hover:bg-muted">
              <Checkbox
                className="mt-0.5"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <span>
                <span className="block font-medium">Active</span>
                <span className="text-xs text-muted-foreground">
                  Inactive clients stop receiving matched leads even if their subscription status is otherwise valid.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3 text-sm hover:bg-muted">
              <Checkbox
                className="mt-0.5"
                checked={isExclusive}
                onCheckedChange={(checked) => setIsExclusive(checked === true)}
              />
              <span>
                <span className="block font-medium">Exclusive</span>
                <span className="text-xs text-muted-foreground">
                  Exclusive clients are the only recipient for leads in their matched territory/category.
                </span>
              </span>
            </label>
          </section>

          <Button type="submit" className="w-full sm:w-auto" disabled={!canSubmit}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
