'use client';

import { ReactNode } from 'react';

type SplitLayoutProps = {
  left: ReactNode;
  right: ReactNode;
};

export default function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 左側：モバイルでは全幅、デスクトップでは半分 */}
      <div className="w-full md:w-1/2 border-r border-gray-200 overflow-y-auto">
        {left}
      </div>
      {/* 右側：モバイルでは非表示、デスクトップで表示 */}
      <div className="hidden md:block md:w-1/2 overflow-y-auto bg-gray-50">
        {right}
      </div>
    </div>
  );
}
