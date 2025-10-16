'use client';

import { useState } from 'react';

type MenuItem = {
  id: string;
  label: string;
  icon?: string;
};

const menuItems: MenuItem[] = [
  { id: 'jobs', label: '案件一覧', icon: '📋' },
  // 将来的に他のメニューを追加
];

export default function Sidebar() {
  const [activeMenu, setActiveMenu] = useState('jobs');

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeMenu === item.id
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
