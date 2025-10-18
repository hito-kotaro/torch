import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.PROD_DB_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function checkGrades() {
  console.log('グレードの分布を確認中...');

  try {
    const jobs = await prisma.job.findMany({
      select: {
        grade: true,
      },
    });

    // グレードごとにカウント
    const gradeCounts: Record<string, number> = {};

    jobs.forEach((job) => {
      const grade = job.grade || '(null)';
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });

    console.log('\n=== グレード分布 ===');
    Object.entries(gradeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([grade, count]) => {
        console.log(`${grade}: ${count}件`);
      });

    console.log(`\n合計: ${jobs.length}件`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkGrades();
