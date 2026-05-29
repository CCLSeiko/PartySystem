'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, LoadingSpinner } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  Calendar,
  Users,
  CreditCard,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Layers,
} from 'lucide-react';

const MONTH_OPTIONS = [
  { value: 0, label: '全年' },
  { value: 1, label: '1 月' },
  { value: 2, label: '2 月' },
  { value: 3, label: '3 月' },
  { value: 4, label: '4 月' },
  { value: 5, label: '5 月' },
  { value: 6, label: '6 月' },
  { value: 7, label: '7 月' },
  { value: 8, label: '8 月' },
  { value: 9, label: '9 月' },
  { value: 10, label: '10 月' },
  { value: 11, label: '11 月' },
  { value: 12, label: '12 月' },
];

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: '每月',
  quarterly: '每季',
  yearly: '每年',
};

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  success: {
    label: '成功',
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  failed: {
    label: '失敗',
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  pending: {
    label: '待處理',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  },
  cancelled: {
    label: '已取消',
    icon: <Ban className="w-5 h-5" />,
    color: 'text-gray-500 bg-gray-50 border-gray-200',
  },
};

interface SubscriptionStats {
  year: number;
  month?: number;
  period_start: string;
  period_end: string;
  active_subscriptions: number;
  total_subscriptions: number;
  period_donations: number;
  total_amount: number;
  currency: string;
  status_breakdown: Record<string, number>;
  frequency_distribution: Record<string, number>;
}

export default function MaintainerSubscriptionStatsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(0); // 0 = all year
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const params: { year: number; month?: number } = { year };
      if (month > 0) params.month = month;
      const result = await api.maintenanceGetSubscriptionStats(params);
      setStats(result);
    } catch (err) {
      console.error('Failed to load subscription stats', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Generate year range: current year - 5 to current year + 1
  const yearOptions: number[] = [];
  for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) {
    yearOptions.push(y);
  }

  const periodStr = stats
    ? `${stats.period_start?.slice(0, 10) || ''} ~ ${stats.period_end?.slice(0, 10) || ''}`
    : '';

  const freqEntries = stats?.frequency_distribution
    ? Object.entries(stats.frequency_distribution).sort(
        ([, a], [, b]) => b - a
      )
    : [];

  const statusEntries = stats?.status_breakdown
    ? Object.entries(stats.status_breakdown)
    : [];

  const totalStatusCounts = statusEntries.reduce(
    (sum, [, count]) => sum + count,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">定期定額統計</h1>
        <p className="text-gray-500 mt-1">檢視定期定額捐款統計數據</p>
      </div>

      {/* Year / Month Selector */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              年份
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setYear((y) => {
                    const idx = yearOptions.indexOf(y) - 1;
                    return idx >= 0 ? yearOptions[idx] : y;
                  })
                }
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={year <= yearOptions[0]}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white min-w-[90px]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y} 年
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  setYear((y) => {
                    const idx = yearOptions.indexOf(y) + 1;
                    return idx < yearOptions.length ? yearOptions[idx] : y;
                  })
                }
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={year >= yearOptions[yearOptions.length - 1]}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              月份
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white min-w-[100px]"
            >
              {MONTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {stats && periodStr && (
            <div className="flex items-center gap-2 text-sm text-gray-400 pb-1">
              <Calendar className="w-4 h-4" />
              <span>{periodStr}</span>
            </div>
          )}
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner />
      ) : !stats ? (
        <Card>
          <p className="text-center text-gray-400 py-8">無法載入統計資料</p>
        </Card>
      ) : (
        <>
          {/* Key Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Subscriptions */}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">啟用中訂閱</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.active_subscriptions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    / 總計 {stats.total_subscriptions.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Period Donations */}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">期間捐款筆數</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.period_donations.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">筆</p>
                </div>
              </div>
            </Card>

            {/* Total Amount */}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">期間捐款總金額</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(stats.total_amount, stats.currency)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {stats.currency}
                  </p>
                </div>
              </div>
            </Card>

            {/* Frequency Summary */}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">付款頻率</p>
                  <p className="text-xl font-bold text-gray-900">
                    {freqEntries.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    種頻率方案
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Two-column layout for Status & Frequency */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">
                  狀態分佈
                </h2>
              </div>
              {statusEntries.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  尚無資料
                </p>
              ) : (
                <div className="space-y-3">
                  {statusEntries.map(([status, count]) => {
                    const info = STATUS_LABELS[status] || {
                      label: status,
                      icon: <CheckCircle2 className="w-5 h-5" />,
                      color: 'text-gray-600 bg-gray-50 border-gray-200',
                    };
                    const percentage =
                      totalStatusCounts > 0
                        ? ((count / totalStatusCounts) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${info.color}`}
                        >
                          {info.icon}
                          <span>{info.label}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                status === 'success'
                                  ? 'bg-green-500'
                                  : status === 'failed'
                                  ? 'bg-red-400'
                                  : status === 'pending'
                                  ? 'bg-yellow-400'
                                  : status === 'cancelled'
                                    ? 'bg-gray-300'
                                    : 'bg-emerald-400'
                              }`}
                              style={{
                                width: `${Math.max(Number(percentage), 1)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-16 text-right shrink-0">
                          {count.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400 w-12 text-right shrink-0">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Frequency Distribution */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">
                  頻率分佈
                </h2>
              </div>
              {freqEntries.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  尚無資料
                </p>
              ) : (
                <div className="space-y-3">
                  {freqEntries.map(([freq, count], idx) => {
                    const totalCount = freqEntries.reduce(
                      (sum, [, c]) => sum + c,
                      0
                    );
                    const percentage =
                      totalCount > 0
                        ? ((count / totalCount) * 100).toFixed(1)
                        : '0.0';
                    const barColors = [
                      'bg-emerald-500',
                      'bg-emerald-400',
                      'bg-emerald-300',
                    ];

                    return (
                      <div key={freq} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-16 shrink-0">
                          {FREQUENCY_LABELS[freq] || freq}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="w-full bg-gray-100 rounded-full h-5">
                            <div
                              className={`h-5 rounded-full flex items-center justify-end px-2 transition-all duration-500 ${
                                barColors[idx % barColors.length]
                              }`}
                              style={{
                                width: `${Math.max(Number(percentage), 1)}%`,
                                minWidth: count > 0 ? '3rem' : '0',
                              }}
                            >
                              <span className="text-xs text-white font-medium leading-none">
                                {count.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right shrink-0">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
