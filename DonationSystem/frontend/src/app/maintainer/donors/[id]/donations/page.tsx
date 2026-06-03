'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, Pagination, StatusBadge, LoadingSpinner } from '@/components/ui';
import {
  formatCurrency, formatDateTime, getMethodLabel,
} from '@/lib/utils';
import {
  ArrowLeft, DollarSign, Repeat, CreditCard, Landmark, FileText,
  RefreshCw, Calendar, Clock, CheckCircle2, XCircle, Pause,
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

interface Subscription {
  id: string;
  amount: number;
  currency: string;
  frequency: string;
  payment_method: string;
  purpose?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  next_billing_date?: string;
  last_billing_date?: string;
  total_cycles: number;
  cycles_completed: number;
  consecutive_failures: number;
  created_at?: string;
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

type TabType = 'single' | 'recurring';

export default function DonorDonationHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const donorId = (params.id as string) !== 'placeholder'
    ? (params.id as string)
    : (typeof window !== 'undefined'
        ? window.location.pathname.split('/').filter(p => p)[2] || ''
        : '');

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('single');

  const loadHistory = useCallback(async () => {
    if (!donorId || donorId === 'placeholder') return;
    try {
      setLoading(true);
      const result = await api.maintenanceGetDonorDonationHistory(donorId, {
        page,
        per_page: 50,
      });
      setHistory(result);
    } catch (err) {
      console.error('Failed to load donor donation history', err);
    } finally {
      setLoading(false);
    }
  }, [donorId, page]);

  const loadSubscriptions = useCallback(async () => {
    if (!donorId || donorId === 'placeholder') return;
    try {
      const result = await api.maintenanceGetSubscriptions({ user_id: donorId });
      const data = result?.data || result;
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    }
  }, [donorId]);

  useEffect(() => {
    loadHistory();
    loadSubscriptions();
  }, [loadHistory, loadSubscriptions]);

  // Filter donations by type
  const singleDonations = history?.data?.filter(d => !d.is_recurring) || [];
  const recurringDonations = history?.data?.filter(d => d.is_recurring) || [];

  // Summary stats
  const singleTotal = singleDonations.filter(d => d.status === 'success').reduce((sum, d) => sum + d.amount, 0);
  const recurringTotal = recurringDonations.filter(d => d.status === 'success').reduce((sum, d) => sum + d.amount, 0);

  // Single donation columns
  const singleColumns = [
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
      key: 'receipt_number',
      header: '收據編號',
      render: (item: DonationRecord) => (
        <span className="text-gray-500 font-mono text-xs">
          {item.receipt_number || '-'}
        </span>
      ),
    },
  ];

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'monthly': return '每月';
      case 'quarterly': return '每季';
      case 'yearly': return '每年';
      default: return freq;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '啟用中';
      case 'paused': return '暫停';
      case 'cancelled': return '已取消';
      case 'expired': return '已過期';
      default: return status;
    }
  };

  if (loading && !history) return <LoadingSpinner />;

  const donor = history?.donor;

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                {formatCurrency(singleTotal + recurringTotal, 'TWD')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-xs text-blue-600 font-medium">單筆捐款</p>
              <p className="text-sm font-semibold text-blue-700">
                {singleDonations.length} 筆 / {formatCurrency(singleTotal, 'TWD')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <Repeat className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-purple-600 font-medium">定期定額</p>
              <p className="text-sm font-semibold text-purple-700">
                {subscriptions.length} 個方案 / {formatCurrency(recurringTotal, 'TWD')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('single')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4 inline mr-1.5" />
            單筆捐款 ({singleDonations.length})
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recurring'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Repeat className="w-4 h-4 inline mr-1.5" />
            定期定額捐款 ({subscriptions.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'single' ? (
        /* Single Donations Tab */
        <div>
          {singleDonations.length === 0 ? (
            <Card className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">尚無單筆捐款記錄</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {singleDonations.map(donation => (
                <Card key={donation.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500">
                        {formatDateTime(donation.created_at)}
                      </div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(donation.amount, donation.currency)}
                      </div>
                      <StatusBadge status={donation.status} />
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                        {donation.payment_method === 'credit_card' ? (
                          <CreditCard className="w-4 h-4 text-blue-500" />
                        ) : donation.payment_method === 'postal' ? (
                          <Landmark className="w-4 h-4 text-amber-500" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-gray-500" />
                        )}
                        {getMethodLabel(donation.payment_method)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{donation.purpose || '-'}</p>
                      {donation.receipt_number && (
                        <p className="text-xs text-gray-400 font-mono">{donation.receipt_number}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Recurring Donations Tab */
        <div className="space-y-6">
          {/* Subscription Settings */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">
              <RefreshCw className="w-4 h-4 inline mr-1.5 text-purple-500" />
              訂閱方案設定
            </h3>
            {subscriptions.length === 0 ? (
              <Card className="p-8 text-center">
                <Repeat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">尚無定期定額捐款設定</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(sub => (
                  <Card key={sub.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(sub.status)}
                        <span className={`text-sm font-medium ${
                          sub.status === 'active' ? 'text-green-700' :
                          sub.status === 'paused' ? 'text-yellow-700' :
                          sub.status === 'cancelled' ? 'text-red-700' :
                          'text-gray-600'
                        }`}>
                          {getStatusLabel(sub.status)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {getFrequencyLabel(sub.frequency)}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(sub.amount, sub.currency || 'TWD')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">付款方式</p>
                        <p className="font-medium">{getMethodLabel(sub.payment_method)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">用途</p>
                        <p className="font-medium">{sub.purpose || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">開始日期</p>
                        <p className="font-medium">{sub.start_date || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">下次扣款</p>
                        <p className="font-medium">{sub.next_billing_date || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">已完成期數</p>
                        <p className="font-medium">
                          {sub.cycles_completed}{sub.total_cycles > 0 ? ` / ${sub.total_cycles}` : ' / ∞'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recurring Donation History */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">
              <Calendar className="w-4 h-4 inline mr-1.5 text-purple-500" />
              定期定額扣款紀錄
            </h3>
            {recurringDonations.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">尚無定期定額扣款紀錄</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {recurringDonations.map(donation => (
                  <div key={donation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-500 w-32">
                        {formatDateTime(donation.created_at)}
                      </div>
                      <div className="font-medium text-gray-900 w-24">
                        {formatCurrency(donation.amount, donation.currency)}
                      </div>
                      <StatusBadge status={donation.status} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{donation.purpose || '-'}</p>
                      {donation.receipt_number && (
                        <p className="text-xs text-gray-400 font-mono">{donation.receipt_number}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
