'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  DataTable,
  Pagination,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  Card,
} from '@/components/ui';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getPurposeLabel,
  getMethodLabel,
} from '@/lib/utils';
import { Receipt, Filter, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Donation, PaginatedResponse, DonationStatus, PaymentMethod } from '@/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部狀態' },
  { value: 'success', label: '成功' },
  { value: 'pending', label: '待處理' },
  { value: 'failed', label: '失敗' },
  { value: 'cancelled', label: '已取消' },
];

const METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部方式' },
  { value: 'credit_card', label: '信用卡' },
  { value: 'postal', label: '郵政劃撥' },
  { value: 'cash', label: '現金' },
];

export default function MemberDonationsPage() {
  const [data, setData] = useState<PaginatedResponse<Donation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadDonations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getDonations({
        status: status || undefined,
        payment_method: method || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        per_page: 10,
      });
      setData(result);
    } catch (err) {
      console.error('Failed to load donations', err);
    } finally {
      setLoading(false);
    }
  }, [page, status, method, startDate, endDate]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  const handleFilterApply = () => {
    setPage(1);
    loadDonations();
  };

  const handleClearFilters = () => {
    setStatus('');
    setMethod('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasFilters = status || method || startDate || endDate;

  const columns = [
    {
      key: 'created_at',
      header: '日期',
      render: (d: Donation) => (
        <span className="text-sm font-medium">{formatDate(d.created_at)}</span>
      ),
    },
    {
      key: 'amount',
      header: '金額',
      className: 'text-right',
      render: (d: Donation) => (
        <span className="font-mono font-medium">{formatCurrency(d.amount, d.currency)}</span>
      ),
    },
    {
      key: 'payment_method',
      header: '方式',
      render: (d: Donation) => (
        <span className="text-sm text-gray-600">{getMethodLabel(d.payment_method)}</span>
      ),
    },
    {
      key: 'purpose',
      header: '用途',
      render: (d: Donation) => (
        <span className="text-sm text-gray-600">{getPurposeLabel(d.purpose)}</span>
      ),
    },
    {
      key: 'status',
      header: '狀態',
      render: (d: Donation) => <StatusBadge status={d.status} />,
    },
    {
      key: 'receipt_number',
      header: '收據編號',
      render: (d: Donation) => (
        <span className="text-sm text-gray-400">{d.receipt_number || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-10',
      render: (d: Donation) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId(expandedId === d.id ? null : d.id);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expandedId === d.id ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-rose-500" />
          捐款記錄
        </h1>
        <p className="text-gray-500 mt-1">查看您的所有捐款記錄與明細</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Filter className="w-4 h-4" />
            篩選條件
          </h2>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              清除篩選
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          >
            {METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="開始日期"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="結束日期"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleFilterApply}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            查詢
          </button>
        </div>
      </Card>

      {/* Data Table */}
      {loading && !data ? (
        <LoadingSpinner />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-12 h-12" />}
          title="尚無捐款記錄"
          description="您還沒有任何捐款記錄，立即開始您的第一筆捐款吧！"
        />
      ) : (
        <div>
          <DataTable
            columns={columns}
            data={data.data}
            loading={loading}
            emptyMessage="沒有符合條件的捐款記錄"
            onRowClick={(d: Donation) =>
              setExpandedId(expandedId === d.id ? null : d.id)
            }
          />

          {/* Expanded Details */}
          {expandedId && (
            <Card className="mt-2">
              {data.data
                .filter((d) => d.id === expandedId)
                .map((d) => (
                  <div key={d.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">捐款明細</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">捐款編號：</span>
                        <span className="text-gray-700 font-mono">{d.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">建立時間：</span>
                        <span className="text-gray-700">{formatDateTime(d.created_at)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">更新時間：</span>
                        <span className="text-gray-700">{formatDateTime(d.updated_at)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">用途：</span>
                        <span className="text-gray-700">{getPurposeLabel(d.purpose)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">幣別：</span>
                        <span className="text-gray-700">{d.currency}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">可抵稅：</span>
                        <span className="text-gray-700">{d.tax_deductible ? '是' : '否'}</span>
                      </div>
                      {d.receipt_number && (
                        <div>
                          <span className="text-gray-400">收據編號：</span>
                          <span className="text-gray-700">{d.receipt_number}</span>
                        </div>
                      )}
                      {d.is_recurring && (
                        <div>
                          <span className="text-gray-400">定期定額：</span>
                          <span className="text-gray-700">是</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </Card>
          )}

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
            共 {data.pagination.total} 筆捐款記錄
          </div>
        </div>
      )}
    </div>
  );
}
