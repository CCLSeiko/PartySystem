import { cn, getStatusColor } from '@/lib/utils';

// --- Status Badge ---
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', getStatusColor(status))}>
      {status === 'pending' && '待處理'}
      {status === 'success' && '成功'}
      {status === 'failed' && '失敗'}
      {status === 'cancelled' && '已取消'}
      {status === 'active' && '啟用中'}
      {status === 'paused' && '已暫停'}
      {status === 'expired' && '已到期'}
      {status === 'confirmed' && '已確認'}
      {status === 'generated' && '已產生'}
      {status === 'processing' && '處理中'}
      {status === 'completed' && '已完成'}
      {!['pending', 'success', 'failed', 'cancelled', 'active', 'paused', 'expired', 'confirmed', 'generated', 'processing', 'completed'].includes(status) && status}
    </span>
  );
}

// --- Stats Card ---
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; isUp: boolean };
}

export function StatsCard({ title, value, subtitle, icon, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {trend && (
        <div className={cn('text-sm mt-1', trend.isUp ? 'text-green-600' : 'text-red-600')}>
          {trend.isUp ? '↑' : '↓'} {trend.value}%
        </div>
      )}
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

// --- Data Table ---
interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = '尚無資料',
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-12 text-center text-gray-400">載入中...</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-12 text-center text-gray-400">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, i) => (
              <tr
                key={(item as { id?: string }).id || i}
                className={cn('hover:bg-gray-50 transition-colors', onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-6 py-4 text-sm text-gray-700', col.className)}>
                    {col.render ? col.render(item) : String((item as Record<string, any>)[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Pagination ---
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        上一頁
      </button>
      <span className="text-sm text-gray-500 px-3">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        下一頁
      </button>
    </div>
  );
}

// --- Empty State ---
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16">
      {icon && <div className="flex justify-center mb-4 text-gray-300">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-600 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-6">{description}</p>}
      {action}
    </div>
  );
}

// --- Loading spinner ---
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex justify-center items-center p-8">
      <div className={cn('animate-spin rounded-full border-2 border-gray-200 border-t-rose-500', sizeMap[size])} />
    </div>
  );
}

// --- Card ---
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
      {children}
    </div>
  );
}
