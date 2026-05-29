// ============================================================
// DonationSystem — TypeScript Types
// ============================================================

// --- User ---
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  has_identity_number: boolean;
  tax_consent: boolean;
  is_active: boolean;
  role: 'user' | 'donation_maintainer' | 'admin';
  created_at: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  identity_number?: string;
  phone?: string;
  tax_consent?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  identity_number?: string;
}

// --- Donation ---
export type DonationStatus = 'pending' | 'success' | 'failed' | 'cancelled';
export type PaymentMethod = 'credit_card' | 'postal' | 'cash';
export type DonationPurpose = 'general' | 'emergency_relief' | 'education' | 'medical' | 'other';

export interface CreateDonationInput {
  amount: number;
  currency?: string;
  purpose?: string;
  payment_method: PaymentMethod;
  is_recurring?: boolean;
  guest_email?: string;
  guest_name?: string;
}

export interface Donation {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  payment_method: PaymentMethod;
  status: DonationStatus;
  is_recurring: boolean;
  subscription_id: string | null;
  receipt_number: string | null;
  tax_deductible: boolean;
  payment?: Payment;
  created_at: string;
  updated_at: string;
}

// --- Payment ---
export interface Payment {
  id: string;
  payment_gateway: string;
  gateway_transaction_id: string | null;
  amount: number;
  status: string;
  created_at: string;
}

export interface CreditCardPayment {
  donation_id: string;
  amount: number;
  currency?: string;
  payment_method_id?: string;  // Optional: for Elements flow (frontend confirms via Stripe.js)
}

export interface PaymentIntentResponse {
  payment_intent_id: string;
  client_secret: string;
  status: string;
}

export interface PostalDraftResponse {
  draft_id: string;
  draft_number: string;
  postal_account: string;
  amount: number;
  status: string;
  download_url: string;
  created_at: string;
}

export interface CashPaymentInput {
  donation_id: string;
  amount: number;
  location: string;
  staff_id: string;
  notes?: string;
}

// --- Subscription ---
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';
export type SubscriptionFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface CreateSubscriptionInput {
  amount: number;
  currency?: string;
  frequency: SubscriptionFrequency;
  payment_method_id: string;
  total_cycles?: number;
  purpose?: string;
}

export interface Subscription {
  id: string;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  next_billing_date: string | null;
  last_billing_date: string | null;
  cycles_completed: number;
  total_cycles: number;
  consecutive_failures: number;
  purpose: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionHistory {
  donation_id: string;
  amount: number;
  status: string;
  billing_date: string;
  receipt_number: string | null;
  failure_reason?: string;
}

// --- Admin ---
export interface AdminStatsSummary {
  total_donations: number;
  total_amount: number;
  avg_per_donation: number;
  total_recurring: number;
  recurring_success_rate: number;
}

export interface AdminStats {
  summary: AdminStatsSummary;
  by_method: Record<string, number>;
  by_purpose: Record<string, number>;
  time_series: { date: string; amount: number; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  total_donated: number;
  has_active_subscription: boolean;
  created_at: string;
}

export interface Reconciliation {
  id: string;
  file_name: string;
  total_records: number;
  matched_count: number;
  unmatched_count: number;
  status: string;
  created_at: string;
}

export interface ReconciliationDetail extends Reconciliation {
  unmatched_items: {
    row: number;
    draft_number: string;
    expected_amount: number;
    actual_amount: number;
    reason: string;
  }[];
}

export interface TaxSummary {
  year: number;
  total_donors: number;
  total_tax_consented: number;
  total_amount: number;
  tax_deductible_amount: number;
  status: string;
  last_report_generated: string | null;
}

export interface SystemSettings {
  min_donation_amount: number;
  donation_purposes: string[];
  subscription_retry_limit: number;
  auto_pause_after_failures: number;
}

// --- Common ---
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
