'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MenuItem = {
  id: string;
  label: string;
  icon?: string;
  href: string;
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  { id: 'jobs', label: '案件一覧', icon: '📋', href: '/jobs' },
  { id: 'register', label: '手動登録', icon: '✏️', href: '/jobs/register', adminOnly: true },
];

type SidebarProps = {
  isAdmin: boolean;
};

export default function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();

  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 p-4">
      <nav className="space-y-2">
        {visibleMenuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
              pathname === item.href
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
