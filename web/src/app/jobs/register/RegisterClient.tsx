'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { createJob } from './actions';

const gradeOptions = [
  { value: 'SE', label: 'SE' },
  { value: 'チームリーダー', label: 'チームリーダー' },
  { value: 'テックリード', label: 'テックリード' },
  { value: 'PMO', label: 'PMO' },
  { value: 'PM', label: 'PM' },
];

const availableSkills = [
  'React',
  'TypeScript',
  'Next.js',
  'Vue.js',
  'Nuxt.js',
  'Go',
  'Python',
  'Node.js',
  'Django',
  'PostgreSQL',
  'MySQL',
  'Docker',
  'Kubernetes',
  'AWS',
];

export default function RegisterClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set('skills', selectedSkills.join(','));

    try {
      await createJob(formData);
      router.push('/jobs');
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('案件の登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isAdmin={true} />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">案件手動登録</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 公開用タイトル */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  公開用タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="React/TypeScript フロントエンドエンジニア"
                />
              </div>

              {/* 企業名 */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  企業名
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="株式会社サンプル"
                />
              </div>

              {/* ポジション */}
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  ポジション
                </label>
                <select
                  id="grade"
                  name="grade"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {gradeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 勤務地 */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  勤務地
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="東京都渋谷区"
                />
              </div>

              {/* 単価 */}
              <div>
                <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-2">
                  単価（円/月）
                </label>
                <input
                  type="number"
                  id="unitPrice"
                  name="unitPrice"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="800000"
                />
              </div>

              {/* 概要 */}
              <div>
                <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
                  概要
                </label>
                <textarea
                  id="summary"
                  name="summary"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="大規模Webアプリケーションのフロントエンド開発"
                />
              </div>

              {/* 詳細 */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  詳細
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="詳細な案件説明..."
                />
              </div>

              {/* スキル選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">スキル</label>
                <div className="flex gap-2 flex-wrap p-4 border border-gray-300 rounded-lg">
                  {availableSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
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

              {/* 原文タイトル */}
              <div>
                <label htmlFor="originalTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  元のメール件名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="originalTitle"
                  name="originalTitle"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="【急募】React/TS エンジニア募集"
                />
              </div>

              {/* 原文本文 */}
              <div>
                <label htmlFor="originalBody" className="block text-sm font-medium text-gray-700 mb-2">
                  元のメール本文 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="originalBody"
                  name="originalBody"
                  required
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="元のメール本文..."
                />
              </div>

              {/* 送信者メール */}
              <div>
                <label htmlFor="senderEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  送信者メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="senderEmail"
                  name="senderEmail"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="partner@example.com"
                />
              </div>

              {/* 受信日時 */}
              <div>
                <label htmlFor="receivedAt" className="block text-sm font-medium text-gray-700 mb-2">
                  受信日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="receivedAt"
                  name="receivedAt"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 送信ボタン */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? '登録中...' : '登録する'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/jobs')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
