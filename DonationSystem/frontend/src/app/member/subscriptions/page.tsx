'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  DataTable,
  Pagination,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  Card,
} from '@/components/ui';
import { formatCurrency, formatDate, getPurposeLabel, getFrequencyLabel } from '@/lib/utils';
import {
  Repeat,
  PauseCircle,
  PlayCircle,
  Edit3,
  Trash2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { Subscription, PaginatedResponse, SubscriptionFrequency } from '@/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部狀態' },
  { value: 'active', label: '啟用中' },
  { value: 'paused', label: '已暫停' },
  { value: 'cancelled', label: '已取消' },
  { value: 'expired', label: '已到期' },
];

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: '月',
  quarterly: '季',
  yearly: '年',
};

export default function MemberSubscriptionsPage() {
  const [data, setData] = useState<PaginatedResponse<Subscription> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getSubscriptions({
        status: statusFilter || undefined,
        page,
        per_page: 10,
      });
      setData(result);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handlePause = async (id: string) => {
    setActionLoading(id);
    try {
      await api.pauseSubscription(id);
      await loadSubscriptions();
    } catch (err) {
      console.error('Failed to pause subscription', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string) => {
    setActionLoading(id);
    try {
      await api.resumeSubscription(id);
      await loadSubscriptions();
    } catch (err) {
      console.error('Failed to resume subscription', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('確定要取消此定期定額捐款？此操作無法復原。')) return;
    setActionLoading(id);
    try {
      await api.cancelSubscription(id);
      await loadSubscriptions();
    } catch (err) {
      console.error('Failed to cancel subscription', err);
    } finally {
      setActionLoading(null);
    }
  };

  const canPause = (s: Subscription) => s.status === 'active';
  const canResume = (s: Subscription) => s.status === 'paused';
  const canCancel = (s: Subscription) => s.status === 'active' || s.status === 'paused';

  const columns = [
    {
      key: 'amount',
      header: '金額',
      render: (s: Subscription) => (
        <div>
          <span className="font-mono font-medium text-gray-900">
            {formatCurrency(s.amount, s.currency)}
          </span>
          <span className="text-xs text-gray-400 ml-1">
            / {FREQUENCY_LABELS[s.frequency] || s.frequency}
          </span>
        </div>
      ),
    },
    {
      key: 'frequency',
      header: '頻率',
      render: (s: Subscription) => (
        <span className="text-sm text-gray-600">{getFrequencyLabel(s.frequency)}</span>
      ),
    },
    {
      key: 'status',
      header: '狀態',
      render: (s: Subscription) => <StatusBadge status={s.status} />,
    },
    {
      key: 'next_billing_date',
      header: '下期扣款日',
      render: (s: Subscription) => (
        <span className="text-sm text-gray-600">
          {s.next_billing_date ? formatDate(s.next_billing_date) : '-'}
        </span>
      ),
    },
    {
      key: 'cycles',
      header: '已完成期數',
      render: (s: Subscription) => (
        <span className="text-sm text-gray-600">
          {s.cycles_completed}
          {s.total_cycles > 0 ? ` / ${s.total_cycles}` : ''}
        </span>
      ),
    },
    {
      key: 'purpose',
      header: '用途',
      render: (s: Subscription) => (
        <span className="text-sm text-gray-600">{getPurposeLabel(s.purpose)}</span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      className: 'text-right',
      render: (s: Subscription) => (
        <div className="flex items-center justify-end gap-1">
          {canPause(s) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePause(s.id);
              }}
              disabled={actionLoading === s.id}
              className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
              title="暫停"
            >
              <PauseCircle className="w-4 h-4" />
            </button>
          )}
          {canResume(s) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResume(s.id);
              }}
              disabled={actionLoading === s.id}
              className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
              title="恢復"
            >
              <PlayCircle className="w-4 h-4" />
            </button>
          )}
          {canCancel(s) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel(s.id);
              }}
              disabled={actionLoading === s.id}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
              title="取消"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Repeat className="w-6 h-6 text-rose-500" />
            定期定額管理
          </h1>
          <p className="text-gray-500 mt-1">管理您的定期定額捐款設定</p>
        </div>
        <Link
          href="/member/subscriptions/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新增定期定額
        </Link>
      </div>

      {/* Filter */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">篩選狀態：</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {statusFilter && data && (
            <span className="text-xs text-gray-400">
              共 {data.pagination.total} 筆
            </span>
          )}
        </div>
      </Card>

      {/* Subscription List */}
      {loading && !data ? (
        <LoadingSpinner />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<Repeat className="w-12 h-12" />}
          title="尚無定期定額捐款"
          description="您還沒有設定任何定期定額捐款，立即開始設定吧！"
        />
      ) : (
        <div>
          <DataTable
            columns={columns}
            data={data.data}
            loading={loading}
            emptyMessage="沒有符合條件的定期定額"
          />

          {/* Pagination */}
          {data.pagination.total_pages > 1 && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.total_pages}
              onPageChange={setPage}
            />
          )}

          {/* Summary */}
          <div className="text-center text-xs text-gray-400 mt-3">
            共 {data.pagination.total} 筆定期定額捐款
          </div>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">關於定期定額</h3>
            <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
              <li>暫停期間不會進行扣款，但定期定額會保留</li>
              <li>取消後該定期定額將無法恢復，需重新設定</li>
              <li>如需修改金額或頻率，請取消後重新設定</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
