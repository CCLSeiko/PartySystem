// ============================================================
// DonationSystem — API Client
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  details: { field: string; message: string }[];

  constructor(message: string, status: number = 400, details: { field: string; message: string }[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = 'Request failed';
    let details: { field: string; message: string }[] = [];
    try {
      const err = await res.json();
      if (err.detail) {
        if (typeof err.detail === 'string') {
          message = err.detail;
        } else if (Array.isArray(err.detail)) {
          details = err.detail.map((d: any) => ({
            field: d.loc?.[d.loc.length - 1] || 'unknown',
            message: d.msg || d.message || 'Validation error',
          }));
          message = details.map((d) => d.message).join('; ');
        } else if (typeof err.detail === 'object') {
          message = err.detail.message || err.detail.msg || JSON.stringify(err.detail);
        }
      } else if (err.message) {
        message = err.message;
      }
    } catch {
      message = res.statusText || `HTTP ${res.status}`;
    }
    throw new ApiError(message, res.status, details);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/** Build query string from an object, skipping undefined/null values. */
function qs(params: Record<string, any>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

function getToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem('auth_token');
  return stored || undefined;
}

function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

// --- API Methods ---

export const api = {
  // ── Auth ──
  async register(input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    tax_consent?: boolean;
  }): Promise<{ id: string; email: string; name: string; role: string }> {
    return request('POST', '/users/register', input);
  },

  async login(email: string, password: string): Promise<{ access_token: string }> {
    const result = await request<{ access_token: string }>('POST', '/users/login', { email, password });
    setToken(result.access_token);
    return result;
  },

  async getMe(): Promise<{
    id: string;
    email: string;
    name: string;
    phone?: string;
    has_identity_number: boolean;
    tax_consent: boolean;
    role: 'user' | 'admin';
    is_active: boolean;
    created_at: string;
  }> {
    return request('GET', '/users/me', undefined, getToken());
  },

  async updateProfile(input: { name?: string; phone?: string }): Promise<{
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: 'user' | 'admin';
  }> {
    return request('PUT', '/users/me', input, getToken());
  },

  async updateTaxConsent(tax_consent: boolean): Promise<{ tax_consent: boolean; updated_at: string }> {
    return request('PUT', '/users/me/tax-consent', { tax_consent }, getToken());
  },

  // ── Donations ──
  async createDonation(input: {
    amount: number;
    purpose?: string;
    payment_method: string;
    is_recurring?: boolean;
    guest_email?: string;
    guest_name?: string;
  }): Promise<{ id: string }> {
    return request('POST', '/donations', input, getToken());
  },

  async getDonations(params?: {
    status?: string;
    payment_method?: string;
    purpose?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    per_page?: number;
  }): Promise<{
    data: any[];
    pagination: { page: number; per_page: number; total: number; total_pages: number };
  }> {
    return request('GET', `/donations${qs(params || {})}`, undefined, getToken());
  },

  // ── Payments ──
  async createCreditCardPayment(input: {
    donation_id: string;
    amount: number;
    currency?: string;
    payment_method_id?: string;
  }): Promise<{ payment_intent_id: string; client_secret: string; status: string }> {
    return request('POST', '/payments/credit-card', input, getToken());
  },

  async createPostalDraft(input: {
    donation_id: string;
    amount: number;
  }): Promise<{ draft_id: string; draft_number: string; postal_account: string; amount: number; status: string }> {
    return request('POST', '/payments/postal', input, getToken());
  },

  // ── Subscriptions ──
  async getSubscriptions(params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<{
    data: any[];
    pagination: { page: number; per_page: number; total: number; total_pages: number };
  }> {
    return request('GET', `/subscriptions${qs(params || {})}`, undefined, getToken());
  },

  async pauseSubscription(id: string): Promise<any> {
    return request('PUT', `/subscriptions/${id}/pause`, undefined, getToken());
  },

  async resumeSubscription(id: string): Promise<any> {
    return request('PUT', `/subscriptions/${id}/resume`, undefined, getToken());
  },

  async cancelSubscription(id: string): Promise<any> {
    return request('PUT', `/subscriptions/${id}/cancel`, undefined, getToken());
  },

  // ── Admin: Donations ──
  async adminGetDonations(params?: Record<string, any>): Promise<{
    data: any[];
    pagination: { page: number; per_page: number; total: number; total_pages: number };
  }> {
    return request('GET', `/admin/donations${qs(params || {})}`, undefined, getToken());
  },

  async adminUpdateDonationStatus(donationId: string, status: string): Promise<any> {
    return request('PUT', `/admin/donations/${donationId}/status`, { status }, getToken());
  },

  // ── Admin: Stats ──
  async adminGetStats(): Promise<any> {
    return request('GET', '/admin/stats', undefined, getToken());
  },

  // ── Admin: Users ──
  async adminGetUsers(params?: {
    q?: string;
    is_active?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<{
    data: any[];
    pagination: { page: number; per_page: number; total: number; total_pages: number };
  }> {
    return request('GET', `/admin/users${qs(params || {})}`, undefined, getToken());
  },

  async adminToggleUserStatus(userId: string, is_active: boolean): Promise<any> {
    return request('PUT', `/admin/users/${userId}/status${qs({ is_active })}`, undefined, getToken());
  },

  // ── Admin: Reconciliation ──
  async adminGetReconciliations(params?: {
    page?: number;
    per_page?: number;
  }): Promise<{
    data: any[];
    pagination: { page: number; per_page: number; total: number; total_pages: number };
  }> {
    return request('GET', `/admin/reconciliation${qs(params || {})}`, undefined, getToken());
  },

  async adminUploadReconciliation(file: File): Promise<any> {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // Don't set Content-Type — browser sets it with boundary for FormData
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/admin/reconciliation/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      let msg = 'Upload failed';
      try {
        const err = await res.json();
        msg = err.detail || err.message || msg;
      } catch {}
      throw new ApiError(msg, res.status);
    }
    return res.json();
  },

  async adminGetReconciliationDetail(id: string): Promise<any> {
    return request('GET', `/admin/reconciliation/${id}`, undefined, getToken());
  },

  // ── Admin: Settings ──
  async adminGetSettings(): Promise<{
    min_donation_amount: number;
    donation_purposes: string[];
    subscription_retry_limit: number;
    auto_pause_after_failures: number;
  }> {
    return request('GET', '/admin/settings', undefined, getToken());
  },

  async adminUpdateSettings(input: Partial<{
    min_donation_amount: number;
    donation_purposes: string[];
    subscription_retry_limit: number;
    auto_pause_after_failures: number;
  }>): Promise<any> {
    return request('PUT', '/admin/settings', input, getToken());
  },

  // ── Admin: Tax ──
  async adminGetTaxSummary(year: number): Promise<any> {
    return request('GET', `/admin/tax/summary/${year}`, undefined, getToken());
  },

  adminDownloadTaxReport(year: number): string {
    const token = getToken();
    const base = API_BASE;
    const url = `${base}/admin/tax/report/${year}`;
    return token ? `${url}?token=${token}` : url;
  },

  // ── Logout ──
  logout() {
    clearToken();
  },
};
