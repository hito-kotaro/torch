import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import TalentsClient from './TalentsClient';
import { getUserRole } from '@/lib/auth';

const prisma = new PrismaClient();

export default async function TalentsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const userRole = await getUserRole();

  // 人材情報を取得（新しい順）
  const talents = await prisma.talent.findMany({
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

  // クライアントコンポーネントに渡す形式に変換
  const talentsForClient = talents.map((talent) => ({
    id: talent.id,
    name: talent.name,
    age: talent.age,
    position: talent.position,
    workStyle: talent.workStyle,
    location: talent.location,
    unitPrice: talent.unitPrice,
    summary: talent.summary,
    description: talent.description,
    originalTitle: talent.originalTitle,
    originalBody: talent.originalBody,
    senderEmail: talent.senderEmail,
    receivedAt: talent.receivedAt,
    skills: talent.skills.map((ts) => ts.skill.name),
  }));

  return <TalentsClient talents={talentsForClient} userRole={userRole} />;
}
