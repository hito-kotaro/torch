import { Prisma } from '@prisma/client';

/** 一覧で閲覧できる直近の日数 */
export const LISTING_DAYS = 20;

/** 1ページあたりの件数 */
export const ITEMS_PER_PAGE = 50;

/** 一覧取得の開始日（この日付 0:00 以降のデータを表示） */
export function getListingSince(): Date {
  const d = new Date();
  d.setDate(d.getDate() - LISTING_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type JobsFilterParams = {
  page: number;
  q: string;
  id: string;
  grades: string[];
  skills: string[];
  minPrice: number | null;
  maxPrice: number | null;
  startDate: string | null;
  endDate: string | null;
  sort: 'desc' | 'asc';
};

/** URL の searchParams から JobsFilterParams を組み立て */
export function parseJobsSearchParams(
  params: { [key: string]: string | string[] | undefined }
): JobsFilterParams {
  const getStr = (k: string) => {
    const v = params[k];
    if (v == null) return '';
    return Array.isArray(v) ? v[0] ?? '' : v;
  };
  const getArr = (k: string) => {
    const v = params[k];
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  };
  const pageRaw = getStr('page');
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const minPriceRaw = getStr('minPrice');
  const maxPriceRaw = getStr('maxPrice');
  return {
    page,
    q: getStr('q').trim(),
    id: getStr('id').trim(),
    grades: getArr('grade'),
    skills: getArr('skill'),
    minPrice: minPriceRaw === '' ? null : (parseFloat(minPriceRaw) || null),
    maxPrice: maxPriceRaw === '' ? null : (parseFloat(maxPriceRaw) || null),
    startDate: getStr('startDate') || null,
    endDate: getStr('endDate') || null,
    sort: getStr('sort') === 'asc' ? 'asc' : 'desc',
  };
}

/** JobsFilterParams から Prisma の where を組み立て */
export function buildJobsWhere(
  filter: JobsFilterParams,
  listingSince: Date
): Prisma.JobWhereInput {
  const conditions: Prisma.JobWhereInput[] = [
    { receivedAt: { gte: listingSince } },
  ];

  if (filter.id) {
    conditions.push({ id: { contains: filter.id, mode: 'insensitive' } });
  }

  if (filter.q) {
    conditions.push({
      OR: [
        { title: { contains: filter.q, mode: 'insensitive' } },
        { company: { contains: filter.q, mode: 'insensitive' } },
        { summary: { contains: filter.q, mode: 'insensitive' } },
      ],
    });
  }

  if (filter.grades.length > 0) {
    conditions.push({ grade: { in: filter.grades } });
  }

  if (filter.skills.length > 0) {
    conditions.push({
      skills: {
        some: { skill: { name: { in: filter.skills } } },
      },
    });
  }

  if (filter.minPrice != null || filter.maxPrice != null) {
    const unitPrice: Prisma.IntNullableFilter = { not: null };
    if (filter.minPrice != null) unitPrice.gte = filter.minPrice;
    if (filter.maxPrice != null) unitPrice.lte = filter.maxPrice;
    conditions.push({ unitPrice });
  }

  if (filter.startDate || filter.endDate) {
    const receivedAt: Prisma.DateTimeFilter = {};
    if (filter.startDate) {
      const start = new Date(filter.startDate);
      start.setHours(0, 0, 0, 0);
      receivedAt.gte = start;
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      receivedAt.lte = end;
    }
    conditions.push({ receivedAt });
  }

  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

/** フィルタをクエリ文字列に変換（URL 更新用） */
export function buildJobsQueryString(filter: JobsFilterParams): string {
  const p = new URLSearchParams();
  if (filter.page > 1) p.set('page', String(filter.page));
  if (filter.q) p.set('q', filter.q);
  if (filter.id) p.set('id', filter.id);
  filter.grades.forEach((g) => p.append('grade', g));
  filter.skills.forEach((s) => p.append('skill', s));
  if (filter.minPrice != null) p.set('minPrice', String(filter.minPrice));
  if (filter.maxPrice != null) p.set('maxPrice', String(filter.maxPrice));
  if (filter.startDate) p.set('startDate', filter.startDate);
  if (filter.endDate) p.set('endDate', filter.endDate);
  if (filter.sort === 'asc') p.set('sort', 'asc');
  return p.toString();
}
