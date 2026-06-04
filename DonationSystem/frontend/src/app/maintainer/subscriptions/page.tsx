'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DataTable, Pagination, StatusBadge, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate, getFrequencyLabel, getPurposeLabel } from '@/lib/utils';
import { Plus, Filter, X, Pencil, Eye, BarChart3 } from 'lucide-react';

interface Subscription {
  id: string;
  donor_name?: string;
  donor_id?: string;
  amount: number;
  currency: string;
  frequency: string;
  status: string;
  purpose?: string;
  payment_method?: string;
  next_billing_date?: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'active', label: '啟用中' },
  { value: 'paused', label: '已暫停' },
  { value: 'cancelled', label: '已取消' },
  { value: 'expired', label: '已到期' },
];

export default function MaintainerSubscriptionsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ data: Subscription[]; pagination: { page: number; per_page: number; total: number; total_pages: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filter input values (what user types/picks — does NOT trigger API call)
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [endDateFrom, setEndDateFrom] = useState('');
  const [endDateTo, setEndDateTo] = useState('');
  const [donorKeyword, setDonorKeyword] = useState('');

  // Applied filter values (only updated when user clicks 查詢)
  const [appliedFilters, setAppliedFilters] = useState<{
    status: string;
    payment_method: string;
    frequency: string;
    end_date_from: string;
    end_date_to: string;
    donor_keyword: string;
  }>({ status: '', payment_method: '', frequency: '', end_date_from: '', end_date_to: '', donor_keyword: '' });

  const [showFilters, setShowFilters] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | undefined> = { page, per_page: 15 };
      if (appliedFilters.status) params.status = appliedFilters.status;
      if (appliedFilters.payment_method) params.payment_method = appliedFilters.payment_method;
      if (appliedFilters.frequency) params.frequency = appliedFilters.frequency;
      if (appliedFilters.end_date_from) params.end_date_from = appliedFilters.end_date_from;
      if (appliedFilters.end_date_to) params.end_date_to = appliedFilters.end_date_to;
      if (appliedFilters.donor_keyword.trim()) params.donor_keyword = appliedFilters.donor_keyword.trim();
      const result = await api.maintenanceGetSubscriptions(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  function handleSearch() {
    setAppliedFilters({
      status: statusFilter,
      payment_method: paymentMethodFilter,
      frequency: frequencyFilter,
      end_date_from: endDateFrom,
      end_date_to: endDateTo,
      donor_keyword: donorKeyword,
    });
    setPage(1);
  }

  function handleReset() {
    setStatusFilter('');
    setPaymentMethodFilter('');
    setFrequencyFilter('');
    setEndDateFrom('');
    setEndDateTo('');
    setDonorKeyword('');
    setAppliedFilters({ status: '', payment_method: '', frequency: '', end_date_from: '', end_date_to: '', donor_keyword: '' });
    setPage(1);
  }

  const columns = [
    {
      key: 'donor_name',
      header: '捐款人',
      render: (item: Subscription) => (
        item.donor_id ? (
          <button
            onClick={() => router.push(`/maintainer/donors/${item.donor_id}`)}
            className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
          >
            {item.donor_name || '未知'}
          </button>
        ) : (
          <span>{item.donor_name || '未知'}</span>
        )
      ),
    },
    {
      key: 'amount',
      header: '金額',
      render: (item: Subscription) => formatCurrency(item.amount, item.currency),
      className: 'font-medium',
    },
    {
      key: 'frequency',
      header: '頻率',
      render: (item: Subscription) => getFrequencyLabel(item.frequency),
    },
    {
      key: 'payment_method',
      header: '付款條件',
      render: (item: Subscription) => {
        const labels: Record<string, string> = { credit_card: '信用卡', postal: '郵政劃撥', cash: '現金' };
        return labels[item.payment_method || ''] || item.payment_method || '-';
      },
    },
    {
      key: 'purpose',
      header: '用途',
      render: (item: Subscription) => item.purpose ? getPurposeLabel(item.purpose) : '-',
    },
    {
      key: 'status',
      header: '狀態',
      render: (item: Subscription) => <StatusBadge status={item.status} />,
    },
    {
      key: 'next_billing_date',
      header: '下次扣款',
      render: (item: Subscription) => item.next_billing_date ? formatDate(item.next_billing_date) : '-',
    },
    {
      key: 'end_date',
      header: '結束日期',
      render: (item: Subscription) => {
        // item doesn't have end_date in the interface yet — read from raw
        const raw = item as any;
        return raw.end_date ? formatDate(raw.end_date) : '-';
      },
    },
    {
      key: 'created_at',
      header: '建立日期',
      render: (item: Subscription) => formatDate(item.created_at),
    },
    {
      key: 'actions',
      header: '操作',
      render: (item: Subscription) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/maintainer/subscriptions/${item.id}`)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="檢視明細"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push(`/maintainer/subscriptions/${item.id}/edit`)}
            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="編輯"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">定期定額管理</h1>
          <p className="text-sm text-gray-500 mt-1">檢視和管理所有定期定額捐款</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            篩選
          </button>
          <button
            onClick={() => router.push('/maintainer/subscriptions/new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增定期定額
          </button>
          <button
            onClick={() => router.push('/maintainer/subscriptions/stats')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            月度報表
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* 捐款人關鍵字 */}
            <div className="w-56">
              <label className="block text-sm font-medium text-gray-600 mb-1">捐款人</label>
              <input
                type="text"
                placeholder="姓名或 Email..."
                value={donorKeyword}
                onChange={(e) => setDonorKeyword(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
            {/* 狀態 */}
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-600 mb-1">狀態</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {/* 付款方式 */}
            <div className="w-44">
              <label className="block text-sm font-medium text-gray-600 mb-1">付款方式</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              >
                <option value="">全部</option>
                <option value="credit_card">信用卡</option>
                <option value="postal">郵政劃撥</option>
                <option value="cash">現金</option>
              </select>
            </div>
            {/* 頻率 */}
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-600 mb-1">頻率</label>
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              >
                <option value="">全部</option>
                <option value="monthly">每月</option>
                <option value="quarterly">每季</option>
                <option value="yearly">每年</option>
              </select>
            </div>
            {/* 結束日期起 */}
            <div className="w-44">
              <label className="block text-sm font-medium text-gray-600 mb-1">結束日期起</label>
              <input
                type="date"
                value={endDateFrom}
                onChange={(e) => setEndDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
            {/* 結束日期迄 */}
            <div className="w-44">
              <label className="block text-sm font-medium text-gray-600 mb-1">結束日期迄</label>
              <input
                type="date"
                value={endDateTo}
                onChange={(e) => setEndDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-1 px-5 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              查詢
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <X className="w-3 h-3" />
              重置
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            emptyMessage="尚無定期定額資料"
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
