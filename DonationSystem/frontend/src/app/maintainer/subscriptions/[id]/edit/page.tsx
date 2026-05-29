'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Card, LoadingSpinner } from '@/components/ui';
import { getFrequencyLabel, getPurposeLabel } from '@/lib/utils';
import {
  Save, ArrowLeft, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';

const FREQUENCIES = [
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季' },
  { value: 'yearly', label: '每年' },
];

const PAYMENT_METHODS = [
  { value: 'credit_card', label: '信用卡' },
  { value: 'postal', label: '郵政劃撥' },
  { value: 'cash', label: '現金' },
];

const PURPOSES = [
  { value: 'general', label: '一般捐款' },
  { value: 'emergency_relief', label: '急難救助' },
  { value: 'education', label: '教育贊助' },
  { value: 'medical', label: '醫療援助' },
  { value: 'other', label: '其他' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: '啟用中' },
  { value: 'paused', label: '已暫停' },
  { value: 'cancelled', label: '已取消' },
  { value: 'expired', label: '已到期' },
];

interface SubscriptionData {
  id: string;
  user_id: string;
  amount: string;
  currency: string;
  frequency: string;
  status: string;
  payment_method: string;
  purpose?: string;
  start_date?: string;
  end_date?: string | null;
  next_billing_date: string;
  last_billing_date?: string | null;
  total_cycles: number;
  cycles_completed: number;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
}

export default function EditSubscriptionPage() {
  const router = useRouter();

  // Extract ID from URL path
  const [subscriptionId, setSubscriptionId] = useState<string>('');

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const idx = pathParts.indexOf('subscriptions');
    if (idx !== -1 && pathParts[idx + 1]) {
      setSubscriptionId(pathParts[idx + 1]);
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [purpose, setPurpose] = useState('general');
  const [status, setStatus] = useState('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [totalCycles, setTotalCycles] = useState('0');
  const [cyclesCompleted, setCyclesCompleted] = useState('0');

  // Display-only
  const [donorName, setDonorName] = useState('');
  const [originalCurrency, setOriginalCurrency] = useState('TWD');

  useEffect(() => {
    if (subscriptionId) {
      loadSubscription();
    } else if (!loading) {
      setLoading(false);
    }
  }, [subscriptionId]);

  async function loadSubscription() {
    try {
      setLoading(true);
      const data: SubscriptionData = await api.maintenanceGetSubscription(subscriptionId);

      setAmount(data.amount);
      setFrequency(data.frequency);
      setPaymentMethod(data.payment_method);
      setPurpose(data.purpose || 'general');
      setStatus(data.status);
      setStartDate(data.start_date || '');
      setEndDate(data.end_date || '');
      setNextBillingDate(data.next_billing_date || '');
      setTotalCycles(String(data.total_cycles ?? 0));
      setCyclesCompleted(String(data.cycles_completed ?? 0));
      setOriginalCurrency(data.currency || 'TWD');

      // Try to get donor name from user_id — we can show user_id as fallback
      try {
        const donor = await api.maintenanceGetDonor(data.user_id);
        setDonorName(donor.name || data.user_id);
      } catch {
        setDonorName(data.user_id);
      }
    } catch (err) {
      console.error('Failed to load subscription', err);
      setError('無法載入訂閱資料');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!subscriptionId) return;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setMessage({ type: 'error', text: '請填寫有效金額' });
      return;
    }

    if (endDate && startDate && new Date(endDate) <= new Date(startDate)) {
      setMessage({ type: 'error', text: '結束日期必須晚於開始日期' });
      return;
    }

    setSaving(true);
    setMessage(null);
    setError('');

    try {
      await api.maintenanceUpdateSubscription(subscriptionId, {
        amount: amountNum,
        frequency,
        payment_method: paymentMethod,
        purpose,
        status,
        start_date: startDate || undefined,
        end_date: endDate || null,
        next_billing_date: nextBillingDate || undefined,
        total_cycles: totalCycles ? parseInt(totalCycles, 10) : undefined,
        cycles_completed: cyclesCompleted ? parseInt(cyclesCompleted, 10) : undefined,
      });

      setMessage({ type: 'success', text: '定期定額資料已更新' });
      setTimeout(() => {
        router.push('/maintainer/subscriptions');
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setMessage({ type: 'error', text: err.message });
      } else if (err instanceof Error) {
        setMessage({ type: 'error', text: err.message });
      } else {
        setMessage({ type: 'error', text: '更新失敗，請稍後再試' });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/maintainer/subscriptions')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">編輯定期定額</h1>
          <p className="text-sm text-gray-500 mt-1">
            捐款人：{donorName || '載入中...'}
          </p>
        </div>
      </div>

      {/* Error / Success Messages */}
      {message && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {message.text}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">基本資訊</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              金額（{originalCurrency}）<span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">捐款頻率</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">付款方式</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>

          {/* Purpose */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">捐款用途</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            >
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Schedule & Billing */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">排程與扣款</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>

          {/* Next Billing Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">下次扣款日</label>
            <input
              type="date"
              value={nextBillingDate}
              onChange={(e) => setNextBillingDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>

          {/* Total Cycles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">總期數（0 = 無限期）</label>
            <input
              type="number"
              min="0"
              value={totalCycles}
              onChange={(e) => setTotalCycles(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>

          {/* Cycles Completed */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">已完成期數</label>
            <input
              type="number"
              min="0"
              value={cyclesCompleted}
              onChange={(e) => setCyclesCompleted(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
        </div>
      </Card>

      {/* Summary Card */}
      <Card className="p-4 bg-gray-50 border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">目前設定摘要</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-500">金額：</span>
            <span className="font-medium">${parseFloat(amount || '0').toLocaleString()} {originalCurrency}</span>
          </div>
          <div>
            <span className="text-gray-500">頻率：</span>
            <span className="font-medium">{getFrequencyLabel(frequency)}</span>
          </div>
          <div>
            <span className="text-gray-500">用途：</span>
            <span className="font-medium">{getPurposeLabel(purpose)}</span>
          </div>
          <div>
            <span className="text-gray-500">狀態：</span>
            <span className="font-medium">{STATUS_OPTIONS.find(s => s.value === status)?.label || status}</span>
          </div>
          <div>
            <span className="text-gray-500">總期數：</span>
            <span className="font-medium">{totalCycles === '0' ? '無限期' : totalCycles}</span>
          </div>
          <div>
            <span className="text-gray-500">已進行：</span>
            <span className="font-medium">{cyclesCompleted} 期</span>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />儲存中...</>
          ) : (
            <><Save className="w-4 h-4" />儲存變更</>
          )}
        </button>
        <button
          onClick={() => router.push('/maintainer/subscriptions')}
          className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
        >
          取消
        </button>
      </div>
    </div>
  );
}
