'use client';

import { useState } from 'react';

type SearchBarProps = {
  onSearch: (query: string) => void;
  onSkillFilter: (skills: string[]) => void;
  onPositionFilter: (positions: string[]) => void;
};

const availableSkills = [
  'React',
  'TypeScript',
  'Next.js',
  'Go',
  'PostgreSQL',
  'Docker',
  'Node.js',
  'AWS',
  'Python',
  'Django',
  'Vue.js',
  'Nuxt.js',
];

const availablePositions = [
  'フロントエンドエンジニア',
  'バックエンドエンジニア',
  'フルスタックエンジニア',
];

export default function SearchBar({ onSearch, onSkillFilter, onPositionFilter }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

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

  const togglePosition = (position: string) => {
    const newPositions = selectedPositions.includes(position)
      ? selectedPositions.filter((p) => p !== position)
      : [...selectedPositions, position];
    setSelectedPositions(newPositions);
    onPositionFilter(newPositions);
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
        <p className="text-sm font-medium text-gray-700 mb-2">ポジションで絞り込み</p>
        <div className="flex gap-2 flex-wrap">
          {availablePositions.map((position) => (
            <button
              key={position}
              onClick={() => togglePosition(position)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedPositions.includes(position)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {position}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">スキルで絞り込み</p>
        <div className="flex gap-2 flex-wrap">
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
