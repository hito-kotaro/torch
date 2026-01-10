"use client";

import { UserButton } from "@clerk/nextjs";
import Image from "next/image";

type HeaderProps = {
  onMenuClick?: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* モバイルでのみハンバーガーメニューを表示 */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden text-gray-700 hover:text-gray-900"
            aria-label="メニュー"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2">
          <Image
            src="/torch-icon.svg"
            alt="Torch"
            width={48}
            height={48}
            className="h-10 w-10"
            priority
          />
          <span className="text-xl font-bold text-gray-900">Torch</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
