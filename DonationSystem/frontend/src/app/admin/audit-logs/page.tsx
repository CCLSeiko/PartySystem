'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, LoadingSpinner } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import {
  ScrollText,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface AuditLog {
  id: string;
  level: string;
  category: string;
  message: string;
  source: string;
  user_email?: string;
  method?: string;
  path?: string;
  status_code?: string;
  error_type?: string;
  stack_trace?: string;
  extra_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

const LEVELS = [
  { value: '', label: '全部等級' },
  { value: 'error', label: '錯誤', color: 'text-red-600 bg-red-50' },
  { value: 'warning', label: '警告', color: 'text-amber-600 bg-amber-50' },
  { value: 'info', label: '資訊', color: 'text-blue-600 bg-blue-50' },
  { value: 'debug', label: '除錯', color: 'text-gray-600 bg-gray-50' },
];

const CATEGORIES = [
  { value: '', label: '全部類別' },
  { value: 'frontend_error', label: '前端錯誤' },
  { value: 'backend_error', label: '後端錯誤' },
  { value: 'donation', label: '捐款操作' },
  { value: 'subscription', label: '定期定額' },
  { value: 'auth', label: '認證操作' },
  { value: 'admin', label: '管理操作' },
];

function LevelBadge({ level }: { level: string }) {
  const levelConfig = LEVELS.find((l) => l.value === level) || LEVELS[3];
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${levelConfig.color}`}>
      {level === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
      {level === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
      {level === 'info' && <Info className="w-3 h-3 mr-1" />}
      {levelConfig.label}
    </span>
  );
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ level: '', category: '' });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    loadLogs();
    loadErrorCount();
  }, [filter]);

  async function loadLogs() {
    try {
      setLoading(true);
      setError('');
      const params: { level?: string; category?: string; limit?: number } = { limit: 200 };
      if (filter.level) params.level = filter.level;
      if (filter.category) params.category = filter.category;
      const result = await api.adminGetAuditLogs(params);
      setLogs(result.data);
    } catch (err: any) {
      setError(err.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  }

  async function loadErrorCount() {
    try {
      const result = await api.adminGetErrorCount(60);
      setErrorCount(result.error_count);
    } catch {}
  }

  function getLevelIcon(level: string) {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-400" />;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系統操作紀錄</h1>
          <p className="text-sm text-gray-500 mt-1">檢視系統操作與錯誤日誌</p>
        </div>
        <button
          onClick={() => { loadLogs(); loadErrorCount(); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          重新整理
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ScrollText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
              <div className="text-xs text-gray-500">總紀錄數</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-gray-500">最近1小時錯誤</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {logs.filter((l) => l.level === 'warning').length}
              </div>
              <div className="text-xs text-gray-500">警告數量</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Info className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {logs.filter((l) => l.source === 'frontend').length}
              </div>
              <div className="text-xs text-gray-500">前端回報</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">篩選：</span>
          </div>
          <select
            value={filter.level}
            onChange={(e) => setFilter({ ...filter, level: e.target.value })}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {(filter.level || filter.category) && (
            <button
              onClick={() => setFilter({ level: '', category: '' })}
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              清除篩選
            </button>
          )}
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">等級</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">類別</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">訊息</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">來源</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">使用者</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">時間</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <ScrollText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>尚無紀錄</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3">
                        <LevelBadge level={log.level} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600">{log.category}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-800">
                        {log.message}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.source === 'frontend'
                            ? 'bg-purple-50 text-purple-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {log.source === 'frontend' ? '前端' : '後端'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.user_email || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                          className="text-amber-600 hover:text-amber-700 text-sm"
                        >
                          檢視
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {getLevelIcon(selectedLog.level)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">紀錄詳情</h3>
                  <p className="text-sm text-gray-400">{selectedLog.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">等級</label>
                  <div className="mt-1"><LevelBadge level={selectedLog.level} /></div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">來源</label>
                  <div className="mt-1 text-sm text-gray-700">{selectedLog.source}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">使用者</label>
                  <div className="mt-1 text-sm text-gray-700">{selectedLog.user_email || '-'}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">IP 位址</label>
                  <div className="mt-1 text-sm text-gray-700">{selectedLog.ip_address || '-'}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">時間</label>
                  <div className="mt-1 text-sm text-gray-700">{formatDateTime(selectedLog.created_at)}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-400">方法</label>
                  <div className="mt-1 text-sm text-gray-700">{selectedLog.method || '-'}</div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">訊息</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-800">
                  {selectedLog.message}
                </div>
              </div>

              {selectedLog.path && (
                <div>
                  <label className="text-xs text-gray-400">路徑</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-800 font-mono">
                    {selectedLog.path}
                  </div>
                </div>
              )}

              {selectedLog.error_type && (
                <div>
                  <label className="text-xs text-gray-400">錯誤類型</label>
                  <div className="mt-1 text-sm text-gray-700">{selectedLog.error_type}</div>
                </div>
              )}

              {selectedLog.stack_trace && (
                <div>
                  <label className="text-xs text-gray-400">堆疊追蹤</label>
                  <pre className="mt-1 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-x-auto max-h-40">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <label className="text-xs text-gray-400">瀏覽器</label>
                  <div className="mt-1 text-xs text-gray-500 break-all">{selectedLog.user_agent}</div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setSelectedLog(null)}
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
