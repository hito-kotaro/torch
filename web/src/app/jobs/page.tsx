import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/auth';
import {
  ITEMS_PER_PAGE,
  parseJobsSearchParams,
  buildJobsWhere,
} from '@/lib/listingLimit';
import JobsClient from './JobsClient';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getJobsPage(
  filter: ReturnType<typeof parseJobsSearchParams>,
  isAdmin: boolean
) {
  const where = buildJobsWhere(filter);

  const [jobs, totalCount] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        skills: {
          include: { skill: true },
        },
      },
      orderBy: { receivedAt: filter.sort },
      skip: (filter.page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.job.count({ where }),
  ]);

  const dateFmt = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateFmtLong = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      grade: job.grade,
      unitPrice: job.unitPrice,
      summary: job.summary,
      description: job.description,
      originalTitle: isAdmin ? job.originalTitle : null,
      originalBody: isAdmin ? job.originalBody : null,
      senderEmail: isAdmin ? job.senderEmail : null,
      receivedAt: job.receivedAt,
      receivedAtDisplay: dateFmt.format(job.receivedAt),
      receivedAtDisplayLong: dateFmtLong.format(job.receivedAt),
      skills: job.skills.map((js) => js.skill.name),
    })),
    totalCount,
    totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
    currentPage: filter.page,
    filter,
  };
}

export default async function JobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = parseJobsSearchParams(params ?? {});
  const userRole = await getUserRole();
  const isAdmin = userRole === 'admin';
  const data = await getJobsPage(filter, isAdmin);

  return (
    <JobsClient
      jobs={data.jobs}
      totalCount={data.totalCount}
      totalPages={data.totalPages}
      currentPage={data.currentPage}
      filter={data.filter}
      userRole={userRole}
    />
  );
}
