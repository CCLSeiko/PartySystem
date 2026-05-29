'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, DataTable, Pagination, StatusBadge, LoadingSpinner } from '@/components/ui';
import {
  formatCurrency, formatDate, formatDateTime, getStatusColor,
  getFrequencyLabel, getPurposeLabel, getMethodLabel,
} from '@/lib/utils';
import {
  ArrowLeft, Calendar, DollarSign, Repeat, User, Hash, CreditCard, Landmark,
} from 'lucide-react';

interface DonationRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  purpose: string;
  receipt_number?: string;
  created_at: string;
}

interface SubscriptionInfo {
  id: string;
  amount: number;
  frequency: string;
  status: string;
  donor_name?: string;
  start_date?: string;
  end_date?: string;
}

interface HistoryResponse {
  data: DonationRecord[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  subscription: SubscriptionInfo;
}

export default function SubscriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subscriptionId = (params.id as string) !== 'placeholder'
    ? (params.id as string)
    : (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '');

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [page, setPage] = useState(1);

  const loadHistory = useCallback(async () => {
    if (!subscriptionId || subscriptionId === 'placeholder') return;
    try {
      setLoading(true);
      const result = await api.maintenanceGetSubscriptionHistory(subscriptionId, {
        page,
        per_page: 15,
      });
      setHistory(result);
    } catch (err) {
      console.error('Failed to load subscription history', err);
    } finally {
      setLoading(false);
    }
  }, [subscriptionId, page]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const columns = [
    {
      key: 'created_at',
      header: '捐款日期',
      render: (item: DonationRecord) => formatDateTime(item.created_at),
    },
    {
      key: 'amount',
      header: '金額',
      render: (item: DonationRecord) => (
        <span className="font-medium">{formatCurrency(item.amount, item.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: '狀態',
      render: (item: DonationRecord) => <StatusBadge status={item.status} />,
    },
    {
      key: 'payment_method',
      header: '付款方式',
      render: (item: DonationRecord) => {
        const method = item.payment_method;
        return (
          <span className="inline-flex items-center gap-1.5">
            {method === 'credit_card' ? (
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
            ) : method === 'postal' ? (
              <Landmark className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <DollarSign className="w-3.5 h-3.5 text-gray-500" />
            )}
            {getMethodLabel(method)}
          </span>
        );
      },
    },
    {
      key: 'receipt_number',
      header: '收據編號',
      render: (item: DonationRecord) => (
        <span className="text-gray-500 font-mono text-xs">
          {item.receipt_number || '-'}
        </span>
      ),
    },
  ];

  if (loading && !history) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/maintainer/subscriptions')}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">定期定額詳細資料</h1>
      </div>

      {/* Subscription Info Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">訂閱資訊</h2>
        {history?.subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">捐款人</p>
                <p className="text-sm font-semibold text-gray-900">
                  {history.subscription.donor_name || '未知'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">金額</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(history.subscription.amount, 'TWD')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Repeat className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">頻率</p>
                <p className="text-sm font-semibold text-gray-900">
                  {getFrequencyLabel(history.subscription.frequency)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Hash className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">狀態</p>
                <div className="mt-0.5">
                  <StatusBadge status={history.subscription.status} />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">開始日期</p>
                <p className="text-sm font-semibold text-gray-900">
                  {history.subscription.start_date
                    ? formatDate(history.subscription.start_date)
                    : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 font-medium">結束日期</p>
                <p className="text-sm font-semibold text-gray-900">
                  {history.subscription.end_date
                    ? formatDate(history.subscription.end_date)
                    : '無限期'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">載入中...</p>
        )}
      </Card>

      {/* Donation History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">捐款記錄</h2>
        <DataTable
          columns={columns}
          data={history?.data || []}
          loading={loading}
          emptyMessage="尚無捐款記錄"
        />
        {history?.pagination && (
          <Pagination
            page={history.pagination.page}
            totalPages={history.pagination.total_pages}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
