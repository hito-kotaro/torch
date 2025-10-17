'use client';

import { useState } from 'react';

type SearchBarProps = {
  onSearch: (query: string) => void;
  onSkillFilter: (skills: string[]) => void;
  onGradeFilter: (grades: string[]) => void;
  availableSkills: string[];
};

const availableGrades = [
  { value: 'S1', label: 'S1:サポート前提' },
  { value: 'S2', label: 'S2:単独作業' },
  { value: 'S3', label: 'S3:メンター' },
  { value: 'S4', label: 'S4:主力' },
  { value: 'S5', label: 'S5:リーダー' },
  { value: 'SS', label: 'SS:テックリード' },
  { value: 'MG', label: 'MG:マネージャー' },
];

export default function SearchBar({ onSearch, onSkillFilter, onGradeFilter, availableSkills }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const toggleSkill = (skill: string) => {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(newSkills);
    onSkillFilter(newSkills);
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
        <p className="text-sm font-medium text-gray-700 mb-2">グレードで絞り込み</p>
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
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">
            スキルで絞り込み ({availableSkills.length}件)
          </p>
          <button
            onClick={() => setIsSkillsExpanded(!isSkillsExpanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isSkillsExpanded ? '折りたたむ ▲' : '展開する ▼'}
          </button>
        </div>
        <div className={`flex gap-2 flex-wrap transition-all ${isSkillsExpanded ? 'max-h-[500px] overflow-y-auto' : 'max-h-[120px] overflow-hidden'}`}>
          {availableSkills.map((skill) => (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedSkills.includes(skill)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
