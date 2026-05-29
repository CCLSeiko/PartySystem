'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  HeartHandshake,
  Repeat,
  User,
  ArrowLeft,
  Receipt,
  Settings,
  FileText,
  Users,
  BarChart3,
  ScrollText,
  DollarSign,
  Shield,
} from 'lucide-react';

// Sidebar item type
interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// Member sidebar items
const memberItems: SidebarItem[] = [
  { label: '儀表板', href: '/member/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: '捐款記錄', href: '/member/donations', icon: <Receipt className="w-5 h-5" /> },
  { label: '定期定額', href: '/member/subscriptions', icon: <Repeat className="w-5 h-5" /> },
  { label: '個人設定', href: '/member/profile', icon: <User className="w-5 h-5" /> },
];

// Admin sidebar items
const adminItems: SidebarItem[] = [
  { label: '管理儀表板', href: '/admin/dashboard', icon: <BarChart3 className="w-5 h-5" /> },
  { label: '捐款管理', href: '/admin/donations', icon: <HeartHandshake className="w-5 h-5" /> },
  { label: '使用者管理', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
  { label: '定期定額', href: '/admin/subscriptions', icon: <Repeat className="w-5 h-5" /> },
  { label: '對帳管理', href: '/admin/reconciliation', icon: <ScrollText className="w-5 h-5" /> },
  { label: '稅務報表', href: '/admin/tax', icon: <FileText className="w-5 h-5" /> },
  { label: '系統設定', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
];

// Donation maintainer sidebar items (limited access)
const maintainerItems: SidebarItem[] = [
  { label: '捐款儀表板', href: '/maintainer/dashboard', icon: <BarChart3 className="w-5 h-5" /> },
  { label: '捐款管理', href: '/maintainer/donations', icon: <HeartHandshake className="w-5 h-5" /> },
  { label: '手動登錄捐款', href: '/maintainer/donations/new', icon: <DollarSign className="w-5 h-5" /> },
  { label: '捐款人管理', href: '/maintainer/donors', icon: <Users className="w-5 h-5" /> },
  { label: '定期定額', href: '/maintainer/subscriptions', icon: <Repeat className="w-5 h-5" /> },
];

function SidebarContent({ items, title, icon }: { items: SidebarItem[]; title: string; icon: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> 回到首頁
        </Link>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          {icon}
          {title}
        </h2>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MemberSidebar() {
  return <SidebarContent items={memberItems} title="會員中心" icon={<HeartHandshake className="w-5 h-5 text-rose-500" />} />;
}

export function AdminSidebar() {
  return <SidebarContent items={adminItems} title="管理後台" icon={<Shield className="w-5 h-5 text-amber-500" />} />;
}

export function MaintainerSidebar() {
  return <SidebarContent items={maintainerItems} title="捐款維護" icon={<DollarSign className="w-5 h-5 text-emerald-500" />} />;
}
