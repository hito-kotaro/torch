'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

function RunAggregateButton({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/aggregate', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : '集計に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '集計中...' : '今すぐ集計'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

type SnapshotData = {
  id: string;
  period: string;
  aggregatedAt: Date;
  totalCount: number;
  dailyStats: unknown;
  skillStats: unknown;
  positionStats: unknown;
  priceStats: unknown;
};

type AnalyticsClientProps = {
  period: '7d' | '30d' | '90d' | 'all';
  snapshot: SnapshotData | null;
  userRole: 'admin' | 'general';
};

function ensureStatsArray(v: unknown): [string, number][] {
  if (Array.isArray(v) && v.every((e) => Array.isArray(e) && e.length === 2)) {
    return v as [string, number][];
  }
  return [];
}

export default function AnalyticsClient({
  period,
  snapshot,
  userRole,
}: AnalyticsClientProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  const dailyStats = snapshot ? ensureStatsArray(snapshot.dailyStats) : [];
  const skillStats = snapshot ? ensureStatsArray(snapshot.skillStats) : [];
  const positionStats = snapshot ? ensureStatsArray(snapshot.positionStats) : [];
  const priceStats = snapshot && isAdmin ? ensureStatsArray(snapshot.priceStats) : null;

  const totalCount = snapshot?.totalCount ?? 0;
  const maxDailyCount = Math.max(...dailyStats.map(([, c]) => c), 1);
  const maxSkillCount = Math.max(...skillStats.map(([, c]) => c), 1);
  const dailyAvg =
    dailyStats.length > 0 ? Math.round((totalCount / dailyStats.length) * 10) / 10 : 0;

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as '7d' | '30d' | '90d' | 'all';
    router.push(`/analytics?period=${next}`);
  };

  if (!snapshot) {
    return (
      <div className="h-screen flex flex-col">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden md:block">
            <Sidebar isAdmin={isAdmin} />
          </div>
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
          <main className="flex-1 overflow-y-auto p-8 bg-gray-50 flex items-center justify-center">
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">案件分析</h1>
              <p className="text-gray-600 mb-4">
                集計データがありません。バッチ実行後または「今すぐ集計」でご利用いただけます。
              </p>
              {isAdmin && (
                <RunAggregateButton onSuccess={() => router.refresh()} />
              )}
              {!isAdmin && (
                <p className="text-sm text-gray-500">
                  集計は定期バッチで実行されます。しばらくお待ちください。
                </p>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:block">
          <Sidebar isAdmin={isAdmin} />
        </div>
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

        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">案件分析</h1>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">
                  集計: {new Date(snapshot.aggregatedAt).toLocaleString('ja-JP')}
                </span>
                <select
                  value={period}
                  onChange={handlePeriodChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7d">過去7日間</option>
                  <option value="30d">過去30日間</option>
                  <option value="90d">過去90日間</option>
                  <option value="all">全期間</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 mb-1">総案件数</p>
                <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 mb-1">1日平均</p>
                <p className="text-3xl font-bold text-gray-900">{dailyAvg}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600 mb-1">使用スキル数</p>
                <p className="text-3xl font-bold text-gray-900">{skillStats.length}</p>
              </div>
            </div>

            {dailyStats.length > 0 && (
              <>
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    日別案件着信数（折れ線グラフ）
                  </h2>
                  <div className="h-64 relative">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 800 250"
                      preserveAspectRatio="none"
                    >
                      {[0, 1, 2, 3, 4].map((i) => {
                        const y = (i * 250) / 4;
                        return (
                          <g key={i}>
                            <line
                              x1="0"
                              y1={y}
                              x2="800"
                              y2={y}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                            />
                            <text
                              x="-5"
                              y={y}
                              fontSize="12"
                              fill="#6b7280"
                              textAnchor="end"
                              dominantBaseline="middle"
                            >
                              {Math.round((maxDailyCount * (4 - i)) / 4)}
                            </text>
                          </g>
                        );
                      })}
                      <polyline
                        points={dailyStats
                          .map(([, count], index) => {
                            const x =
                              dailyStats.length > 1
                                ? (index / (dailyStats.length - 1)) * 800
                                : 0;
                            const y = 250 - (count / maxDailyCount) * 250;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                      {dailyStats.map(([, count], index) => {
                        const x =
                          dailyStats.length > 1
                            ? (index / (dailyStats.length - 1)) * 800
                            : 400;
                        const y = 250 - (count / maxDailyCount) * 250;
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#3b82f6"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <div className="flex justify-between mt-4 text-xs text-gray-600">
                    <span>{dailyStats[0]?.[0]}</span>
                    <span>{dailyStats[Math.floor(dailyStats.length / 2)]?.[0]}</span>
                    <span>{dailyStats[dailyStats.length - 1]?.[0]}</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    日別案件着信数（棒グラフ）
                  </h2>
                  <div className="space-y-2">
                    {dailyStats.map(([date, count]) => (
                      <div key={date} className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 w-24">{date}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{
                              width: `${(count / maxDailyCount) * 100}%`,
                            }}
                          >
                            <span className="text-xs text-white font-semibold">
                              {count}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  スキル別案件数（Top 20）
                </h2>
                <div className="space-y-2">
                  {skillStats.map(([skill, count]) => (
                    <div key={skill} className="flex items-center gap-4">
                      <span className="text-sm text-gray-700 w-32 truncate">
                        {skill}
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-5">
                        <div
                          className="bg-green-500 h-5 rounded-full flex items-center justify-end pr-2"
                          style={{
                            width: `${(count / maxSkillCount) * 100}%`,
                          }}
                        >
                          <span className="text-xs text-white font-semibold">
                            {count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  ポジション別案件数
                </h2>
                <div className="space-y-4">
                  {positionStats.map(([position, count]) => (
                    <div key={position}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {position}
                        </span>
                        <span className="text-sm text-gray-600">{count}件</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-purple-500 h-4 rounded-full"
                          style={{
                            width: `${totalCount > 0 ? (count / totalCount) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isAdmin && priceStats && priceStats.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    単価分布
                  </h2>
                  <div className="grid grid-cols-5 gap-4">
                    {priceStats.map(([range, count]) => (
                      <div key={range} className="text-center">
                        <div className="bg-gray-200 rounded-lg p-4 mb-2">
                          <p className="text-2xl font-bold text-gray-900">
                            {count}
                          </p>
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
