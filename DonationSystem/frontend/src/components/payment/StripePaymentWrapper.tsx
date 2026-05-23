// ============================================================
// StripePaymentWrapper — Loads Stripe and wraps Elements provider
// ============================================================
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { ReactNode } from 'react';

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
}

interface StripePaymentWrapperProps {
  clientSecret: string;
  children: ReactNode;
}

export default function StripePaymentWrapper({
  clientSecret,
  children,
}: StripePaymentWrapperProps) {
  const stripe = getStripe();
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#e11d48',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      fontFamily: '"Inter", system-ui, sans-serif',
    },
  };

  return (
    <Elements stripe={stripe} options={{ clientSecret, appearance }}>
      {children}
    </Elements>
  );
}
