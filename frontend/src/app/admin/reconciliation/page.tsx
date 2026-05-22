'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Reconciliation, ReconciliationDetail, PaginatedResponse } from '@/types';
import { DataTable, StatusBadge, Card, LoadingSpinner } from '@/components/ui';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { Upload, FileSpreadsheet, ChevronDown, ChevronUp, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminReconciliationPage() {
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<ReconciliationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadReconciliations();
  }, []);

  async function loadReconciliations() {
    try {
      setLoading(true);
      const result = await api.adminGetReconciliations();
      setReconciliations(result.data);
    } catch (err) {
      console.error('Failed to load reconciliations', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      setUploadError('');
      await api.adminUploadReconciliation(file);
      await loadReconciliations();
    } catch (err: any) {
      setUploadError(err.message || '上傳失敗');
    } finally {
      setUploading(false);
    }
  }

  async function viewDetail(id: string) {
    try {
      setDetailLoading(true);
      const detail = await api.adminGetReconciliationDetail(id);
      setSelectedDetail(detail);
    } catch (err) {
      console.error('Failed to load reconciliation detail', err);
    } finally {
      setDetailLoading(false);
    }
  }

  const columns = [
    {
      key: 'file_name',
      header: '檔案名稱',
      render: (item: Reconciliation) => (
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-green-500" />
          <span>{item.file_name}</span>
        </div>
      ),
    },
    {
      key: 'total_records',
      header: '總筆數',
    },
    {
      key: 'matched_count',
      header: '相符',
      render: (item: Reconciliation) => (
        <span className="text-green-600 font-medium">{item.matched_count}</span>
      ),
    },
    {
      key: 'unmatched_count',
      header: '不符',
      render: (item: Reconciliation) => (
        <span className={item.unmatched_count > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>{item.unmatched_count}</span>
      ),
    },
    {
      key: 'status',
      header: '狀態',
      render: (item: Reconciliation) => <StatusBadge status={item.status} />,
    },
    {
      key: 'created_at',
      header: '上傳時間',
      render: (item: Reconciliation) => formatDateTime(item.created_at),
    },
    {
      key: 'actions',
      header: '操作',
      render: (item: Reconciliation) => (
        <button
          onClick={(e) => { e.stopPropagation(); viewDetail(item.id); }}
          className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          檢視詳情
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">對帳管理</h1>
      </div>

      {/* Upload Section */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-800">上傳對帳檔案</h3>
            <p className="text-sm text-gray-400 mt-1">上傳銀行或郵局提供的對帳 CSV 檔案</p>
          </div>
          <label className="relative cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
            <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50">
              {uploading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? '上傳中...' : '選擇檔案上傳'}
            </div>
          </label>
        </div>
        {uploadError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {uploadError}
          </div>
        )}
      </Card>

      {/* Reconciliations List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">對帳記錄</h2>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <DataTable
            columns={columns}
            data={reconciliations}
            emptyMessage="尚無對帳記錄"
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">對帳詳情</h3>
                <p className="text-sm text-gray-400 mt-0.5">{selectedDetail.file_name}</p>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{selectedDetail.total_records}</div>
                  <div className="text-xs text-gray-500 mt-1">總筆數</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedDetail.matched_count}</div>
                  <div className="text-xs text-green-500 mt-1">相符</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{selectedDetail.unmatched_count}</div>
                  <div className="text-xs text-red-500 mt-1">不符</div>
                </div>
              </div>

              {/* Unmatched Items */}
              {selectedDetail.unmatched_items && selectedDetail.unmatched_items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    不符項目
                  </h4>
                  <div className="space-y-3">
                    {selectedDetail.unmatched_items.map((item, i) => (
                      <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400 text-xs">行號</span>
                            <div className="font-medium">{item.row}</div>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">劃撥單號</span>
                            <div className="font-medium">{item.draft_number}</div>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">預期金額</span>
                            <div className="font-medium">{formatCurrency(item.expected_amount)}</div>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">實際金額</span>
                            <div className="font-medium text-red-600">{formatCurrency(item.actual_amount)}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 bg-red-100/50 px-2 py-1 rounded">
                          原因：{item.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!selectedDetail.unmatched_items || selectedDetail.unmatched_items.length === 0) && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">所有記錄皆相符，無異常項目</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
