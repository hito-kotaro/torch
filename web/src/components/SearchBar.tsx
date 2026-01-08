"use client";

import { useState } from "react";

type SearchBarProps = {
  onSearch: (query: string) => void;
  onGradeFilter: (grades: string[]) => void;
  onIdSearch: (id: string) => void;
  onUnitPriceFilter?: (min: number | null, max: number | null) => void;
  onDateRangeFilter?: (
    startDate: string | null,
    endDate: string | null
  ) => void;
  onSkillFilter?: (skills: string[]) => void;
};

const availableGrades = [
  { value: "SE", label: "SE" },
  { value: "チームリーダー", label: "チームリーダー" },
  { value: "テックリード", label: "テックリード" },
  { value: "PMO", label: "PMO" },
  { value: "PM", label: "PM" },
];

const availableSkills = [
  { value: "PM", label: "PM" },
  { value: "インフラ", label: "インフラ" },
  { value: "AWS", label: "AWS" },
  { value: "Java", label: "Java" },
  { value: "C#", label: "C#" },
  { value: "SAP", label: "SAP" },
];

export default function SearchBar({
  onSearch,
  onGradeFilter,
  onIdSearch,
  onUnitPriceFilter,
  onDateRangeFilter,
  onSkillFilter,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [idQuery, setIdQuery] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minUnitPrice, setMinUnitPrice] = useState<string>("");
  const [maxUnitPrice, setMaxUnitPrice] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateError, setDateError] = useState<string>("");
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIdQuery(value);
    onIdSearch(value);
  };

  const toggleGrade = (grade: string) => {
    const newGrades = selectedGrades.includes(grade)
      ? selectedGrades.filter((g) => g !== grade)
      : [...selectedGrades, grade];
    setSelectedGrades(newGrades);
    onGradeFilter(newGrades);
  };

  const toggleSkill = (skill: string) => {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(newSkills);
    if (onSkillFilter) {
      onSkillFilter(newSkills);
    }
  };

  const handleMinUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinUnitPrice(value);
    if (onUnitPriceFilter) {
      const numValue =
        value === ""
          ? null
          : isNaN(parseFloat(value))
          ? null
          : parseFloat(value);
      const maxValue =
        maxUnitPrice === ""
          ? null
          : isNaN(parseFloat(maxUnitPrice))
          ? null
          : parseFloat(maxUnitPrice);
      onUnitPriceFilter(numValue, maxValue);
    }
  };

  const handleMaxUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxUnitPrice(value);
    if (onUnitPriceFilter) {
      const numValue =
        value === ""
          ? null
          : isNaN(parseFloat(value))
          ? null
          : parseFloat(value);
      const minValue =
        minUnitPrice === ""
          ? null
          : isNaN(parseFloat(minUnitPrice))
          ? null
          : parseFloat(minUnitPrice);
      onUnitPriceFilter(minValue, numValue);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartDate(value);
    setDateError("");

    if (onDateRangeFilter) {
      if (value && endDate && value > endDate) {
        setDateError("終了日は開始日以降の日付を選択してください");
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
        setDateError("終了日は開始日以降の日付を選択してください");
        return;
      }
      onDateRangeFilter(startDate || null, value || null);
    }
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

  const handleQuickDateRange = (range: "week" | "month" | "3months") => {
    switch (range) {
      case "week":
        setDateRange(6); // 今日を含めて7日間（0日目から6日目）
        break;
      case "month":
        setDateRange(29); // 今日を含めて30日間（0日目から29日目）
        break;
      case "3months":
        setDateRange(89); // 今日を含めて90日間（0日目から89日目）
        break;
    }
  };

  const handleReset = () => {
    // すべての状態をリセット
    setSearchQuery("");
    setIdQuery("");
    setSelectedGrades([]);
    setSelectedSkills([]);
    setMinUnitPrice("");
    setMaxUnitPrice("");
    setStartDate("");
    setEndDate("");
    setDateError("");

    // 親コンポーネントにリセットを通知
    onSearch("");
    onIdSearch("");
    onGradeFilter([]);
    if (onSkillFilter) {
      onSkillFilter([]);
    }
    if (onUnitPriceFilter) {
      onUnitPriceFilter(null, null);
    }
    if (onDateRangeFilter) {
      onDateRangeFilter(null, null);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div>
        <input
          type="text"
          placeholder="案件を検索..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <input
          type="text"
          placeholder="案件IDで検索..."
          value={idQuery}
          onChange={handleIdChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {/* 詳細条件セクション */}
      <div className="border border-gray-200 rounded-lg">
        <div className="flex items-center">
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="flex-1 px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-l-lg"
          >
            <span className="text-sm font-medium text-gray-700">詳細条件</span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                isDetailsOpen ? "transform rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-l border-gray-200 rounded-r-lg"
            title="すべてのフィルターをリセット"
          >
            リセット
          </button>
        </div>
        {isDetailsOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                ポジションで絞り込み
              </p>
              <div className="flex gap-2 flex-wrap">
                {availableGrades.map((grade) => (
                  <button
                    key={grade.value}
                    onClick={() => toggleGrade(grade.value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedGrades.includes(grade.value)
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {grade.label}
                  </button>
                ))}
              </div>
            </div>
            {onSkillFilter && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  スキルで絞り込み
                </p>
                <div className="flex gap-2 flex-wrap">
                  {availableSkills.map((skill) => (
                    <button
                      key={skill.value}
                      onClick={() => toggleSkill(skill.value)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedSkills.includes(skill.value)
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {skill.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {onUnitPriceFilter && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  単価で絞り込み（万円/月）
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="下限"
                    value={minUnitPrice}
                    onChange={handleMinUnitPriceChange}
                    min="0"
                    step="1"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">〜</span>
                  <input
                    type="number"
                    placeholder="上限"
                    value={maxUnitPrice}
                    onChange={handleMaxUnitPriceChange}
                    min="0"
                    step="1"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">万円</span>
                </div>
              </div>
            )}
            {onDateRangeFilter && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  着信日で絞り込み
                </p>
                <div className="flex gap-2 flex-wrap mb-2">
                  <button
                    onClick={() => handleQuickDateRange("week")}
                    className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    直近1週間
                  </button>
                  <button
                    onClick={() => handleQuickDateRange("month")}
                    className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    直近1ヶ月
                  </button>
                  <button
                    onClick={() => handleQuickDateRange("3months")}
                    className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    直近3ヶ月
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      dateError ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  <span className="text-gray-500">〜</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      dateError ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                </div>
                {dateError && (
                  <p className="text-sm text-red-600 mt-1">{dateError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
