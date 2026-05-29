'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, LoadingSpinner } from '@/components/ui';
import { DollarSign, HeartHandshake, TrendingUp } from 'lucide-react';

export default function MaintainerDashboardPage() {
  const [stats, setStats] = useState<{
    total_amount: number;
    currency: string;
    updated_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const result = await api.maintenanceGetSimpleStats();
      setStats(result);
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">捐款儀表板</h1>
        <p className="text-gray-500 mt-1">捐款資料維護總覽</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">累計捐款金額</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.total_amount.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">功能捷徑</p>
              <p className="text-sm font-medium text-gray-700">
                <a href="/maintainer/donations" className="text-emerald-600 hover:underline">捐款管理</a>
                {' · '}
                <a href="/maintainer/donations/new" className="text-emerald-600 hover:underline">登錄捐款</a>
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">幣別</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.currency || 'TWD'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">捐款維護者操作指南</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• <strong>捐款管理</strong> — 檢視所有捐款紀錄、更新捐款狀態</li>
          <li>• <strong>手動登錄捐款</strong> — 登錄線下收款（現金、郵政劃撥）捐款紀錄</li>
          <li>• 捐款人<strong>不需登入</strong>即可進行捐款操作</li>
        </ul>
        {stats?.updated_at && (
          <p className="mt-4 text-xs text-gray-400">
            資料更新時間：{new Date(stats.updated_at).toLocaleString('zh-TW')}
          </p>
        )}
      </Card>
    </div>
  );
}
