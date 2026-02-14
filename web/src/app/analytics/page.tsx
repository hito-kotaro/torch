import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import AnalyticsClient from './AnalyticsClient';
import { getUserRole } from '@/lib/auth';
import { getListingSince } from '@/lib/listingLimit';

const prisma = new PrismaClient();

export default async function AnalyticsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const userRole = await getUserRole();

  // 案件情報を取得（直近20日分）
  const jobs = await prisma.job.findMany({
    where: {
      receivedAt: { gte: getListingSince() },
    },
    include: {
      skills: {
        include: {
          skill: true,
        },
      },
    },
    orderBy: {
      receivedAt: 'desc',
    },
  });

  // クライアントコンポーネントに渡す形式に変換
  const jobsForClient = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    grade: job.grade,
    unitPrice: job.unitPrice,
    receivedAt: job.receivedAt,
    skills: job.skills.map((js) => js.skill.name),
  }));

  return <AnalyticsClient jobs={jobsForClient} userRole={userRole} />;
}
