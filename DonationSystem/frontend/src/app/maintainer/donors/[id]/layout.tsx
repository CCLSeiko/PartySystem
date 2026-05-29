export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function DonorDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
