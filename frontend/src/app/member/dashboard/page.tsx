'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { StatsCard, Card, StatusBadge, DataTable, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate, getPurposeLabel, getMethodLabel } from '@/lib/utils';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HeartHandshake,
  TrendingUp,
  CalendarDays,
  Receipt,
  ArrowRight,
  CreditCard,
  Repeat,
  LayoutDashboard,
} from 'lucide-react';
import type { Donation, Subscription } from '@/types';

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [donRes, subRes] = await Promise.all([
          api.getDonations({ per_page: 50 }),
          api.getSubscriptions({ per_page: 50 }),
        ]);
        setDonations(donRes.data);
        setSubscriptions(subRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const todayDonations = donations.filter((d) => d.created_at.startsWith(today) && d.status === 'success');
  const thisMonthDonations = donations.filter((d) => d.created_at.startsWith(thisMonth) && d.status === 'success');
  const totalSuccess = donations.filter((d) => d.status === 'success');

  const todayAmount = todayDonations.reduce((sum, d) => sum + d.amount, 0);
  const monthAmount = thisMonthDonations.reduce((sum, d) => sum + d.amount, 0);
  const totalAmount = totalSuccess.reduce((sum, d) => sum + d.amount, 0);

  const recentDonations = [...donations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active' || s.status === 'paused');

  const donationColumns = [
    {
      key: 'created_at',
      header: '日期',
      render: (d: Donation) => formatDate(d.created_at),
    },
    {
      key: 'amount',
      header: '金額',
      render: (d: Donation) => formatCurrency(d.amount, d.currency),
    },
    {
      key: 'purpose',
      header: '用途',
      render: (d: Donation) => getPurposeLabel(d.purpose),
    },
    {
      key: 'status',
      header: '狀態',
      render: (d: Donation) => <StatusBadge status={d.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-rose-500" />
            會員儀表板
          </h1>
          <p className="text-gray-500 mt-1">
            歡迎回來，{user?.name || '會員'}
          </p>
        </div>
        <Link
          href="/donate"
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors"
        >
          <HeartHandshake className="w-4 h-4" />
          立即捐款
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="今日捐款"
          value={formatCurrency(todayAmount)}
          icon={<CalendarDays className="w-5 h-5" />}
          subtitle={`${todayDonations.length} 筆捐款`}
        />
        <StatsCard
          title="本月捐款"
          value={formatCurrency(monthAmount)}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={`${thisMonthDonations.length} 筆捐款`}
        />
        <StatsCard
          title="累計捐款總額"
          value={formatCurrency(totalAmount)}
          icon={<HeartHandshake className="w-5 h-5" />}
          subtitle={`${totalSuccess.length} 筆成功捐款`}
        />
      </div>

      {/* Recent Donations + Active Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Donations */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" />
              最近的捐款
            </h2>
            <Link
              href="/member/donations"
              className="text-sm text-rose-500 hover:text-rose-600 flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentDonations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentDonations.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(d.amount, d.currency)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getPurposeLabel(d.purpose)} · {formatDate(d.created_at)}
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">尚無捐款記錄</div>
          )}
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-gray-400" />
              定期定額
            </h2>
            <Link
              href="/member/subscriptions"
              className="text-sm text-rose-500 hover:text-rose-600 flex items-center gap-1"
            >
              管理 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {activeSubscriptions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {activeSubscriptions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(s.amount, s.currency)} /{' '}
                      {s.frequency === 'monthly' ? '月' : s.frequency === 'quarterly' ? '季' : '年'}
                    </div>
                    <div className="text-xs text-gray-400">
                      已完成 {s.cycles_completed} 期
                      {s.next_billing_date && ` · 下期 ${formatDate(s.next_billing_date)}`}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">尚無定期定額捐款</div>
          )}
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速連結</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/donate"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <CreditCard className="w-6 h-6 text-rose-500" />
            <span className="text-sm font-medium text-gray-700">立即捐款</span>
          </Link>
          <Link
            href="/member/donations"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <Receipt className="w-6 h-6 text-rose-500" />
            <span className="text-sm font-medium text-gray-700">捐款記錄</span>
          </Link>
          <Link
            href="/member/subscriptions"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <Repeat className="w-6 h-6 text-rose-500" />
            <span className="text-sm font-medium text-gray-700">定期定額</span>
          </Link>
          <Link
            href="/member/profile"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <LayoutDashboard className="w-6 h-6 text-rose-500" />
            <span className="text-sm font-medium text-gray-700">個人設定</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
