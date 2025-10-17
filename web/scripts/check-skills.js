const { PrismaClient } = require('@prisma/client');

// 環境変数からDATABASE_URLを取得（デフォルトはローカル）
const prisma = new PrismaClient();

async function main() {
  const skills = await prisma.skill.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  console.log('=== 全スキル一覧 ===');
  skills.forEach(skill => {
    console.log(skill.name);
  });

  console.log('\n=== 表記揺れの可能性 ===');
  const normalized = new Map();
  skills.forEach(skill => {
    const key = skill.name.toLowerCase().replace(/[\/\-\s\.\(\)]/g, '');
    if (!normalized.has(key)) {
      normalized.set(key, []);
    }
    normalized.get(key).push(skill.name);
  });

  normalized.forEach((variants, key) => {
    if (variants.length > 1) {
      console.log(`${variants.join(', ')}`);
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
