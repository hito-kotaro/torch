import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.PROD_DB_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

// 旧グレード → 新グレードのマッピング
const GRADE_MAPPING: Record<string, string> = {
  'S1': 'SE',
  'S2': 'SE',
  'S3': 'SE',
  'S4': 'SE',
  'S5': 'チームリーダー',
  'SS': 'テックリード',
  'MG': 'PM',
};

async function migrateGrades() {
  console.log('グレードマイグレーション開始...');

  try {
    // 全案件を取得
    const jobs = await prisma.job.findMany({
      select: {
        id: true,
        grade: true,
      },
    });

    console.log(`対象案件数: ${jobs.length}件`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const job of jobs) {
      if (!job.grade) {
        skippedCount++;
        continue;
      }

      const newGrade = GRADE_MAPPING[job.grade];

      if (newGrade) {
        await prisma.job.update({
          where: { id: job.id },
          data: { grade: newGrade },
        });
        console.log(`更新: ${job.id} - ${job.grade} → ${newGrade}`);
        updatedCount++;
      } else {
        // マッピングに存在しない場合はそのまま
        console.log(`スキップ（未知のグレード）: ${job.id} - ${job.grade}`);
        skippedCount++;
      }
    }

    console.log('\nマイグレーション完了');
    console.log(`更新: ${updatedCount}件`);
    console.log(`スキップ: ${skippedCount}件`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateGrades();
