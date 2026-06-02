// ============================================================
// DonationSystem — StripePaymentWrapper
// Handles missing/pending Stripe config gracefully
// ============================================================
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { ReactNode, useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

const isPlaceholder = !stripePublishableKey ||
  stripePublishableKey === 'pk_test_placeholder';

interface StripePaymentWrapperProps {
  clientSecret: string;
  children: ReactNode;
}

export default function StripePaymentWrapper({
  clientSecret,
  children,
}: StripePaymentWrapperProps) {
  const [stripe, setStripe] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlaceholder) {
      setError('Stripe 金鑰尚未設定，請聯絡系統管理員設定 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      return;
    }
    try {
      setStripe(loadStripe(stripePublishableKey));
    } catch (e) {
      setError('Stripe 初始化失敗: ' + (e instanceof Error ? e.message : '未知錯誤'));
    }
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <div className="flex items-start gap-2 text-sm text-yellow-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">付款功能暫不可用</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stripe) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-3" />
        <p className="text-sm text-gray-500">正在初始化付款...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      {children}
    </Elements>
  );
}
