import { prisma } from '@/lib/prisma';
import JobsClient from './JobsClient';

async function getJobs() {
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
    position: job.position,
    unitPrice: job.unitPrice,
    summary: job.summary,
    description: job.description,
    skills: job.skills.map((js) => js.skill.name),
  }));
}

export default async function JobsPage() {
  const jobs = await getJobs();

  return <JobsClient jobs={jobs} />;
}
