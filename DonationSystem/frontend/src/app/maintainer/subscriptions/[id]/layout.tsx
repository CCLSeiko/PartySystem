export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function SubscriptionDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
