import { PrismaClient } from '@prisma/client';
import { normalizeSkillName } from '../src/lib/normalizeSkill';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_tWK5ONpm4AEz@ep-late-sound-adt8mpjz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

async function main() {
  console.log('=== スキル名の正規化を開始 ===\n');

  // 全スキルを取得
  const skills = await prisma.skill.findMany({
    include: {
      jobs: true
    }
  });

  console.log(`合計 ${skills.length} 件のスキルを処理します\n`);

  // 正規化マップを作成
  const normalizedMap = new Map<string, { oldId: string; oldName: string; newName: string; jobCount: number }[]>();

  for (const skill of skills) {
    const normalizedName = normalizeSkillName(skill.name);

    if (normalizedName !== skill.name) {
      if (!normalizedMap.has(normalizedName)) {
        normalizedMap.set(normalizedName, []);
      }
      normalizedMap.get(normalizedName)!.push({
        oldId: skill.id,
        oldName: skill.name,
        newName: normalizedName,
        jobCount: skill.jobs.length
      });
    }
  }

  console.log(`${normalizedMap.size} 件の正規化対象を発見\n`);

  // 正規化処理
  for (const [standardName, variants] of normalizedMap.entries()) {
    console.log(`\n【${standardName}】に統合:`);

    // 標準名のスキルが既に存在するか確認
    let standardSkill = await prisma.skill.findUnique({
      where: { name: standardName }
    });

    // 存在しない場合は、最初のバリエーションの名前を変更
    if (!standardSkill) {
      const first = variants[0];
      console.log(`  - ${first.oldName} を ${standardName} にリネーム`);
      standardSkill = await prisma.skill.update({
        where: { id: first.oldId },
        data: { name: standardName }
      });
      variants.shift(); // 処理済みを削除
    }

    // 残りのバリエーションを統合
    for (const variant of variants) {
      console.log(`  - ${variant.oldName} (${variant.jobCount}件の案件) を統合`);

      // このバリエーションに紐づくJobSkillを取得
      const jobSkills = await prisma.jobSkill.findMany({
        where: { skillId: variant.oldId }
      });

      // 各JobSkillを標準スキルに付け替え（重複チェック）
      for (const jobSkill of jobSkills) {
        // 同じjobIdとstandardSkill.idの組み合わせが既に存在するか確認
        const existing = await prisma.jobSkill.findUnique({
          where: {
            jobId_skillId: {
              jobId: jobSkill.jobId,
              skillId: standardSkill.id
            }
          }
        });

        if (existing) {
          // 既に存在する場合は古い方を削除
          await prisma.jobSkill.delete({
            where: { id: jobSkill.id }
          });
        } else {
          // 存在しない場合は付け替え
          await prisma.jobSkill.update({
            where: { id: jobSkill.id },
            data: { skillId: standardSkill.id }
          });
        }
      }

      // 古いスキルを削除
      await prisma.skill.delete({
        where: { id: variant.oldId }
      });
    }
  }

  console.log('\n=== 正規化完了 ===');

  // 結果確認
  const finalSkills = await prisma.skill.findMany({
    orderBy: { name: 'asc' }
  });

  console.log(`\n最終的なスキル数: ${finalSkills.length} 件`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
