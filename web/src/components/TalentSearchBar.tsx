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

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartDate(value);
    setDateError("");

    if (onDateRangeFilter) {
      const start = value === "" ? null : value;
      const end = endDate === "" ? null : endDate;

      // 日付の妥当性チェック
      if (start && end && start > end) {
        setDateError("開始日は終了日より前である必要があります");
        onDateRangeFilter(null, null);
        return;
      }

      onDateRangeFilter(start, end);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndDate(value);
    setDateError("");

    if (onDateRangeFilter) {
      const start = startDate === "" ? null : startDate;
      const end = value === "" ? null : value;

      // 日付の妥当性チェック
      if (start && end && start > end) {
        setDateError("開始日は終了日より前である必要があります");
        onDateRangeFilter(null, null);
        return;
      }

      onDateRangeFilter(start, end);
    }
  };

  return (
    <div className="space-y-4">
      {/* キーワード検索 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          キーワード検索
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="名前、スキル、経歴などで検索..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 着信日絞り込み */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          着信日で絞り込み
        </label>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {dateError && (
          <p className="text-red-500 text-xs mt-1">{dateError}</p>
        )}
      </div>
    </div>
  );
}
