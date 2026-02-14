/**
 * 案件分析の集計ロジック（バッチ・API 用）
 */

export type JobForAnalytics = {
  receivedAt: Date;
  grade: string | null;
  unitPrice: number | null;
  skills: string[];
};

export type DailyStats = [string, number][]; // [日付文字列, 件数]
export type SkillStats = [string, number][];
export type PositionStats = [string, number][];
export type PriceStats = [string, number][];

export function aggregateJobs(
  jobs: JobForAnalytics[]
): {
  totalCount: number;
  dailyStats: DailyStats;
  skillStats: SkillStats;
  positionStats: PositionStats;
  priceStats: PriceStats;
} {
  const dailyStats: Record<string, number> = {};
  jobs.forEach((job) => {
    const date = new Date(job.receivedAt).toLocaleDateString('ja-JP');
    dailyStats[date] = (dailyStats[date] || 0) + 1;
  });
  const dailyStatsArr = Object.entries(dailyStats)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-30);

  const skillStats: Record<string, number> = {};
  jobs.forEach((job) => {
    job.skills.forEach((skill) => {
      skillStats[skill] = (skillStats[skill] || 0) + 1;
    });
  });
  const skillStatsArr = Object.entries(skillStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const positionStats: Record<string, number> = {};
  jobs.forEach((job) => {
    const position = job.grade || '未設定';
    positionStats[position] = (positionStats[position] || 0) + 1;
  });
  const positionStatsArr = Object.entries(positionStats).sort(
    (a, b) => b[1] - a[1]
  );

  const priceRanges: Record<string, number> = {
    '40万円未満': 0,
    '40-60万円': 0,
    '60-80万円': 0,
    '80-100万円': 0,
    '100万円以上': 0,
  };
  jobs.forEach((job) => {
    if (job.unitPrice == null) return;
    if (job.unitPrice < 40) priceRanges['40万円未満']++;
    else if (job.unitPrice < 60) priceRanges['40-60万円']++;
    else if (job.unitPrice < 80) priceRanges['60-80万円']++;
    else if (job.unitPrice < 100) priceRanges['80-100万円']++;
    else priceRanges['100万円以上']++;
  });
  const priceStatsArr = Object.entries(priceRanges);

  return {
    totalCount: jobs.length,
    dailyStats: dailyStatsArr,
    skillStats: skillStatsArr,
    positionStats: positionStatsArr,
    priceStats: priceStatsArr,
  };
}

/** 期間に応じた receivedAt の開始日（all の場合は null） */
export function getCutoffDate(period: '7d' | '30d' | '90d' | 'all'): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const d = new Date(now);
  if (period === '7d') d.setDate(now.getDate() - 7);
  else if (period === '30d') d.setDate(now.getDate() - 30);
  else if (period === '90d') d.setDate(now.getDate() - 90);
  return d;
}
