'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui';
import { Heart, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired');
  const registered = searchParams.get('registered');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirected, setRedirected] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && !redirected) {
      setRedirected(true);
      router.push(user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
    }
  }, [user, authLoading, router, redirected]);

  // Redirect after login success (when user becomes non-null)
  useEffect(() => {
    if (!authLoading && user && !redirected && !loading) {
      // This handles the case where login already succeeded
    }
  }, [user, authLoading, redirected, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('請輸入 Email');
      return;
    }
    if (!password) {
      setError('請輸入密碼');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Auth context will update user, and the useEffect above will redirect
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '登入失敗，請稍後再試';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-rose-600 fill-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">登入捐款系統</h1>
          <p className="text-gray-500 mt-1">歡迎回來，繼續您的愛心之旅</p>
        </div>

        {/* Alert Messages */}
        {expired === '1' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 text-sm text-yellow-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>您的登入階段已過期，請重新登入</span>
          </div>
        )}
        {registered === '1' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>註冊成功，請登入您的帳號</span>
          </div>
        )}

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                密碼
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm shadow-rose-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登入中...
                </>
              ) : (
                '登入'
              )}
            </button>
          </form>
        </Card>

        {/* Register link */}
        <p className="text-center mt-6 text-sm text-gray-500">
          還沒有帳號？{' '}
          <Link href="/register" className="text-rose-600 hover:text-rose-700 font-medium hover:underline">
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-rose-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
