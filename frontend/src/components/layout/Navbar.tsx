'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import { Heart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname.startsWith('/member') || pathname.startsWith('/admin')) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-rose-600">
            <Heart className="w-6 h-6 fill-rose-600" />
            <span>捐款系統</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/donate" className="text-gray-600 hover:text-rose-600 transition-colors">
              立即捐款
            </Link>
            {user ? (
              <>
                <Link href="/member/dashboard" className="text-gray-600 hover:text-rose-600 transition-colors">
                  會員中心
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/dashboard" className="text-gray-600 hover:text-amber-600 transition-colors">
                    管理後台
                  </Link>
                )}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                  <Link href="/member/profile" className="text-sm text-gray-500 hover:text-gray-700">
                    {user.name}
                  </Link>
                  <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                    登出
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <Link href="/login" className="text-gray-600 hover:text-rose-600 transition-colors">
                  登入
                </Link>
                <Link
                  href="/register"
                  className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-rose-700 transition-colors"
                >
                  註冊
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 pt-4 space-y-3">
            <Link href="/donate" className="block text-gray-600" onClick={() => setMenuOpen(false)}>
              立即捐款
            </Link>
            {user ? (
              <>
                <Link href="/member/dashboard" className="block text-gray-600" onClick={() => setMenuOpen(false)}>
                  會員中心
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/dashboard" className="block text-amber-600" onClick={() => setMenuOpen(false)}>
                    管理後台
                  </Link>
                )}
                <hr className="my-2" />
                <span className="text-sm text-gray-500 block">{user.name}</span>
                <button onClick={logout} className="text-sm text-red-500">
                  登出
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-gray-600" onClick={() => setMenuOpen(false)}>
                  登入
                </Link>
                <Link href="/register" className="block text-rose-600 font-medium" onClick={() => setMenuOpen(false)}>
                  註冊
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
