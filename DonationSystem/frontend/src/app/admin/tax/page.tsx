'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { TaxSummary } from '@/types';
import { Card, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Download, FileText, Calendar, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function AdminTaxPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTaxSummary();
  }, [year]);

  async function loadTaxSummary() {
    try {
      setLoading(true);
      setError('');
      const data = await api.adminGetTaxSummary(year);
      setTaxSummary(data);
    } catch (err: any) {
      setError(err.message || '無法載入稅務報表');
      setTaxSummary(null);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    const url = api.adminDownloadTaxReport(year);
    window.open(url, '_blank');
  }

  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">稅務報表</h1>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y} 年</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <Card>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-gray-500">{error}</p>
          </div>
        </Card>
      ) : taxSummary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">捐款人數</span>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{taxSummary.total_donors}</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">同意稅務扣抵</span>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{taxSummary.total_tax_consented}</div>
              <div className="text-xs text-gray-400 mt-1">
                佔比 {taxSummary.total_donors > 0 ? ((taxSummary.total_tax_consented / taxSummary.total_donors) * 100).toFixed(1) : 0}%
              </div>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">捐款總金額</span>
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(taxSummary.total_amount)}</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">可扣抵金額</span>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(taxSummary.tax_deductible_amount)}</div>
            </Card>
          </div>

          {/* Status & Download */}
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">報表狀態</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    taxSummary.status === 'completed' || taxSummary.status === 'generated'
                      ? 'text-green-600 bg-green-50 border-green-200'
                      : 'text-yellow-600 bg-yellow-50 border-yellow-200'
                  }`}>
                    {taxSummary.status === 'completed' || taxSummary.status === 'generated' ? '✓ 已產生' : '待產生'}
                  </span>
                  {taxSummary.last_report_generated && (
                    <span className="text-xs text-gray-400">
                      上次產生：{formatDateTime(taxSummary.last_report_generated)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600"
              >
                <Download className="w-4 h-4" />
                下載國稅局 CSV
              </button>
            </div>
          </Card>

          {/* Info */}
          <Card>
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-gray-700">國稅局申報說明</h4>
                <ul className="mt-2 text-sm text-gray-500 space-y-1 list-disc list-inside">
                  <li>下載的 CSV 檔案符合國稅局上傳格式規範</li>
                  <li>僅包含同意稅務扣抵（tax_consent = true）的捐款人資料</li>
                  <li>可扣抵金額為年度內所有成功捐款的總和</li>
                  <li>請於每年 2 月底前完成上一年度申報</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
