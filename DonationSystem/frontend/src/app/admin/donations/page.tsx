'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Donation, PaginatedResponse } from '@/types';
import { DataTable, Pagination, StatusBadge, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDateTime, getPurposeLabel, getMethodLabel } from '@/lib/utils';
import { Search, Filter, X, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';

type DonationWithUser = Donation & { user?: { id: string; email: string; name: string } };

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待處理' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失敗' },
  { value: 'cancelled', label: '已取消' },
];

const STATUS_TRANSITIONS: Record<string, { value: string; label: string; color: string }[]> = {
  pending: [
    { value: 'success', label: '標記為成功', color: 'text-green-700 bg-green-50 hover:bg-green-100' },
    { value: 'failed', label: '標記為失敗', color: 'text-red-700 bg-red-50 hover:bg-red-100' },
    { value: 'cancelled', label: '標記為取消', color: 'text-gray-700 bg-gray-50 hover:bg-gray-100' },
  ],
  failed: [
    { value: 'pending', label: '重設為待處理', color: 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100' },
    { value: 'success', label: '標記為成功', color: 'text-green-700 bg-green-50 hover:bg-green-100' },
  ],
};

const METHOD_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'credit_card', label: '信用卡' },
  { value: 'postal', label: '郵政劃撥' },
  { value: 'cash', label: '現金' },
];

export default function AdminDonationsPage() {
  const [data, setData] = useState<PaginatedResponse<DonationWithUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Status change state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDonations();
  }, [page]);

  async function loadDonations() {
    try {
      setLoading(true);
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        per_page: 15,
      };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.payment_method = methodFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search) params.q = search;
      const result = await api.adminGetDonations(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load donations', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setPage(1);
    loadDonations();
  }

  function handleReset() {
    setSearch('');
    setStatusFilter('');
    setMethodFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }

  async function handleStatusChange(donationId: string, newStatus: string) {
    setUpdatingId(donationId);
    setStatusMessage(null);
    try {
      await api.adminUpdateDonationStatus(donationId, newStatus);
      setStatusMessage({ type: 'success', text: '狀態已更新' });
      // Refresh list
      await loadDonations();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '更新狀態失敗',
      });
    } finally {
      setUpdatingId(null);
    }
  }

  const columns = [
    {
      key: 'created_at',
      header: '日期',
      render: (item: DonationWithUser) => formatDateTime(item.created_at),
    },
    {
      key: 'user',
      header: '會員',
      render: (item: DonationWithUser) => item.user?.name || item.user?.email || '訪客',
    },
    {
      key: 'amount',
      header: '金額',
      render: (item: DonationWithUser) => formatCurrency(item.amount, item.currency),
      className: 'font-medium',
    },
    {
      key: 'payment_method',
      header: '方式',
      render: (item: DonationWithUser) => getMethodLabel(item.payment_method),
    },
    {
      key: 'purpose',
      header: '用途',
      render: (item: DonationWithUser) => getPurposeLabel(item.purpose),
    },
    {
      key: 'status',
      header: '狀態',
      render: (item: DonationWithUser) => <StatusBadge status={item.status} />,
    },
    {
      key: 'receipt_number',
      header: '收據編號',
      render: (item: DonationWithUser) => item.receipt_number || '-',
    },
    {
      key: 'actions',
      header: '操作',
      render: (item: DonationWithUser) => {
        const transitions = STATUS_TRANSITIONS[item.status];
        if (!transitions) return <span className="text-xs text-gray-400">不可變更</span>;

        return (
          <div className="relative inline-block">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleStatusChange(item.id, e.target.value);
                }
              }}
              disabled={updatingId === item.id}
              className="appearance-none text-xs px-2 py-1.5 pr-6 border border-gray-200 rounded-lg bg-white text-gray-600 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <option value="">{updatingId === item.id ? '更新中...' : '變更狀態'}</option>
              {transitions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">捐款管理</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          篩選
        </button>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl border ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          )}
          <p
            className={`text-sm ${
              statusMessage.type === 'success' ? 'text-green-700' : 'text-red-600'
            }`}
          >
            {statusMessage.text}
          </p>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">搜尋</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="會員姓名或 Email"
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">狀態</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">付款方式</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              >
                {METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">開始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">結束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600"
            >
              搜尋
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
            emptyMessage="尚無捐款記錄"
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
