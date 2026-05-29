'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DataTable, Pagination, LoadingSpinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { Search, Plus, Pencil, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface Donor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  total_donations?: number;
  has_active_subscription?: boolean;
  created_at: string;
  is_active: boolean;
}

export default function MaintainerDonorsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ data: Donor[]; pagination: { page: number; per_page: number; total: number; total_pages: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDonors = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | undefined> = { page, per_page: 15 };
      if (search) params.q = search;
      const result = await api.maintenanceGetDonors(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load donors', err);
      setMessage({ type: 'error', text: '無法載入捐款人列表' });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadDonors();
  }, [loadDonors]);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleReset() {
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確定要刪除捐款人「${name}」嗎？此操作無法還原。`)) return;
    try {
      await api.maintenanceDeleteDonor(id);
      setMessage({ type: 'success', text: `捐款人「${name}」已刪除` });
      loadDonors();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '刪除失敗' });
    }
  }

  const columns = [
    {
      key: 'name',
      header: '姓名',
      render: (item: Donor) => (
        <button
          onClick={() => router.push(`/maintainer/donors/${item.id}`)}
          className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
        >
          {item.name}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (item: Donor) => item.email || '-',
    },
    {
      key: 'phone',
      header: '電話',
      render: (item: Donor) => item.phone || '-',
    },
    {
      key: 'total_donations',
      header: '捐款筆數',
      render: (item: Donor) => item.total_donations ?? '-',
      className: 'text-center',
    },
    {
      key: 'created_at',
      header: '建立日期',
      render: (item: Donor) => formatDate(item.created_at),
    },
    {
      key: 'actions',
      header: '操作',
      render: (item: Donor) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/maintainer/donors/${item.id}`)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="編輯"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(item.id, item.name)}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="刪除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">捐款人管理</h1>
          <p className="text-sm text-gray-500 mt-1">檢視和管理所有捐款人資料</p>
        </div>
        <button
          onClick={() => router.push('/maintainer/donors/new')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增捐款人
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          )}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {message.text}
          </p>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜尋姓名或 Email..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600"
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

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            emptyMessage="尚無捐款人資料"
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
