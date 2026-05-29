'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Card } from '@/components/ui';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  DollarSign,
  Repeat,
  CreditCard,
  Landmark,
  Banknote,
  FileText,
  Search,
} from 'lucide-react';

const FREQUENCIES = [
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季' },
  { value: 'yearly', label: '每年' },
];

const PAYMENT_METHODS = [
  { value: 'credit_card', label: '信用卡', icon: <CreditCard className="w-5 h-5" /> },
  { value: 'postal', label: '郵政劃撥', icon: <Landmark className="w-5 h-5" /> },
  { value: 'cash', label: '現金', icon: <Banknote className="w-5 h-5" /> },
];

const PURPOSES = [
  { value: 'general', label: '一般捐款' },
  { value: 'emergency_relief', label: '急難救助' },
  { value: 'education', label: '教育贊助' },
  { value: 'medical', label: '醫療援助' },
  { value: 'other', label: '其他' },
];

interface DonorOption {
  id: string;
  name: string;
  email: string;
}

export default function NewSubscriptionPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  const [donorSearch, setDonorSearch] = useState('');
  const [donorResults, setDonorResults] = useState<DonorOption[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<DonorOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [purpose, setPurpose] = useState('general');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; amount: number; frequency: string; donor_name?: string } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!donorSearch.trim() || selectedDonor) {
      setDonorResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (donorSearch.trim().length < 2) return;
      setSearching(true);
      try {
        const results = await api.maintenanceSearchDonors(donorSearch.trim());
        setDonorResults(results || []);
        setShowDropdown(true);
      } catch {
        setDonorResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [donorSearch, selectedDonor]);

  function selectDonor(donor: DonorOption) {
    setSelectedDonor(donor);
    setDonorSearch(donor.name);
    setShowDropdown(false);
  }

  function clearDonor() {
    setSelectedDonor(null);
    setDonorSearch('');
    setDonorResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDonor) { setError('請選擇捐款人'); return; }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) { setError('請填寫有效金額'); return; }

    setError('');
    setLoading(true);
    try {
      const subscription = await api.maintenanceCreateSubscription({
        donor_id: selectedDonor.id,
        amount: amountNum,
        frequency,
        payment_method: paymentMethod,
        purpose,
      });
      setResult({ ...subscription, donor_name: selectedDonor.name });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('新增定期定額失敗，請稍後再試');
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">定期定額已建立</h2>
          <p className="text-gray-500 mb-6">定期捐款已成功設定</p>

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
              <span className="text-gray-500">頻率</span>
              <span className="font-medium">{FREQUENCIES.find(f => f.value === result.frequency)?.label || result.frequency}</span>
            </div>
          </Card>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/maintainer/subscriptions')}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all"
            >
              返回定期定額列表
            </button>
            <button
              onClick={() => {
                setResult(null);
                clearDonor();
                setAmount('');
                setFrequency('monthly');
                setPaymentMethod('credit_card');
                setPurpose('general');
              }}
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
            >
              新增另一筆
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push('/maintainer/subscriptions')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回定期定額列表
        </button>
        <h1 className="text-2xl font-bold text-gray-900">新增定期定額</h1>
        <p className="text-gray-500 text-sm mt-1">為捐款人設定定期捐款</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Donor Search */}
          <div ref={searchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4 inline mr-1" />
              捐款人 <span className="text-red-400">*</span>
            </label>
            {selectedDonor ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div>
                  <p className="font-medium text-emerald-800 text-sm">{selectedDonor.name}</p>
                  <p className="text-xs text-emerald-600">{selectedDonor.email}</p>
                </div>
                <button
                  type="button"
                  onClick={clearDonor}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  變更
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={donorSearch}
                  onChange={(e) => setDonorSearch(e.target.value)}
                  onFocus={() => donorResults.length > 0 && setShowDropdown(true)}
                  placeholder="搜尋捐款人姓名或 Email..."
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
                {showDropdown && donorResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {donorResults.map((donor) => (
                      <button
                        key={donor.id}
                        type="button"
                        onClick={() => selectDonor(donor)}
                        className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-800">{donor.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{donor.email}</span>
                        </div>
                        <span className="text-xs text-gray-400">ID: {donor.id.slice(0, 8)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Repeat className="w-4 h-4 inline mr-1" />
              捐款頻率
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    frequency === f.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />建立中...</>
            ) : (
              '建立定期定額'
            )}
          </button>
        </form>
      </Card>
    </div>
  );
}
