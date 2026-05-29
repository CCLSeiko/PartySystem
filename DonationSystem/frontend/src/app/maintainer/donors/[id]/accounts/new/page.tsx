'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Card } from '@/components/ui';
import {
  ArrowLeft, CreditCard, Landmark, Building2, Calendar, User, DollarSign,
  CheckCircle2, AlertCircle, Loader2, Banknote, Smartphone,
} from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'credit_card', label: '信用卡', icon: <CreditCard className="w-6 h-6" />, description: '定期信用卡扣款' },
  { value: 'postal', label: '郵政劃撥', icon: <Landmark className="w-6 h-6" />, description: '郵局自動轉帳' },
  { value: 'bank_transfer', label: '銀行轉帳', icon: <Building2 className="w-6 h-6" />, description: '銀行自動扣款' },
];

const CARD_TYPES = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'jcb', label: 'JCB' },
];

const EXPIRY_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, '0'),
  label: String(i + 1).padStart(2, '0'),
}));

const CURRENT_YEAR = new Date().getFullYear();
const EXPIRY_YEARS = Array.from({ length: 10 }, (_, i) => ({
  value: String(CURRENT_YEAR + i),
  label: String(CURRENT_YEAR + i),
}));

type AccountType = 'credit_card' | 'postal' | 'bank_transfer';

export default function NewDonorAccountPage() {
  const router = useRouter();
  const params = useParams();
  const donorId = params.id as string;

  const [accountType, setAccountType] = useState<AccountType | null>(null);

  // Common fields
  const [authStartDate, setAuthStartDate] = useState('');
  const [authEndDate, setAuthEndDate] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [donationAmount, setDonationAmount] = useState('');

  // credit_card fields
  const [cardIssuingBank, setCardIssuingBank] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardType, setCardType] = useState('visa');
  const [cardExpiryMonth, setCardExpiryMonth] = useState('');
  const [cardExpiryYear, setCardExpiryYear] = useState('');

  // postal fields
  const [postalAccount, setPostalAccount] = useState('');

  // bank_transfer fields
  const [bankAccount, setBankAccount] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; account_type: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountType) { setError('請選擇帳戶類型'); return; }

    const amountNum = donationAmount ? parseFloat(donationAmount) : undefined;

    setError('');
    setLoading(true);
    try {
      const input: {
        account_type: string;
        auth_start_date?: string;
        auth_end_date?: string;
        authorized_person?: string;
        donation_amount?: number;
        card_issuing_bank?: string;
        card_cvv?: string;
        card_type?: string;
        card_expiry_month?: string;
        card_expiry_year?: string;
        postal_account?: string;
        bank_account?: string;
      } = {
        account_type: accountType,
        auth_start_date: authStartDate || undefined,
        auth_end_date: authEndDate || undefined,
        authorized_person: authorizedPerson.trim() || undefined,
        donation_amount: amountNum,
      };

      if (accountType === 'credit_card') {
        input.card_issuing_bank = cardIssuingBank.trim() || undefined;
        input.card_cvv = cardCvv.trim() || undefined;
        input.card_type = cardType;
        input.card_expiry_month = cardExpiryMonth || undefined;
        input.card_expiry_year = cardExpiryYear || undefined;
      } else if (accountType === 'postal') {
        input.postal_account = postalAccount.trim() || undefined;
      } else if (accountType === 'bank_transfer') {
        input.bank_account = bankAccount.trim() || undefined;
      }

      const account = await api.maintenanceCreateDonorAccount(donorId, input);
      setResult(account);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('新增帳戶失敗，請稍後再試');
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">帳戶已建立</h2>
          <p className="text-gray-500 mb-6">授權扣款帳戶已成功新增</p>

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/maintainer/donors/${donorId}`)}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all"
            >
              返回捐款人資料
            </button>
            <button
              onClick={() => {
                setResult(null);
                setAccountType(null);
                setAuthStartDate('');
                setAuthEndDate('');
                setAuthorizedPerson('');
                setDonationAmount('');
                setCardIssuingBank('');
                setCardCvv('');
                setCardType('visa');
                setCardExpiryMonth('');
                setCardExpiryYear('');
                setPostalAccount('');
                setBankAccount('');
              }}
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
            >
              新增另一個帳戶
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push(`/maintainer/donors/${donorId}`)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回捐款人資料
        </button>
        <h1 className="text-2xl font-bold text-gray-900">新增授權帳戶</h1>
        <p className="text-gray-500 text-sm mt-1">建立捐款人的授權扣款帳戶</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl border bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Type Selection */}
          {!accountType ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">選擇帳戶類型</label>
              <div className="grid grid-cols-3 gap-3">
                {ACCOUNT_TYPES.map((at) => (
                  <button
                    key={at.value}
                    type="button"
                    onClick={() => setAccountType(at.value as AccountType)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
                  >
                    <div className="text-emerald-600">{at.icon}</div>
                    <span className="font-medium text-sm text-gray-800">{at.label}</span>
                    <span className="text-xs text-gray-400 text-center">{at.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Selected Type Indicator */}
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  {ACCOUNT_TYPES.find(at => at.value === accountType)?.icon}
                  <span className="font-medium text-emerald-800">
                    {ACCOUNT_TYPES.find(at => at.value === accountType)?.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountType(null)}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  變更
                </button>
              </div>

              {/* Common Fields */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">基本設定</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      授權開始日期
                    </label>
                    <input
                      type="date"
                      value={authStartDate}
                      onChange={(e) => setAuthStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      授權結束日期
                    </label>
                    <input
                      type="date"
                      value={authEndDate}
                      onChange={(e) => setAuthEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <User className="w-4 h-4 inline mr-1" />
                      授權人
                    </label>
                    <input
                      type="text"
                      value={authorizedPerson}
                      onChange={(e) => setAuthorizedPerson(e.target.value)}
                      placeholder="授權人姓名"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      捐款金額
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Credit Card Fields */}
              {accountType === 'credit_card' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">信用卡資料</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">發卡銀行</label>
                    <input
                      type="text"
                      value={cardIssuingBank}
                      onChange={(e) => setCardIssuingBank(e.target.value)}
                      placeholder="例如：國泰世華"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">信用卡類型</label>
                      <select
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      >
                        {CARD_TYPES.map((ct) => (
                          <option key={ct.value} value={ct.value}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">卡片末三碼 (CVV)</label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        maxLength={4}
                        placeholder="123"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">到期月 (MM)</label>
                      <select
                        value={cardExpiryMonth}
                        onChange={(e) => setCardExpiryMonth(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      >
                        <option value="">選擇月份</option>
                        {EXPIRY_MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">到期年 (YYYY)</label>
                      <select
                        value={cardExpiryYear}
                        onChange={(e) => setCardExpiryYear(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      >
                        <option value="">選擇年份</option>
                        {EXPIRY_YEARS.map((y) => (
                          <option key={y.value} value={y.value}>{y.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Postal Fields */}
              {accountType === 'postal' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">郵政劃撥資料</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">郵政劃撥帳號</label>
                    <input
                      type="text"
                      value={postalAccount}
                      onChange={(e) => setPostalAccount(e.target.value)}
                      placeholder="例如：12345678"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Bank Transfer Fields */}
              {accountType === 'bank_transfer' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-2">銀行轉帳資料</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">銀行帳戶</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="銀行代碼 + 帳號"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />建立中...</>
                ) : (
                  '建立帳戶'
                )}
              </button>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}
