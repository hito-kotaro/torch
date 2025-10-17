import { PrismaClient } from '@prisma/client';

// 環境変数からDATABASE_URLを取得（デフォルトはローカル）
const prisma = new PrismaClient();

const companies = [
  '株式会社ABC', '株式会社XYZ', 'テック株式会社', 'システム開発株式会社',
  'デジタルソリューション株式会社', 'クラウドテック株式会社', 'AI研究所',
  'ウェブサービス株式会社', 'モバイルアプリ株式会社', 'データサイエンス株式会社'
];

const titles = [
  'フロントエンドエンジニア', 'バックエンドエンジニア', 'フルスタックエンジニア',
  'インフラエンジニア', 'データエンジニア', 'AIエンジニア', 'QAエンジニア',
  'プロジェクトマネージャー', 'テックリード', 'SREエンジニア'
];

const skills = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue', 'Angular',
  'Node.js', 'Python', 'Java', 'Go', 'PHP', 'Ruby',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'CI/CD', 'Git', 'GitHub', 'Linux'
];

const locations = [
  '東京都渋谷区', '東京都港区', '東京都新宿区', '東京都千代田区',
  '神奈川県横浜市', '大阪府大阪市', '愛知県名古屋市', '福岡県福岡市'
];

const grades = ['S1', 'S2', 'S3', 'S4', 'S5', 'SS', 'MG'];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function main() {
  // 現在のJob件数を確認
  const currentCount = await prisma.job.count();
  console.log(`現在のJob件数: ${currentCount}`);

  const targetCount = 100;
  const needed = targetCount - currentCount;

  if (needed <= 0) {
    console.log(`既に${currentCount}件のJobが存在します。追加は不要です。`);
    return;
  }

  console.log(`${needed}件のダミーデータを追加します...\n`);

  for (let i = 0; i < needed; i++) {
    const company = randomElement(companies);
    const title = `${randomElement(titles)} (${company})`;
    const grade = Math.random() > 0.3 ? randomElement(grades) : null;
    const location = randomElement(locations);
    const unitPrice = Math.floor(Math.random() * 80) + 40; // 40-120万円
    const selectedSkills = randomElements(skills, Math.floor(Math.random() * 5) + 3); // 3-7個のスキル

    // 日付をランダムに生成（過去30日間）
    const daysAgo = Math.floor(Math.random() * 30);
    const receivedAt = new Date();
    receivedAt.setDate(receivedAt.getDate() - daysAgo);

    const job = await prisma.job.create({
      data: {
        title,
        company,
        grade,
        location,
        unitPrice,
        summary: `${title}の案件です。${selectedSkills.join('、')}の経験を活かせる業務です。`,
        description: `【業務内容】\n${title}として、システム開発プロジェクトに参画いただきます。\n\n【必須スキル】\n- ${selectedSkills.join('\n- ')}\n\n【勤務地】\n${location}`,
        originalTitle: `【${grade || 'エンジニア'}募集】${title}`,
        originalBody: `件名: 【${grade || 'エンジニア'}募集】${title}\n\n${company}より案件のご紹介です。\n\n単価: ${unitPrice}万円/月\n場所: ${location}\n必須スキル: ${selectedSkills.join('、')}`,
        senderEmail: `partner${Math.floor(Math.random() * 10)}@example.com`,
        receivedAt,
      },
    });

    // スキルを関連付け
    for (const skillName of selectedSkills) {
      let skill = await prisma.skill.findUnique({
        where: { name: skillName },
      });

      if (!skill) {
        skill = await prisma.skill.create({
          data: { name: skillName },
        });
      }

      await prisma.jobSkill.create({
        data: {
          jobId: job.id,
          skillId: skill.id,
        },
      });
    }

    if ((i + 1) % 10 === 0) {
      console.log(`${i + 1}/${needed}件作成完了...`);
    }
  }

  const finalCount = await prisma.job.count();
  console.log(`\n完了！現在のJob件数: ${finalCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
