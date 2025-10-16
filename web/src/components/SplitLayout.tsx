'use client';

import { ReactNode } from 'react';

type SplitLayoutProps = {
  left: ReactNode;
  right: ReactNode;
};

export default function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
        {left}
      </div>
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        {right}
      </div>
    </div>
  );
}
