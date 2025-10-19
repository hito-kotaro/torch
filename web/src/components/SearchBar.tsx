'use client';

import { useState } from 'react';

type SearchBarProps = {
  onSearch: (query: string) => void;
  onGradeFilter: (grades: string[]) => void;
  onIdSearch: (id: string) => void;
};

const availableGrades = [
  { value: 'SE', label: 'SE' },
  { value: 'チームリーダー', label: 'チームリーダー' },
  { value: 'テックリード', label: 'テックリード' },
  { value: 'PMO', label: 'PMO' },
  { value: 'PM', label: 'PM' },
];

export default function SearchBar({ onSearch, onGradeFilter, onIdSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [idQuery, setIdQuery] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

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
        <p className="text-sm font-medium text-gray-700 mb-2">ポジションで絞り込み</p>
        <div className="flex gap-2 flex-wrap">
          {availableGrades.map((grade) => (
            <button
              key={grade.value}
              onClick={() => toggleGrade(grade.value)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedGrades.includes(grade.value)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {grade.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
