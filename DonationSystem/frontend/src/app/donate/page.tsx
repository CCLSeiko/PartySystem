'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { Card } from '@/components/ui';
import { getPurposeLabel, getMethodLabel, getFrequencyLabel } from '@/lib/utils';
import type { PaymentMethod, DonationPurpose } from '@/types';
import StripeCardForm from '@/components/payment/StripeCardForm';
import StripePaymentWrapper from '@/components/payment/StripePaymentWrapper';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Check,
  CreditCard,
  Landmark,
  Banknote,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building,
  Printer,
  Download,
  Repeat,
} from 'lucide-react';

// --- Constants ---
const QUICK_AMOUNTS = [100, 300, 500, 1000, 3000];

const FREQUENCIES = [
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季' },
  { value: 'yearly', label: '每年' },
] as const;

const PURPOSES: { value: DonationPurpose; icon: string; desc: string }[] = [
  { value: 'general', icon: '❤️', desc: '不指定用途，由本會統籌運用' },
  { value: 'emergency_relief', icon: '🚨', desc: '支援天然災害、重大事故等緊急救助' },
  { value: 'education', icon: '📚', desc: '贊助弱勢學童教育經費' },
  { value: 'medical', icon: '🏥', desc: '協助醫療資源匱乏地區' },
  { value: 'other', icon: '📝', desc: '其他指定用途' },
];

const PAYMENT_METHODS: { value: PaymentMethod; icon: React.ReactNode; desc: string }[] = [
  { value: 'credit_card', icon: <CreditCard className="w-5 h-5" />, desc: '線上信用卡付款' },
  { value: 'postal', icon: <Landmark className="w-5 h-5" />, desc: '下載郵政劃撥單' },
  { value: 'cash', icon: <Banknote className="w-5 h-5" />, desc: '現金捐款登記' },
];

type DonationMode = 'once' | 'monthly';

