'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Card } from '@/components/ui';
import { getFrequencyLabel, getMethodLabel, getPurposeLabel } from '@/lib/utils';
import {
  ArrowLeft, DollarSign, Repeat, CreditCard, Landmark, Banknote,
  Calendar, FileText, AlertCircle, CheckCircle2, Loader2, RefreshCw,
} from 'lucide-react';

const FREQUENCIES = [
  { value: 'monthly', label: '每月', desc: '每月扣款一次' },
  { value: 'quarterly', label: '每季', desc: '每三個月扣款一次' },
  { value: 'yearly', label: '每年', desc: '每年扣款一次' },
];

const PAYMENT_METHODS = [
  { value: 'credit_card', label: '信用卡', icon: <CreditCard className="w-5 h-5" /> },
  { value: 'postal', label: '郵政劃撥', icon: <Landmark className="w-5 h-5" /> },
  { value: 'cash', label: '現金', icon: <Banknote className="w-5 h-5" /> },
];

const PURPOSES = [
  { value: '', label: '不限用途' },
  { value: 'general', label: '一般捐款' },
  { value: 'emergency_relief', label: '緊急救助' },
  { value: 'education', label: '教育贊助' },
  { value: 'medical', label: '醫療協助' },
];

export default function NewMemberSubscriptionPage() {
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [purpose, setPurpose] = useState('');
  const [totalCycles, setTotalCycles] = useState('0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('請輸入有效捐款金額');
      return;
    }

    const cycles = parseInt(totalCycles, 10) || 0;

    setLoading(true);
    try {
      const result = await api.createSubscription({
        amount: amountNum,
        frequency,
        payment_method: paymentMethod,
        purpose: purpose || undefined,
        total_cycles: cycles > 0 ? cycles : undefined,
      });
      setSuccess({ id: result.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '建立定期定額失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">定期定額已建立！</h2>
          <p className="text-gray-500 text-sm mb-6">
            您的定期定額捐款方案設定完成，系統將依照設定的頻率自動扣款。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => router.push('/member/subscriptions')}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800"
            >
              返回定期定額列表
            </button>
            <button
              onClick={() => router.push('/member/dashboard')}
              className="px-6 py-2.5 bg-white text-gray-700 border rounded-xl text-sm font-semibold hover:bg-gray-50"
            >
              前往會員儀表板
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/member/subscriptions')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-rose-500" />
            新增定期定額捐款
          </h1>
          <p className="text-sm text-gray-500 mt-1">設定每月、每季或每年的自動捐款</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 捐款金額 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <DollarSign className="w-5 h-5 inline mr-1.5 text-rose-500" />
            捐款金額
          </h2>
          <div className="max-w-xs">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-medium">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="輸入金額"
                min="1"
                step="1"
                required
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">最低捐款金額為 1 元，每次扣款將自動從您的付款方式扣除此金額</p>
          </div>
        </Card>

        {/* 捐款頻率 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <Repeat className="w-5 h-5 inline mr-1.5 text-rose-500" />
            捐款頻率
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFrequency(f.value)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  frequency === f.value
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`text-lg font-bold ${frequency === f.value ? 'text-rose-600' : 'text-gray-900'}`}>{f.label}</div>
                <div className="text-xs text-gray-500 mt-1">{f.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* 付款方式 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <CreditCard className="w-5 h-5 inline mr-1.5 text-rose-500" />
            付款方式
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                type="button"
                onClick={() => setPaymentMethod(pm.value)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMethod === pm.value
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`flex justify-center mb-1 ${paymentMethod === pm.value ? 'text-rose-500' : 'text-gray-400'}`}>
                  {pm.icon}
                </div>
                <div className={`text-sm font-medium ${paymentMethod === pm.value ? 'text-rose-600' : 'text-gray-700'}`}>{pm.label}</div>
              </button>
            ))}
          </div>
          {paymentMethod === 'credit_card' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                信用卡定期定額功能尚在設定中，目前僅建立記錄，實際扣款將於後續啟用後執行。
              </p>
            </div>
          )}
        </Card>

        {/* 用途與期數 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <FileText className="w-5 h-5 inline mr-1.5 text-rose-500" />
            捐款設定
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">捐款用途（選填）</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white"
              >
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 inline mr-1" />
                總期數（選填）
              </label>
              <input
                type="number"
                value={totalCycles}
                onChange={(e) => setTotalCycles(e.target.value)}
                min="0"
                placeholder="0 = 無限期"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">輸入 0 表示無限期捐款，輸入其他數字則於該期數完成後自動結束</p>
            </div>
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-6 bg-rose-50 border-rose-200">
          <h3 className="text-sm font-semibold text-rose-800 mb-2">設定摘要</h3>
          <p className="text-sm text-rose-700">
            將建立<strong> {getFrequencyLabel(frequency)}</strong>{' '}
            捐款 <strong>${amount || '0'}</strong>
            {purpose ? `（${getPurposeLabel(purpose)}）` : ''}，
            使用<strong> {getMethodLabel(paymentMethod)}</strong>
            {parseInt(totalCycles) > 0 ? `，共 ${totalCycles} 期` : '，無限期'}
          </p>
        </Card>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 text-white rounded-xl text-base font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> 建立中...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> 確認建立定期定額</>
          )}
        </button>
      </form>
    </div>
  );
}
