// "city" is a read-only value the backend can return (a whole-city match
// created when zip is left empty at signup) — it's never a user-selectable
// option in the Territory type dropdown itself, see TERRITORY_KIND_OPTIONS.
export type TerritoryKind = "zip" | "borough" | "local_authority" | "radius" | "city";

export type SubscribableCategory = "pest" | "sanitation" | "equipment" | "plumbing" | "temperature";

export type ViolationCategory = SubscribableCategory | "other";

export type ViolationSeverity = "closure" | "critical" | "citation" | "conducive";

export type ClientStatus = "unpaid" | "trial" | "active" | "past_due" | "canceled";

export type ClientRole = "client" | "admin";

export interface TerritoryOption {
  kind: TerritoryKind;
  value: string;
  label: string | null;
}

export interface City {
  id: string;
  name: string;
  code: string;
}

export interface State {
  id: string;
  name: string;
  code: string;
  cities: City[];
}

export interface Territory {
  id: string;
  kind: TerritoryKind;
  value: string;
}

export interface CategorySubscription {
  category: ViolationCategory;
}

export interface ClientProfile {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  status: ClientStatus;
  role: ClientRole;
  created_at: string;
  territories: Territory[];
  category_subscriptions: CategorySubscription[];
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  client: ClientProfile;
}

export interface CheckoutSession {
  checkout_url: string;
}

export interface Violation {
  category: ViolationCategory;
  severity: ViolationSeverity;
  species: string[] | null;
  description_raw: string | null;
}

export interface LeadEvent {
  business_name: string;
  address_line: string | null;
  municipality: string | null;
  state: string | null;
  postal_code: string | null;
  inspection_date: string | null;
  result: string | null;
  narration: string | null;
  violations: Violation[];
}

export interface Lead {
  id: string;
  matched_at: string;
  included_in_email: boolean;
  rank_score: number | null;
  inspection_event: LeadEvent;
}

export interface PaginatedLeads {
  total: number;
  limit: number;
  offset: number;
  items: Lead[];
}

export interface AdminClient {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  contact_phone: string | null;
  business_address: string | null;
  business_city: string | null;
  business_state: string | null;
  business_zip: string | null;
  industry: string | null;
  status: ClientStatus;
  role: ClientRole;
  is_active: boolean;
  is_exclusive: boolean;
  created_at: string;
  territories: Territory[];
  category_subscriptions: CategorySubscription[];
}

export interface AdminReviewQueueItem {
  id: string;
  status: string;
  created_at: string;
  violation_id: string;
  business_name: string;
  category: ViolationCategory;
  description_raw: string | null;
  ai_confidence: number | null;
}

export interface WeeklyCount {
  week_start: string;
  count: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface MeStats {
  total_leads: number;
  leads_last_7_days: number;
  by_category: CategoryCount[];
  by_week: WeeklyCount[];
}

export type DigestStatus = "pending" | "sent" | "failed";

export interface EmailDigest {
  id: string;
  period_start: string;
  period_end: string;
  lead_count: number;
  status: DigestStatus;
  sent_at: string | null;
  created_at: string;
}

export interface PaginatedDigests {
  total: number;
  limit: number;
  offset: number;
  items: EmailDigest[];
}

export interface EmailDigestDetail extends EmailDigest {
  leads: Lead[];
}

export interface AdminStats {
  total_clients: number;
  total_inspection_events: number;
  total_leads: number;
  pending_review_queue: number;
  leads_by_week: WeeklyCount[];
  clients_by_week: WeeklyCount[];
  leads_by_category: CategoryCount[];
}

export interface SignupPayload {
  email: string;
  password: string;
  company_name: string;
  contact_name: string;
  contact_phone?: string;
  business_address?: string;
  business_city?: string;
  business_state?: string;
  business_zip?: string;
  industry?: string;
  city_id: string;
  territory_kind: TerritoryKind;
  /** May be empty when territory_kind is "zip" — means "match the whole city". */
  territory_values: string[];
  categories: SubscribableCategory[];
}

/** Admin-operated client creation — identical shape to SignupPayload. */
export interface AdminCreateClientPayload {
  email: string;
  password: string;
  company_name: string;
  contact_name: string;
  contact_phone?: string;
  business_address?: string;
  business_city?: string;
  business_state?: string;
  business_zip?: string;
  industry?: string;
  city_id: string;
  territory_kind: TerritoryKind;
  territory_values: string[];
  categories: SubscribableCategory[];
}

/** Full replace of a client's territories/categories/flags/status. */
export interface AdminUpdateClientPayload {
  city_id: string;
  territory_kind: TerritoryKind;
  territory_values: string[];
  categories: SubscribableCategory[];
  is_active: boolean;
  is_exclusive: boolean;
  status: ClientStatus;
}
