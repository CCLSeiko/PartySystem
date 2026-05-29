'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Card } from '@/components/ui';
import { getPurposeLabel, getMethodLabel } from '@/lib/utils';
import {
  CreditCard,
  Landmark,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Mail,
  DollarSign,
  FileText,
} from 'lucide-react';

const PURPOSES = [
  { value: 'general', label: '一般捐款' },
  { value: 'emergency_relief', label: '急難救助' },
  { value: 'education', label: '教育贊助' },
  { value: 'medical', label: '醫療援助' },
  { value: 'other', label: '其他' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: '現金', icon: <Banknote className="w-5 h-5" /> },
  { value: 'postal', label: '郵政劃撥', icon: <Landmark className="w-5 h-5" /> },
  { value: 'credit_card', label: '信用卡', icon: <CreditCard className="w-5 h-5" /> },
];

const STATUS_OPTIONS = [
  { value: 'success', label: '成功' },
  { value: 'pending', label: '待處理' },
  { value: 'failed', label: '失敗' },
];

export default function NewDonationPage() {
  const router = useRouter();

  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('general');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [status, setStatus] = useState('success');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    amount: number;
    receipt_number: string;
    donor_name: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!donorName.trim()) {
      setError('請填寫捐款人姓名');
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('請填寫有效金額');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const donation = await api.maintenanceCreateDonation({
        donor_name: donorName.trim(),
        donor_email: donorEmail.trim() || undefined,
        amount: amountNum,
        purpose,
        payment_method: paymentMethod,
        status,
      });
      setResult(donation);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('登錄捐款失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">捐款已登錄</h2>
          <p className="text-gray-500 mb-6">捐款紀錄已成功建立</p>

          <Card className="p-4 text-left space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">捐款人</span>
              <span className="font-medium">{result.donor_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">金額</span>
              <span className="font-bold text-emerald-600">${result.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">收據編號</span>
              <span className="font-mono text-sm">{result.receipt_number}</span>
            </div>
          </Card>

          <div className="space-y-3">
            <button
              onClick={() => {
                setResult(null);
                setDonorName('');
                setDonorEmail('');
                setAmount('');
                setPurpose('general');
                setPaymentMethod('cash');
                setStatus('success');
              }}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all"
            >
              登錄下一筆
            </button>
            <button
              onClick={() => router.push('/maintainer/donations')}
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
            >
              返回捐款列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">手動登錄捐款</h1>
        <p className="text-gray-500 text-sm mt-1">登錄線下收款（現金、郵政劃撥）捐款紀錄</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Donor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4 inline mr-1" />
              捐款人姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="請輸入捐款人姓名"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Donor Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Mail className="w-4 h-4 inline mr-1" />
              Email（選填，用於配對會員）
            </label>
            <input
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="donor@example.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <DollarSign className="w-4 h-4 inline mr-1" />
              金額 <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <FileText className="w-4 h-4 inline mr-1" />
              捐款用途
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">付款方式</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm transition-all ${
                    paymentMethod === pm.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200'
                  }`}
                >
                  {pm.icon}
                  <span>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">捐款狀態</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                登錄中...
              </>
            ) : (
              '登錄捐款'
            )}
          </button>
        </form>
      </Card>
    </div>
  );
}
