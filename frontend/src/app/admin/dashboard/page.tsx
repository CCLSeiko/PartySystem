'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AdminStats } from '@/types';
import { StatsCard, Card, LoadingSpinner } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  DollarSign, Receipt, TrendingUp, Repeat, Download,
} from 'lucide-react';

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await api.adminGetStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || '無法載入統計資料');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <div className="text-center text-red-500 py-12">{error}</div>;
  if (!stats) return null;

  const { summary, by_method, by_purpose, time_series } = stats;

  const methodData = Object.entries(by_method || {}).map(([name, value]) => ({
    name: name === 'credit_card' ? '信用卡'
      : name === 'postal' ? '郵政劃撥'
      : name === 'cash' ? '現金' : name,
    value,
  }));

  const purposeData = Object.entries(by_purpose || {}).map(([name, value]) => ({
    name: name === 'general' ? '一般捐款'
      : name === 'emergency_relief' ? '急難救助'
      : name === 'education' ? '教育贊助'
      : name === 'medical' ? '醫療補助'
      : name === 'other' ? '其他' : name,
    value,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">管理儀表板</h1>
        <button
          onClick={() => {/* 匯出功能待實作 */}}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          匯出報表
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="總捐款筆數"
          value={summary.total_donations}
          icon={<Receipt className="w-5 h-5" />}
        />
        <StatsCard
          title="總捐款金額"
          value={formatCurrency(summary.total_amount)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatsCard
          title="平均每筆金額"
          value={formatCurrency(summary.avg_per_donation)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatsCard
          title="定期定額數"
          value={summary.total_recurring}
          icon={<Repeat className="w-5 h-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Payment Methods */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">付款方式比例</h3>
          {methodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={methodData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {methodData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">暫無資料</div>
          )}
        </Card>

        {/* Pie Chart - Purposes */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">捐款用途分布</h3>
          {purposeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={purposeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {purposeData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">暫無資料</div>
          )}
        </Card>
      </div>

      {/* Line Chart - Time Series */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">捐款趨勢</h3>
        {time_series && time_series.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={time_series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#f59e0b"
                strokeWidth={2}
                name="捐款金額"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                name="捐款筆數"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-400 py-12">暫無趨勢資料</div>
        )}
      </Card>
    </div>
  );
}
