import { prisma } from '@/lib/prisma';
import { getUserRole, isAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TalentsClient from './TalentsClient';

async function getTalents(isAdmin: boolean) {
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

  return talents.map((talent) => ({
    id: talent.id,
    name: talent.name,
    age: talent.age,
    position: talent.position,
    workStyle: talent.workStyle,
    location: talent.location,
    unitPrice: talent.unitPrice, // フィルタリング用に全ユーザーに返す（表示は管理者のみ）
    summary: talent.summary,
    description: talent.description,
    originalTitle: isAdmin ? talent.originalTitle : null, // 管理者のみ原文タイトルを返す
    originalBody: isAdmin ? talent.originalBody : null, // 管理者のみ原文本文を返す
    senderEmail: isAdmin ? talent.senderEmail : null, // 管理者のみ送信者メールを返す
    receivedAt: talent.receivedAt,
    skills: talent.skills.map((ts) => ts.skill.name),
  }));
}

export default async function TalentsPage() {
  const userIsAdmin = await isAdmin();

  // 管理者でない場合は案件一覧にリダイレクト
  if (!userIsAdmin) {
    redirect('/jobs');
  }

  const userRole = await getUserRole();
  const talents = await getTalents(userIsAdmin);

  return <TalentsClient talents={talents} userRole={userRole} />;
}
