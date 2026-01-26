"use client";

import { useState } from "react";

type TalentSearchBarProps = {
  onSearch: (query: string) => void;
  onDateRangeFilter: (
    startDate: string | null,
    endDate: string | null
  ) => void;
};

export default function TalentSearchBar({
  onSearch,
  onDateRangeFilter,
}: TalentSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateError, setDateError] = useState<string>("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  // ローカルタイムゾーンで日付文字列（YYYY-MM-DD）を取得
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const setDateRange = (days: number) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - days);

    // ローカルタイムゾーンで日付文字列を取得
    const startDateStr = getLocalDateString(start);
    const endDateStr = getLocalDateString(today);

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    setDateError("");

    if (onDateRangeFilter) {
      onDateRangeFilter(startDateStr, endDateStr);
    }
  };

  const handleQuickDateRange = (range: "1day" | "3days" | "1week" | "1month") => {
    switch (range) {
      case "1day":
        setDateRange(1); // 1日前から今日まで
        break;
      case "3days":
        setDateRange(3); // 3日前から今日まで
        break;
      case "1week":
        setDateRange(7); // 1週間前から今日まで
        break;
      case "1month":
        setDateRange(30); // 1ヶ月前から今日まで
        break;
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartDate(value);
    setDateError("");

    if (onDateRangeFilter) {
      if (value && endDate && value > endDate) {
        setDateError("開始日は終了日より前である必要があります");
        onDateRangeFilter(null, null);
        return;
      }
      onDateRangeFilter(value || null, endDate || null);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndDate(value);
    setDateError("");

    if (onDateRangeFilter) {
      if (value && startDate && value < startDate) {
        setDateError("終了日は開始日以降である必要があります");
        onDateRangeFilter(null, null);
        return;
      }
      onDateRangeFilter(startDate || null, value || null);
    }
  };

  const handleReset = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setDateError("");
    onSearch("");
    onDateRangeFilter(null, null);
  };

  return (
    <div className="space-y-4">
      {/* キーワード検索 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          キーワード検索（メール本文）
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="メール本文から検索..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 着信日絞り込み */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          着信日で絞り込み
        </label>
        <div className="flex gap-2 flex-wrap mb-2">
          <button
            onClick={() => handleQuickDateRange("1day")}
            className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            1日前
          </button>
          <button
            onClick={() => handleQuickDateRange("3days")}
            className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            3日前
          </button>
          <button
            onClick={() => handleQuickDateRange("1week")}
            className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            1週間前
          </button>
          <button
            onClick={() => handleQuickDateRange("1month")}
            className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            1ヶ月前
          </button>
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dateError ? "border-red-500" : "border-gray-300"
              }`}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dateError ? "border-red-500" : "border-gray-300"
              }`}
            />
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border border-gray-300 rounded-lg"
            title="すべてのフィルターをリセット"
          >
            リセット
          </button>
        </div>
        {dateError && (
          <p className="text-red-500 text-xs mt-1">{dateError}</p>
        )}
      </div>
    </div>
  );
}
