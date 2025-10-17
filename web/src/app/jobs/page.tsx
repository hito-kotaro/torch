import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/auth';
import JobsClient from './JobsClient';

async function getJobs(isAdmin: boolean) {
  const jobs = await prisma.job.findMany({
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

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    grade: job.grade,
    unitPrice: isAdmin ? job.unitPrice : null, // 管理者のみ単価を返す
    summary: job.summary,
    description: job.description,
    originalTitle: isAdmin ? job.originalTitle : null, // 管理者のみ原文タイトルを返す
    originalBody: isAdmin ? job.originalBody : null, // 管理者のみ原文本文を返す
    senderEmail: isAdmin ? job.senderEmail : null, // 管理者のみ送信者メールを返す
    receivedAt: job.receivedAt,
    skills: job.skills.map((js) => js.skill.name),
  }));
}

export default async function JobsPage() {
  const userRole = await getUserRole();
  const isAdmin = userRole === 'admin';
  const jobs = await getJobs(isAdmin);

  return <JobsClient jobs={jobs} userRole={userRole} />;
}
