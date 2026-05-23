'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Subscription, PaginatedResponse } from '@/types';
import { DataTable, Pagination, StatusBadge, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate, getFrequencyLabel, getPurposeLabel } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'active', label: '啟用中' },
  { value: 'paused', label: '已暫停' },
  { value: 'cancelled', label: '已取消' },
  { value: 'expired', label: '已到期' },
];

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<PaginatedResponse<Subscription> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, [page, statusFilter]);

  async function loadSubscriptions() {
    try {
      setLoading(true);
      const params: { status?: string; page: number; per_page: number } = {
        page,
        per_page: 15,
      };
      if (statusFilter) params.status = statusFilter;
      const result = await api.getSubscriptions(params);
      setData(result as unknown as PaginatedResponse<Subscription>);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      key: 'id',
      header: '會員',
      render: (item: Subscription) => (
        <span className="text-gray-400 text-xs">{(item as any).user?.name || (item as any).user?.email || `#${item.id.slice(0, 8)}`}</span>
      ),
    },
    {
      key: 'amount',
      header: '金額',
      render: (item: Subscription) => (
        <span className="font-medium">{formatCurrency(item.amount, item.currency)}</span>
      ),
    },
    {
      key: 'frequency',
      header: '頻率',
      render: (item: Subscription) => getFrequencyLabel(item.frequency),
    },
    {
      key: 'purpose',
      header: '用途',
      render: (item: Subscription) => getPurposeLabel(item.purpose),
    },
    {
      key: 'status',
      header: '狀態',
      render: (item: Subscription) => <StatusBadge status={item.status} />,
    },
    {
      key: 'next_billing_date',
      header: '下期扣款日',
      render: (item: Subscription) => item.next_billing_date ? formatDate(item.next_billing_date) : '-',
    },
    {
      key: 'cycles_completed',
      header: '期數',
      render: (item: Subscription) => `${item.cycles_completed} / ${item.total_cycles || '∞'}`,
    },
    {
      key: 'consecutive_failures',
      header: '連續失敗',
      render: (item: Subscription) => item.consecutive_failures > 0 ? (
        <span className="text-red-500 font-medium">{item.consecutive_failures} 次</span>
      ) : (
        <span className="text-gray-400">0</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">定期定額管理</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            emptyMessage="尚無定期定額記錄"
          />
          {data && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.total_pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
