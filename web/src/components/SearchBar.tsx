"use client";

import { useState } from "react";

type SearchBarProps = {
  onSearch: (query: string) => void;
  onGradeFilter: (grades: string[]) => void;
  onIdSearch: (id: string) => void;
  onUnitPriceFilter?: (min: number | null, max: number | null) => void;
};

const availableGrades = [
  { value: "SE", label: "SE" },
  { value: "チームリーダー", label: "チームリーダー" },
  { value: "テックリード", label: "テックリード" },
  { value: "PMO", label: "PMO" },
  { value: "PM", label: "PM" },
];

export default function SearchBar({
  onSearch,
  onGradeFilter,
  onIdSearch,
  onUnitPriceFilter,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [idQuery, setIdQuery] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [minUnitPrice, setMinUnitPrice] = useState<string>("");
  const [maxUnitPrice, setMaxUnitPrice] = useState<string>("");

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
    </div>
  );
}
