import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // スキルマスタを作成
  const skills = [
    { name: 'React', category: 'frontend' },
    { name: 'TypeScript', category: 'frontend' },
    { name: 'Next.js', category: 'frontend' },
    { name: 'Vue.js', category: 'frontend' },
    { name: 'Nuxt.js', category: 'frontend' },
    { name: 'Go', category: 'backend' },
    { name: 'Python', category: 'backend' },
    { name: 'Node.js', category: 'backend' },
    { name: 'Django', category: 'backend' },
    { name: 'PostgreSQL', category: 'database' },
    { name: 'MySQL', category: 'database' },
    { name: 'Docker', category: 'infrastructure' },
    { name: 'Kubernetes', category: 'infrastructure' },
    { name: 'AWS', category: 'infrastructure' },
  ];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {},
      create: skill,
    });
  }

  console.log('Skills created');

  // 案件データを作成
  const jobs = [
    {
      title: 'React/TypeScript フロントエンドエンジニア',
      company: 'A株式会社',
      grade: 'S3',
      location: '東京都渋谷区',
      unitPrice: 800000,
      summary: '大規模Webアプリケーションのフロントエンド開発',
      description: '月間1000万PVを超える大規模WebサービスのReact/TypeScriptによるフロントエンド開発に携わっていただきます。',
      originalTitle: '【急募】React/TS エンジニア募集 〜月額85万円 商流2次請け',
      originalBody: 'フロントエンドエンジニアを募集しております。React、TypeScript経験必須です。',
      senderEmail: 'partner-a@example.com',
      receivedAt: new Date('2025-01-10T09:00:00Z'),
      skillNames: ['React', 'TypeScript', 'Next.js'],
    },
    {
      title: 'バックエンドエンジニア（Go）',
      company: 'B株式会社',
      grade: 'S4',
      location: '東京都港区',
      unitPrice: 900000,
      summary: 'マイクロサービスアーキテクチャでのバックエンド開発',
      description: 'Go言語を用いたマイクロサービスの開発・運用に携わっていただきます。',
      originalTitle: '【案件】Goエンジニア募集 月95万 マージン15%',
      originalBody: 'Go言語でのバックエンド開発経験者を募集しております。',
      senderEmail: 'partner-b@example.com',
      receivedAt: new Date('2025-01-11T10:30:00Z'),
      skillNames: ['Go', 'PostgreSQL', 'Docker', 'Kubernetes'],
    },
    {
      title: 'フルスタックエンジニア',
      company: 'C株式会社',
      grade: 'S2',
      location: '大阪府大阪市',
      unitPrice: 750000,
      summary: '新規サービス立ち上げのフルスタック開発',
      description: '新規事業の立ち上げに伴い、フロント・バックエンド両方の開発をお願いします。',
      originalTitle: '【新規案件】フルスタックエンジニア 単価78万 エンド直',
      originalBody: '新規プロジェクトにてフルスタックエンジニアを募集しております。',
      senderEmail: 'partner-c@example.com',
      receivedAt: new Date('2025-01-12T14:00:00Z'),
      skillNames: ['Node.js', 'React', 'AWS', 'PostgreSQL'],
    },
    {
      title: 'Pythonバックエンドエンジニア',
      company: 'D株式会社',
      grade: 'S3',
      location: '東京都新宿区',
      unitPrice: 700000,
      summary: 'Django を用いたAPI開発・保守',
      description: 'PythonとDjangoを使用したREST APIの開発・保守業務です。',
      originalTitle: '【案件情報】Pythonエンジニア 月75万（商流3次）',
      originalBody: 'Django経験者を募集しております。API開発経験歓迎。',
      senderEmail: 'partner-d@example.com',
      receivedAt: new Date('2025-01-13T11:00:00Z'),
      skillNames: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    },
    {
      title: 'Vue.js フロントエンドエンジニア',
      company: 'E株式会社',
      grade: 'S5',
      location: '東京都品川区',
      unitPrice: 820000,
      summary: 'Vue.js/Nuxt.jsでのSPA開発',
      description: 'Vue.js 3系とNuxt.jsを使用したモダンなSPA開発プロジェクトです。',
      originalTitle: '【急募】Vue.jsエンジニア 月額88万 マージン18%',
      originalBody: 'Vue.js、Nuxt.js経験者を急募しております。',
      senderEmail: 'partner-e@example.com',
      receivedAt: new Date('2025-01-14T15:30:00Z'),
      skillNames: ['Vue.js', 'TypeScript', 'Nuxt.js'],
    },
    {
      title: 'インフラエンジニア（AWS/Kubernetes）',
      company: 'F株式会社',
      grade: 'SS',
      location: '東京都千代田区',
      unitPrice: 950000,
      summary: 'AWSとKubernetesを使用したインフラ構築・運用',
      description: 'クラウドネイティブなインフラ環境の構築と運用をお願いします。',
      originalTitle: '【案件】インフラエンジニア募集 単価100万 2次請け',
      originalBody: 'AWS、Kubernetes経験者を募集しております。',
      senderEmail: 'partner-f@example.com',
      receivedAt: new Date('2025-01-15T09:30:00Z'),
      skillNames: ['AWS', 'Kubernetes', 'Docker'],
    },
  ];

  for (const job of jobs) {
    const { skillNames, ...jobData } = job;

    const createdJob = await prisma.job.create({
      data: jobData,
    });

    // スキルを関連付け
    for (const skillName of skillNames) {
      const skill = await prisma.skill.findUnique({
        where: { name: skillName },
      });

      if (skill) {
        await prisma.jobSkill.create({
          data: {
            jobId: createdJob.id,
            skillId: skill.id,
          },
        });
      }
    }

    console.log(`Created job: ${createdJob.title}`);
  }

  console.log('Seeding finished');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
