"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import SplitLayout from "@/components/SplitLayout";
import TalentSearchBar from "@/components/TalentSearchBar";

type Talent = {
  id: string;
  name: string | null;
  age: number | null;
  position: string | null;
  workStyle: string | null;
  location: string | null;
  unitPrice: number | null;
  summary: string | null;
  description: string | null;
  originalTitle: string | null;
  originalBody: string | null;
  senderEmail: string | null;
  receivedAt: Date;
  skills: string[];
};

type TalentsClientProps = {
  talents: Talent[];
  userRole: "admin" | "general";
};

export default function TalentsClient({ talents, userRole }: TalentsClientProps) {
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(talents[0] || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // 新しい順がデフォルト
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // サイドバー開閉状態
  const ITEMS_PER_PAGE = 50;
  const talentListRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === "admin";

  // ページ変更時にスクロールを一番上に戻す
  useEffect(() => {
    if (talentListRef.current) {
      talentListRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  const filteredAndSortedTalents = useMemo(() => {
    const result = talents.filter((talent) => {
      // キーワード検索（メール本文で検索）
      const matchesSearch =
        searchQuery === "" ||
        (talent.originalBody &&
          talent.originalBody.toLowerCase().includes(searchQuery.toLowerCase()));

      // 着信日フィルター
      let matchesDate = true;
      if (startDate !== null || endDate !== null) {
        const talentDate = new Date(talent.receivedAt);
        talentDate.setHours(0, 0, 0, 0); // 時刻を0時にリセット

        if (startDate !== null && endDate !== null) {
          // 両方指定されている場合
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // 終了日の23:59:59まで
          matchesDate = talentDate >= start && talentDate <= end;
        } else if (startDate !== null) {
          // 開始日のみ指定
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchesDate = talentDate >= start;
        } else if (endDate !== null) {
          // 終了日のみ指定
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = talentDate <= end;
        }
      }

      return matchesSearch && matchesDate;
    });

    // ソート処理
    result.sort((a, b) => {
      const dateA = new Date(a.receivedAt).getTime();
      const dateB = new Date(b.receivedAt).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [talents, searchQuery, startDate, endDate, sortOrder]);

  // ページネーション
  const totalPages = Math.ceil(filteredAndSortedTalents.length / ITEMS_PER_PAGE);
  const paginatedTalents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedTalents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedTalents, currentPage]);

  // フィルタ変更時にページを1にリセット
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebarはデスクトップのみ表示 */}
        <div className="hidden md:block">
          <Sidebar isAdmin={isAdmin} />
        </div>

        {/* モバイル用サイドバー（オーバーレイ） */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative w-64 h-full bg-white animate-slide-in-left">
              <Sidebar isAdmin={isAdmin} />
            </div>
          </div>
        )}

        <SplitLayout
          left={
            <div className="flex flex-col h-full">
              <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">タレント一覧</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {filteredAndSortedTalents.length}件
                    </span>
                    <select
                      value={sortOrder}
                      onChange={(e) =>
                        setSortOrder(e.target.value as "desc" | "asc")
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">新しい順</option>
                      <option value="asc">古い順</option>
                    </select>
                  </div>
                </div>
                <TalentSearchBar
                  onSearch={(query) => {
                    setSearchQuery(query);
                    handleFilterChange();
                  }}
                  onDateRangeFilter={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                    handleFilterChange();
                  }}
                />
              </div>
              <div
                ref={talentListRef}
                className="flex-1 overflow-y-auto p-6 pt-4 space-y-3"
              >
                {paginatedTalents.map((talent) => (
                  <div
                    key={talent.id}
                    onClick={() => setSelectedTalent(talent)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTalent?.id === talent.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 flex-1">
                        {talent.name || "名前未設定"}
                      </h3>
                      <span className="text-xs text-gray-400 ml-2">
                        {new Date(talent.receivedAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    {talent.position && (
                      <p className="text-sm text-gray-600 mt-1">
                        ポジション: {talent.position}
                      </p>
                    )}
                    {talent.age && (
                      <p className="text-sm text-gray-500 mt-1">
                        年齢: {talent.age}歳
                      </p>
                    )}
                    {talent.location && (
                      <p className="text-sm text-gray-500 mt-1">
                        希望勤務地: {talent.location}
                      </p>
                    )}
                    {isAdmin && talent.unitPrice && (
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        {talent.unitPrice}万円/月
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {talent.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages} ページ
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    次へ
                  </button>
                </div>
              )}
            </div>
          }
          right={
            <div className="p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                タレント詳細
              </h2>
              {selectedTalent && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedTalent.name || "名前未設定"}
                    </h3>
                    {selectedTalent.position && (
                      <p className="text-gray-600 mt-2">
                        ポジション: {selectedTalent.position}
                      </p>
                    )}
                    {selectedTalent.age && (
                      <p className="text-gray-600 mt-1">
                        年齢: {selectedTalent.age}歳
                      </p>
                    )}
                    {selectedTalent.workStyle && (
                      <p className="text-gray-600 mt-1">
                        勤務形態: {selectedTalent.workStyle}
                      </p>
                    )}
                    {selectedTalent.location && (
                      <p className="text-gray-500 mt-1">
                        希望勤務地: {selectedTalent.location}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      ID: {selectedTalent.id}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      着信日:{" "}
                      {new Date(selectedTalent.receivedAt).toLocaleDateString(
                        "ja-JP",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </p>
                    {isAdmin && selectedTalent.unitPrice && (
                      <p className="text-lg font-semibold text-green-600 mt-2">
                        {selectedTalent.unitPrice}万円/月
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      スキル ({selectedTalent.skills.length}件)
                    </h4>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {selectedTalent.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedTalent.summary && (
                    <div>
                      <h4 className="font-semibold text-gray-900">経歴概要</h4>
                      <p className="text-gray-700 mt-2">{selectedTalent.summary}</p>
                    </div>
                  )}
                  {selectedTalent.description && (
                    <div>
                      <h4 className="font-semibold text-gray-900">詳細経歴</h4>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                        {selectedTalent.description}
                      </p>
                    </div>
                  )}
                  {isAdmin && (
                    <>
                      <div className="border-t pt-4 mt-6">
                        <h4 className="font-semibold text-red-700 mb-2">
                          【管理者専用情報】
                        </h4>
                      </div>
                      {selectedTalent.originalTitle && (
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            元のメール件名
                          </h4>
                          <p className="text-gray-700 mt-2">
                            {selectedTalent.originalTitle}
                          </p>
                        </div>
                      )}
                      {selectedTalent.senderEmail && (
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            送信者
                          </h4>
                          <p className="text-gray-700 mt-2">
                            {selectedTalent.senderEmail}
                          </p>
                        </div>
                      )}
                      {selectedTalent.originalBody && (
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            元のメール本文
                          </h4>
                          <p className="text-gray-700 mt-2 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
                            {selectedTalent.originalBody}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
