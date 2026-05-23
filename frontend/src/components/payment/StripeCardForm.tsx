// ============================================================
// StripeCardForm — Real credit card input via Stripe Elements
// ============================================================
'use client';

import { useState } from 'react';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { StripeCardNumberElementChangeEvent } from '@stripe/stripe-js';
import { CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      fontFamily: '"Inter", system-ui, sans-serif',
      '::placeholder': {
        color: '#9ca3af',
      },
      ':-webkit-autofill': {
        color: '#1f2937',
      },
    },
    invalid: {
      color: '#e11d48',
      iconColor: '#e11d48',
    },
  },
};

interface StripeCardFormProps {
  clientSecret: string;
  amount: number;
  donationId: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function StripeCardForm({
  clientSecret,
  amount,
  donationId,
  onSuccess,
  onBack,
}: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleCardChange = (event: StripeCardNumberElementChangeEvent) => {
    setCardComplete(event.complete);
    setCardError(event.error ? event.error.message : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe 尚未載入完成，請稍後再試');
      return;
    }

    if (!cardComplete) {
      setError('請填寫完整的信用卡資訊');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        setError('信用卡元件錯誤，請重新整理頁面');
        setLoading(false);
        return;
      }

      const { error: confirmError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name: '捐款人',
            },
          },
        });

      if (confirmError) {
        setError(confirmError.message || '付款失敗，請重試');
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        onSuccess();
      } else if (paymentIntent?.status === 'requires_action') {
        // 3D Secure — Stripe handles the redirect automatically
        // After redirect, confirmCardPayment resolves again with new status
        setError('付款需要額外驗證，請按照銀行指示完成驗證');
      } else {
        setError(`付款狀態異常: ${paymentIntent?.status || 'unknown'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '付款處理時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Payment summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">捐款金額</span>
          <span className="text-xl font-bold text-gray-900">
            ${amount.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-500">捐款編號</span>
          <span className="text-xs font-mono text-gray-500">
            {donationId.substring(0, 12)}...
          </span>
        </div>
      </div>

      {/* Card form */}
      <div className="space-y-4">
        {/* Card Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            卡號
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-rose-500 focus-within:border-rose-500 transition-all">
              <CardNumberElement
                options={CARD_ELEMENT_OPTIONS}
                onChange={handleCardChange}
              />
            </div>
          </div>
        </div>

        {/* Expiry + CVC */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              有效月年
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-rose-500 focus-within:border-rose-500 transition-all">
              <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              CVC
            </label>
            <div className="w-full px-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-rose-500 focus-within:border-rose-500 transition-all">
              <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            您的卡片資訊經 Stripe 加密傳輸，我們不會儲存任何卡號資料。
          </p>
        </div>

        {/* Inline error */}
        {(error || cardError) && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error || cardError}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-8">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          返回修改
        </button>
        <button
          type="submit"
          disabled={!stripe || !cardComplete || loading}
          className="flex-1 bg-rose-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              付款處理中...
            </>
          ) : (
            '確認付款'
          )}
        </button>
      </div>
    </form>
  );
}
