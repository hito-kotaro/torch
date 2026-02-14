import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AnalyticsClient from './AnalyticsClient';
import { getUserRole } from '@/lib/auth';

const VALID_PERIODS = ['7d', '30d', '90d', 'all'] as const;
type Period = (typeof VALID_PERIODS)[number];

function parsePeriod(v: string | string[] | undefined): Period {
  const p = Array.isArray(v) ? v[0] : v;
  if (p && VALID_PERIODS.includes(p as Period)) return p as Period;
  return '30d';
}

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const params = await searchParams;
  const period = parsePeriod(params?.period);
  const userRole = await getUserRole();

  const snapshot = await prisma.jobAnalyticsSnapshot.findUnique({
    where: { period },
  });

  return (
    <AnalyticsClient
      period={period}
      snapshot={snapshot}
      userRole={userRole}
    />
  );
}
