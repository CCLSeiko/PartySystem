// ============================================================
// DonationSystem — Utility Functions
// ============================================================

// ── cn: classnames merge ──
type ClassValue = string | number | boolean | null | undefined | ClassValue[];
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      classes.push(cn(...input));
    } else if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    }
  }
  return classes.join(' ');
}

// ── Status Colors ──
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-50 text-gray-500 border-gray-200',
    active: 'bg-green-50 text-green-700 border-green-200',
    paused: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    expired: 'bg-gray-50 text-gray-500 border-gray-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    generated: 'bg-purple-50 text-purple-700 border-purple-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
  };
  return map[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

// ── Formatting ──
export function formatCurrency(amount: number | undefined | null, currency?: string): string {
  if (amount == null) return '$0';
  const sym = currency === 'USD' ? '$' : currency === 'TWD' ? 'NT$' : '$';
  return `${sym}${amount.toLocaleString()}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Labels ──
export function getPurposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    general: '一般捐款',
    emergency_relief: '緊急救助',
    education: '教育贊助',
    medical: '醫療協助',
    other: '其他用途',
  };
  return map[purpose] || purpose;
}

export function getMethodLabel(method: string): string {
  const map: Record<string, string> = {
    credit_card: '信用卡',
    postal: '郵政劃撥',
    cash: '現金捐款',
  };
  return map[method] || method;
}

export function getFrequencyLabel(freq: string): string {
  const map: Record<string, string> = {
    monthly: '每月',
    quarterly: '每季',
    yearly: '每年',
  };
  return map[freq] || freq;
}
