'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  grade: string | null;
  unitPrice: number | null;
  receivedAt: Date;
  skills: string[];
};

type AnalyticsClientProps = {
  jobs: Job[];
  userRole: 'admin' | 'general';
};

export default function AnalyticsClient({ jobs, userRole }: AnalyticsClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const isAdmin = userRole === 'admin';

  // 日付範囲でフィルタ
  const filteredJobs = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (dateRange) {
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        return jobs;
    }

    return jobs.filter(job => new Date(job.receivedAt) >= cutoffDate);
  }, [jobs, dateRange]);

  // 日別の案件数を集計
  const dailyStats = useMemo(() => {
    const stats: Record<string, number> = {};

    filteredJobs.forEach(job => {
      const date = new Date(job.receivedAt).toLocaleDateString('ja-JP');
      stats[date] = (stats[date] || 0) + 1;
    });

    return Object.entries(stats)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-30); // 最新30日分
  }, [filteredJobs]);

  // スキル別の集計
  const skillStats = useMemo(() => {
    const stats: Record<string, number> = {};

    filteredJobs.forEach(job => {
      job.skills.forEach(skill => {
        stats[skill] = (stats[skill] || 0) + 1;
      });
    });

    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // 上位20件
  }, [filteredJobs]);

  // ポジション別の集計
  const positionStats = useMemo(() => {
    const stats: Record<string, number> = {};

    filteredJobs.forEach(job => {
      const position = job.grade || '未設定';
      stats[position] = (stats[position] || 0) + 1;
    });

    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [filteredJobs]);

  // 単価の分布（管理者のみ）
  const priceStats = useMemo(() => {
    if (!isAdmin) return null;

    const priceRanges: Record<string, number> = {
      '40万円未満': 0,
      '40-60万円': 0,
      '60-80万円': 0,
      '80-100万円': 0,
      '100万円以上': 0,
    };

    filteredJobs.forEach(job => {
      if (!job.unitPrice) return;

      if (job.unitPrice < 40) priceRanges['40万円未満']++;
      else if (job.unitPrice < 60) priceRanges['40-60万円']++;
      else if (job.unitPrice < 80) priceRanges['60-80万円']++;
      else if (job.unitPrice < 100) priceRanges['80-100万円']++;
      else priceRanges['100万円以上']++;
    });

    return Object.entries(priceRanges);
  }, [filteredJobs, isAdmin]);

  const maxDailyCount = Math.max(...dailyStats.map(([, count]) => count), 1);
  const maxSkillCount = Math.max(...skillStats.map(([, count]) => count), 1);

  return (
    <div className="h-screen flex flex-col">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        {/* デスクトップ用サイドバー */}
        <div className="hidden md:block">
          <Sidebar isAdmin={isAdmin} />
        </div>

        {/* モバイル用サイドバー */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)} />
            <div className="relative w-64 h-full bg-white animate-slide-in-left">
              <Sidebar isAdmin={isAdmin} />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {/* ヘッダー */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">案件分析</h1>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7days">過去7日間</option>
                <option value="30days">過去30日間</option>
                <option value="90days">過去90日間</option>
                <option value="all">全期間</option>
              </select>
            </div>

            {/* サマリーカード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 mb-1">総案件数</p>
                <p className="text-3xl font-bold text-gray-900">{filteredJobs.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 mb-1">1日平均</p>
                <p className="text-3xl font-bold text-gray-900">
                  {dailyStats.length > 0
                    ? Math.round(filteredJobs.length / dailyStats.length * 10) / 10
                    : 0}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 mb-1">使用スキル数</p>
                <p className="text-3xl font-bold text-gray-900">{skillStats.length}</p>
              </div>
            </div>

            {/* 日別案件数グラフ */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">日別案件着信数</h2>
              <div className="space-y-2">
                {dailyStats.map(([date, count]) => (
                  <div key={date} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-24">{date}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(count / maxDailyCount) * 100}%` }}
                      >
                        <span className="text-xs text-white font-semibold">{count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* スキル分布 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">スキル別案件数（Top 20）</h2>
                <div className="space-y-2">
                  {skillStats.map(([skill, count]) => (
                    <div key={skill} className="flex items-center gap-4">
                      <span className="text-sm text-gray-700 w-32 truncate">{skill}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-5">
                        <div
                          className="bg-green-500 h-5 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${(count / maxSkillCount) * 100}%` }}
                        >
                          <span className="text-xs text-white font-semibold">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ポジション分布 */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">ポジション別案件数</h2>
                <div className="space-y-4">
                  {positionStats.map(([position, count]) => (
                    <div key={position}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{position}</span>
                        <span className="text-sm text-gray-600">{count}件</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-purple-500 h-4 rounded-full"
                          style={{ width: `${(count / filteredJobs.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 単価分布（管理者のみ） */}
              {isAdmin && priceStats && (
                <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">単価分布</h2>
                  <div className="grid grid-cols-5 gap-4">
                    {priceStats.map(([range, count]) => (
                      <div key={range} className="text-center">
                        <div className="bg-gray-200 rounded-lg p-4 mb-2">
                          <p className="text-2xl font-bold text-gray-900">{count}</p>
                        </div>
                        <p className="text-sm text-gray-600">{range}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
