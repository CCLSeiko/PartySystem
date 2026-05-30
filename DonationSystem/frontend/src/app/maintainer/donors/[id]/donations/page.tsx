'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, DataTable, Pagination, StatusBadge, LoadingSpinner } from '@/components/ui';
import {
  formatCurrency, formatDateTime, getStatusColor,
  getMethodLabel,
} from '@/lib/utils';
import {
  ArrowLeft, User, Mail, DollarSign, Repeat, Hash, CreditCard, Landmark, FileText,
} from 'lucide-react';

interface DonationRecord {
  id: string;
  amount: number;
  currency: string;
  purpose: string;
  payment_method: string;
  status: string;
  is_recurring: boolean;
  receipt_number?: string;
  guest_name?: string;
  guest_email?: string;
  subscription_id?: string;
  created_at: string;
  updated_at: string;
}

interface DonorInfo {
  id: string;
  name: string;
  email: string;
}

interface HistoryResponse {
  donor: DonorInfo;
  data: DonationRecord[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export default function DonorDonationHistoryPage() {
  const router = useRouter();
  const params = useParams();
  // For static export: params.id is always 'placeholder', extract real UUID from URL
  // URL pattern: /maintainer/donors/{uuid}/donations
  const donorId = (params.id as string) !== 'placeholder'
    ? (params.id as string)
    : (typeof window !== 'undefined'
        ? window.location.pathname.split('/').filter(p => p)[2] || ''
        : '');

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [page, setPage] = useState(1);

  const loadHistory = useCallback(async () => {
    if (!donorId || donorId === 'placeholder') return;
    try {
      setLoading(true);
      const result = await api.maintenanceGetDonorDonationHistory(donorId, {
        page,
        per_page: 15,
      });
      setHistory(result);
    } catch (err) {
      console.error('Failed to load donor donation history', err);
    } finally {
      setLoading(false);
    }
  }, [donorId, page]);

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
      key: 'purpose',
      header: '用途',
      render: (item: DonationRecord) => item.purpose || '-',
    },
    {
      key: 'is_recurring',
      header: '類型',
      render: (item: DonationRecord) => (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          item.is_recurring
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-gray-50 text-gray-600 border border-gray-200'
        }`}>
          {item.is_recurring ? <Repeat className="w-3 h-3" /> : null}
          {item.is_recurring ? '定期' : '單次'}
        </span>
      ),
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

  const donor = history?.donor;
  const totalSuccessful = history?.data?.filter(d => d.status === 'success') || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/maintainer/donors/${donorId}`)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">捐款歷程</h1>
          {donor && (
            <p className="text-sm text-gray-500 mt-0.5">
              {donor.name}（{donor.email}）
            </p>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">捐款摘要</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">總捐款筆數</p>
              <p className="text-sm font-semibold text-gray-900">
                {history?.pagination?.total || 0} 筆
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">成功捐款金額</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(
                  totalSuccessful.reduce((sum, d) => sum + d.amount, 0),
                  'TWD'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Repeat className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 font-medium">定期捐款</p>
              <p className="text-sm font-semibold text-gray-900">
                {history?.data?.filter(d => d.is_recurring).length || 0} 筆
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Donation History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">捐款紀錄</h2>
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
