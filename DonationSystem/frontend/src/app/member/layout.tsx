'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MemberSidebar } from '@/components/layout/Sidebar';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-64 flex-shrink-0 hidden lg:block">
        <MemberSidebar />
      </aside>
      <div className="flex-1 bg-gray-50 p-6 lg:p-8 overflow-auto">
        {children}
      </div>
    </div>
  );
}
