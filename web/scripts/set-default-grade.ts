import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.PROD_DB_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function setDefaultGrade() {
  console.log('NULL グレードをSEに変更中...');

  try {
    // gradeがnullの案件を取得
    const jobsWithNullGrade = await prisma.job.findMany({
      where: {
        grade: null,
      },
      select: {
        id: true,
      },
    });

    console.log(`対象案件数: ${jobsWithNullGrade.length}件`);

    // 一括更新
    const result = await prisma.job.updateMany({
      where: {
        grade: null,
      },
      data: {
        grade: 'SE',
      },
    });

    console.log(`\n更新完了: ${result.count}件`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setDefaultGrade();