// --- Step Indicator ---
function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="mb-10">
      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((current) / (total - 1)) * 100}%` }}
          />
        </div>
      </div>
      {/* Step labels */}
      <div className="flex justify-between">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < current
                  ? 'bg-rose-500 text-white'
                  : i === current
                  ? 'bg-rose-100 text-rose-600 border-2 border-rose-500'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs mt-1.5 hidden sm:block ${
                i <= current ? 'text-gray-700 font-medium' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DonatePage() {
  const { user } = useAuth();
  const router = useRouter();

  // --- Mode ---
  const [mode, setMode] = useState<DonationMode>('once');

  // --- State ---
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState<number | ''>('');
  const [customAmount, setCustomAmount] = useState('');
  const [frequency, setFrequency] = useState<string>('monthly');
  const [purpose, setPurpose] = useState<DonationPurpose | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Result states
  const [result, setResult] = useState<{
    type: 'once' | 'subscription';
    donationId?: string;
    subscriptionId?: string;
    amount: number;
    frequency?: string;
    clientSecret?: string;
    postalAccount?: string;
    draftNumber?: string;
  } | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  const isLoggedIn = !!user;
  const isSubscription = mode === 'monthly';
  const totalSteps = isSubscription ? (isLoggedIn ? 3 : 4) : (isLoggedIn ? 3 : 4);
  const stepLabels = isSubscription
    ? isLoggedIn
      ? ['金額/頻率', '用途', '付款']
      : ['金額/頻率', '用途', '付款', '資料']
    : isLoggedIn
    ? ['金額', '用途', '付款']
    : ['金額', '用途', '付款', '資料'];

  // --- Validation ---
  const canProceedFromStep = (s: number): boolean => {
    switch (s) {
      case 0:
        if (!isSubscription) return amount !== '' && (amount as number) > 0;
        // Subscription: need amount AND frequency
        return amount !== '' && (amount as number) > 0 && frequency !== '';
      case 1:
        return purpose !== '';
      case 2:
        return paymentMethod !== '';
      case 3:
        return guestName.trim().length > 0 && guestEmail.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail);
      default:
        return true;
    }
  };

  const handleNext = () => {
    setError('');
    if (!canProceedFromStep(step)) {
      if (step === 0) setError(isSubscription ? '請選擇捐款金額和頻率' : '請選擇捐款金額');
      else if (step === 1) setError('請選擇捐款用途');
      else if (step === 2) setError('請選擇付款方式');
      else if (step === 3) setError('請填寫捐款人資料');
      return;
    }
    setStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handlePrev = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmount = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setCustomAmount(cleaned);
    if (cleaned) {
      setAmount(parseInt(cleaned, 10));
    } else {
      setAmount('');
    }
  };

  const switchMode = (newMode: DonationMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setStep(0);
    setError('');
    setFrequency('monthly');
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!amount || !purpose || !paymentMethod) return;
    setError('');
    setLoading(true);

    try {
      if (isSubscription) {
        // ── Create subscription (recurring donation) ──
        const sub = await api.createSubscription({
          amount: amount as number,
          frequency,
          payment_method: paymentMethod,
          purpose,
          guest_email: isLoggedIn ? undefined : guestEmail.trim() || undefined,
          guest_name: isLoggedIn ? undefined : guestName.trim() || undefined,
        });
        setResult({
          type: 'subscription',
          subscriptionId: sub.id,
          amount: amount as number,
          frequency,
        });
      } else {
        // ── One-time donation (existing flow) ──
        const donation = await api.createDonation({
          amount: amount as number,
          purpose,
          payment_method: paymentMethod,
          guest_email: isLoggedIn ? undefined : guestEmail.trim() || undefined,
          guest_name: isLoggedIn ? undefined : guestName.trim() || undefined,
        });

        if (paymentMethod === 'credit_card') {
          const paymentIntent = await api.createCreditCardPayment({
            donation_id: donation.id,
            amount: amount as number,
          } as import('@/types').CreditCardPayment);
          setResult({
            type: 'once',
            donationId: donation.id,
            amount: amount as number,
            clientSecret: paymentIntent.client_secret,
          });
        } else if (paymentMethod === 'postal') {
          const postalDraft = await api.createPostalDraft({
            donation_id: donation.id,
            amount: amount as number,
          });
          setResult({
            type: 'once',
            donationId: donation.id,
            amount: amount as number,
            postalAccount: postalDraft.postal_account,
            draftNumber: postalDraft.draft_number,
          });
        } else {
          setResult({
            type: 'once',
            donationId: donation.id,
            amount: amount as number,
          });
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(isSubscription ? '設定定期定額失敗，請稍後再試' : '送出捐款失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Render Step Content ---
  const renderStep = () => {
    switch (step) {
      // Step 1: Amount (and frequency for subscription mode)
      case 0:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isSubscription ? '選擇捐款金額與頻率' : '選擇捐款金額'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {isSubscription ? '設定您每期想要捐贈的金額與頻率' : '選擇您想要捐贈的金額'}
            </p>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-5 gap-3 mb-4">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  onClick={() => handleQuickAmount(val)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    amount === val && !customAmount
                      ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  ${val.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">自訂金額</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customAmount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                  placeholder="輸入其他金額"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Frequency (subscription mode only) */}
            {isSubscription && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Repeat className="w-4 h-4 inline mr-1" />
                  捐款頻率
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFrequency(f.value)}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        frequency === f.value
                          ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-rose-200 hover:bg-rose-50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected display */}
            {amount !== '' && (amount as number) > 0 && (
              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-sm text-rose-600">
                  {isSubscription ? `每${frequency === 'monthly' ? '月' : frequency === 'quarterly' ? '季' : '年'}捐款金額` : '捐款金額'}
                </span>
                <p className="text-2xl font-bold text-rose-700 mt-1">${(amount as number).toLocaleString()}</p>
              </div>
            )}
          </div>
        );

      // Step 2: Purpose
      case 1:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">選擇捐款用途</h2>
            <p className="text-gray-500 text-sm mb-6">選擇您希望捐款用於哪個項目</p>

            <div className="space-y-3">
              {PURPOSES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPurpose(p.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                    purpose === p.value
                      ? 'border-rose-500 bg-rose-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <span className="text-xl mt-0.5">{p.icon}</span>
                  <div className="flex-1">
                    <span className="block font-semibold text-gray-900">{getPurposeLabel(p.value)}</span>
                    <span className="block text-sm text-gray-500 mt-0.5">{p.desc}</span>
                  </div>
                  {purpose === p.value && (
                    <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center mt-1">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      // Step 3: Payment Method
      case 2:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">選擇付款方式</h2>
            <p className="text-gray-500 text-sm mb-6">選擇您偏好的付款方式</p>

            <div className="space-y-3">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                    paymentMethod === pm.value
                      ? 'border-rose-500 bg-rose-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      paymentMethod === pm.value ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {pm.icon}
                  </div>
                  <div className="flex-1">
                    <span className="block font-semibold text-gray-900">{getMethodLabel(pm.value)}</span>
                    <span className="block text-sm text-gray-500">{pm.desc}</span>
                  </div>
                  {paymentMethod === pm.value && (
                    <span className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Subscription note */}
            {isSubscription && paymentMethod === 'credit_card' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  信用卡定期定額功能尚在設定中，建議先選擇郵政劃撥或現金方式。
                </p>
              </div>
            )}
          </div>
        );

      // Step 4: Guest Info (only when not logged in)
      case 3:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">捐款人資料</h2>
            <p className="text-gray-500 text-sm mb-6">請填寫您的聯絡資訊，以便我們寄送收據</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  姓名 <span className="text-red-400">*</span>
                </label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="您的姓名"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">金額</span>
                <span className="font-semibold text-gray-900">${(amount as number).toLocaleString()}</span>
              </div>
              {isSubscription && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">頻率</span>
                  <span className="font-semibold text-gray-900">{getFrequencyLabel(frequency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">用途</span>
                <span className="font-semibold text-gray-900">{getPurposeLabel(purpose as string)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">付款方式</span>
                <span className="font-semibold text-gray-900">{getMethodLabel(paymentMethod as string)}</span>
              </div>
            </div>
          </div>
        );
    }
  };

  // --- Render Result ---
  const renderResult = () => {
    if (!result) return null;

    // Subscription success
    if (result.type === 'subscription') {
      return (
        <div className="max-w-md mx-auto">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">定期定額設定成功</h2>
            <p className="text-gray-500 mb-6">感謝您的定期支持！您的愛心將持續幫助需要的人。</p>

            <Card className="p-4 text-left space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">每期金額</span>
                <span className="font-bold text-emerald-600">${result.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">捐款頻率</span>
                <span className="font-medium">{getFrequencyLabel(result.frequency || 'monthly')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">訂閱編號</span>
                <span className="font-mono text-xs text-gray-500">{result.subscriptionId?.substring(0, 8)}...</span>
              </div>
            </Card>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-rose-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all"
              >
                返回首頁
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setStep(0);
                  setAmount('');
                  setCustomAmount('');
                  setPurpose('');
                  setPaymentMethod('');
                  setGuestName('');
                  setGuestEmail('');
                  setPaymentDone(false);
                }}
                className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
              >
                再設定一筆
              </button>
            </div>
          </div>
        </div>
      );
    }

    // One-time donation result (existing flow)
    switch (result.type) {
      case 'once':
        if (paymentMethod === 'credit_card') {
          return (
            <div className="max-w-md mx-auto">
              {!paymentDone ? (
                <>
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-2xl mb-4">
                      <CreditCard className="w-8 h-8 text-rose-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">信用卡付款</h2>
                    <p className="text-gray-500 mt-1">請輸入信用卡資訊完成捐款</p>
                  </div>

                  <Card className="p-6 mb-6">
                    {result.clientSecret ? (
                      <StripePaymentWrapper clientSecret={result.clientSecret}>
                        <StripeCardForm
                          clientSecret={result.clientSecret}
                          amount={result.amount}
                          donationId={result.donationId || ''}
                          onSuccess={() => setPaymentDone(true)}
                          onBack={() => setResult(null)}
                        />
                      </StripePaymentWrapper>
                    ) : (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">正在初始化付款...</p>
                      </div>
                    )}
                  </Card>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">捐款成功</h2>
                  <p className="text-gray-500 mb-6">感謝您的捐款！您的愛心將被妥善運用。</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push('/')}
                      className="w-full bg-rose-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all"
                    >
                      返回首頁
                    </button>
                    <button
                      onClick={() => router.push('/donate')}
                      className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
                    >
                      再次捐款
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        }

        if (paymentMethod === 'postal') {
          return (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-2xl mb-4">
                  <Landmark className="w-8 h-8 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">郵政劃撥捐款</h2>
                <p className="text-gray-500 mt-1">請前往郵局劃撥繳款</p>
              </div>

              <Card className="p-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-200">
                    <span className="text-sm text-gray-600">劃撥帳號</span>
                    <span className="text-lg font-bold text-rose-700 tracking-wider">{result.postalAccount || '12345678'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">捐款金額</span>
                    <span className="text-lg font-bold text-gray-900">${result.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">劃撥單編號</span>
                    <span className="text-sm font-mono text-gray-700">{result.draftNumber}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">捐款編號</span>
                    <span className="text-sm font-mono text-gray-700">{result.donationId?.substring(0, 8)}...</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-2 text-sm text-yellow-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">請注意：</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>請於劃撥單備註欄填寫捐款編號</li>
                        <li>劃撥後約 3-5 個工作天入帳</li>
                        <li>如需下載劃撥單，請點擊下方按鈕</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-3">
                <a
                  href={result.draftNumber ? `/api/payments/postal/${result.draftNumber}/download` : '#'}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all"
                >
                  <Download className="w-4 h-4" />
                  下載劃撥單
                </a>
                <button
                  onClick={() => router.push('/')}
                  className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
                >
                  返回首頁
                </button>
              </div>
            </div>
          );
        }

        // Cash
        return (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-2xl mb-4">
                <Banknote className="w-8 h-8 text-rose-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">現金捐款登記</h2>
              <p className="text-gray-500 mt-1">請至本會辦公室辦理現金捐款</p>
            </div>

            <Card className="p-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">捐款金額</span>
                  <span className="text-lg font-bold text-gray-900">${result.amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">捐款編號</span>
                  <span className="text-sm font-mono text-gray-700">{result.donationId?.substring(0, 8)}...</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600">狀態</span>
                  <span className="text-sm font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">待繳款</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start gap-2 text-sm text-yellow-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">捐款流程：</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>請攜帶此編號至本會辦公室</li>
                      <li>由本會人員協助完成捐款登記</li>
                      <li>完成後將開立正式收據</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-rose-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all"
              >
                返回首頁
              </button>
            </div>
          </div>
        );
    }
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700 text-white">
        <div className="max-w-lg mx-auto px-4 pt-16 pb-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
            <Heart className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold mb-2">愛心捐款</h1>
          <p className="text-rose-100 text-sm">每一份愛心，都是改變的力量</p>
        </div>
      </div>

      {/* Form Area */}
      <div className="max-w-lg mx-auto px-4 -mt-6 pb-20">
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-6 sm:p-8">
          {!result ? (
            <>
              {/* Mode Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button
                  onClick={() => switchMode('once')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === 'once'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Heart className="w-4 h-4 inline mr-1.5" />
                  單次捐款
                </button>
                <button
                  onClick={() => switchMode('monthly')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === 'monthly'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Repeat className="w-4 h-4 inline mr-1.5" />
                  每月捐款
                </button>
              </div>

              {/* Steps */}
              <StepIndicator current={step} total={totalSteps} labels={stepLabels} />

              {/* Step content */}
              {renderStep()}

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3 mt-8">
                {step > 0 ? (
                  <button
                    onClick={handlePrev}
                    className="flex items-center justify-center gap-1.5 px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一步
                  </button>
                ) : (
                  <div />
                )}

                {step < totalSteps - 1 ? (
                  <button
                    onClick={handleNext}
                    disabled={!canProceedFromStep(step)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    下一步
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !canProceedFromStep(step)}
                    className="flex-1 bg-rose-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        送出中...
                      </>
                    ) : isSubscription ? (
                      <>
                        <Repeat className="w-4 h-4" />
                        設定定期捐款
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        立即捐款
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Result screen */
            renderResult()
          )}
        </div>
      </div>
    </div>
  );
}
