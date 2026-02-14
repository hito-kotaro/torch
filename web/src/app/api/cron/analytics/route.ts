import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  aggregateJobs,
  getCutoffDate,
  type JobForAnalytics,
} from '@/lib/analyticsAggregate';
import { getJobRetentionCutoff } from '@/lib/jobRetention';

const PERIODS = ['7d', '30d', '90d', 'all'] as const;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    for (const period of PERIODS) {
      const cutoff = getCutoffDate(period);
      const jobs = await prisma.job.findMany({
        where: cutoff
          ? { receivedAt: { gte: cutoff } }
          : {},
        include: {
          skills: { include: { skill: true } },
        },
        orderBy: { receivedAt: 'asc' },
      });

      const jobsForAnalytics: JobForAnalytics[] = jobs.map((j) => ({
        receivedAt: j.receivedAt,
        grade: j.grade,
        unitPrice: j.unitPrice,
        skills: j.skills.map((s) => s.skill.name),
      }));

      const aggregated = aggregateJobs(jobsForAnalytics);

      await prisma.jobAnalyticsSnapshot.upsert({
        where: { period },
        create: {
          period,
          aggregatedAt: now,
          totalCount: aggregated.totalCount,
          dailyStats: aggregated.dailyStats as object,
          skillStats: aggregated.skillStats as object,
          positionStats: aggregated.positionStats as object,
          priceStats: aggregated.priceStats as object,
        },
        update: {
          aggregatedAt: now,
          totalCount: aggregated.totalCount,
          dailyStats: aggregated.dailyStats as object,
          skillStats: aggregated.skillStats as object,
          positionStats: aggregated.positionStats as object,
          priceStats: aggregated.priceStats as object,
        },
      });
    }

    // 保持期間を過ぎた案件を削除（分析はスナップショットで保持済み）
    const retentionCutoff = getJobRetentionCutoff();
    const deleteResult = await prisma.job.deleteMany({
      where: { receivedAt: { lt: retentionCutoff } },
    });

    return NextResponse.json({
      success: true,
      message: 'Analytics snapshots updated',
      deletedJobs: deleteResult.count,
    });
  } catch (error) {
    console.error('Analytics cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
