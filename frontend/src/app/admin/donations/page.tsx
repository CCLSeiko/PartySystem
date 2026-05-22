'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Donation, PaginatedResponse } from '@/types';
import { DataTable, Pagination, StatusBadge, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDateTime, getPurposeLabel, getMethodLabel } from '@/lib/utils';
import { Search, Filter, X } from 'lucide-react';

type DonationWithUser = Donation & { user?: { id: string; email: string; name: string } };

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待處理' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失敗' },
  { value: 'cancelled', label: '已取消' },
];

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
