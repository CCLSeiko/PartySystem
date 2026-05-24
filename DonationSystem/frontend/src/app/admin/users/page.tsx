'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AdminUser, PaginatedResponse } from '@/types';
import { DataTable, Pagination, StatusBadge, LoadingSpinner } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Search, ToggleLeft, ToggleRight, CheckCircle, XCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    loadUsers();
  }, [page, activeFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      const params: { q?: string; is_active?: boolean; page: number; per_page: number } = {
        page,
        per_page: 15,
      };
      if (search) params.q = search;
      if (activeFilter !== '') params.is_active = activeFilter === 'active';
      const result = await api.adminGetUsers(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load users', err);
      setPageError(err instanceof Error ? err.message : '載入使用者失敗');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setPage(1);
    loadUsers();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  async function toggleUserStatus(user: AdminUser) {
    try {
      setToggling(user.id);
      await api.adminToggleUserStatus(user.id, !user.is_active);
      await loadUsers();
    } catch (err) {
      console.error('Failed to toggle user status', err);
    } finally {
      setToggling(null);
    }
  }

  const columns = [
    {
      key: 'name',
      header: '姓名',
      render: (item: AdminUser) => (
        <span className="font-medium text-gray-900">{item.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'total_donated',
      header: '總捐款',
      render: (item: AdminUser) => formatCurrency(item.total_donated ?? 0),
      className: 'font-medium',
    },
    {
      key: 'has_active_subscription',
      header: '定期定額',
      render: (item: AdminUser) => item.has_active_subscription ? (
        <span className="text-green-600 text-xs font-medium">✓ 啟用中</span>
      ) : (
        <span className="text-gray-400 text-xs">無</span>
      ),
    },
    {
      key: 'is_active',
      header: '狀態',
      render: (item: AdminUser) => (
        <StatusBadge status={item.is_active ? 'active' : 'paused'} />
      ),
    },
    {
      key: 'created_at',
      header: '註冊日期',
      render: (item: AdminUser) => formatDate(item.created_at),
    },
    {
      key: 'actions',
      header: '操作',
      render: (item: AdminUser) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleUserStatus(item);
          }}
          disabled={toggling === item.id}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            item.is_active
              ? 'text-red-600 border-red-200 hover:bg-red-50'
              : 'text-green-600 border-green-200 hover:bg-green-50'
          } disabled:opacity-50`}
        >
          {toggling === item.id ? (
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : item.is_active ? (
            <XCircle className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          {item.is_active ? '停用' : '啟用'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">使用者管理</h1>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm font-medium text-gray-600 mb-1">搜尋</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="姓名或 Email"
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">啟用狀態</label>
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
          >
            <option value="">全部</option>
            <option value="active">啟用中</option>
            <option value="inactive">已停用</option>
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600"
        >
          搜尋
        </button>
      </div>

      {/* Table */}
      {pageError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{pageError}</div>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data || []}
            emptyMessage="尚無使用者資料"
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
