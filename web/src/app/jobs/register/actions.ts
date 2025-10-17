'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { normalizeSkillNames } from '@/lib/normalizeSkill';

export async function createJob(formData: FormData) {
  // 管理者チェック
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    throw new Error('Unauthorized');
  }

  // フォームデータ取得
  const title = formData.get('title') as string;
  const company = formData.get('company') as string | null;
  const grade = formData.get('grade') as string | null;
  const location = formData.get('location') as string | null;
  const unitPriceStr = formData.get('unitPrice') as string | null;
  const summary = formData.get('summary') as string | null;
  const description = formData.get('description') as string | null;
  const originalTitle = formData.get('originalTitle') as string;
  const originalBody = formData.get('originalBody') as string;
  const senderEmail = formData.get('senderEmail') as string;
  const receivedAtStr = formData.get('receivedAt') as string;
  const skillsStr = formData.get('skills') as string;

  // 単価の変換
  const unitPrice = unitPriceStr ? parseInt(unitPriceStr, 10) : null;

  // 受信日時の変換
  const receivedAt = new Date(receivedAtStr);

  // スキルの配列化と正規化
  const rawSkills = skillsStr ? skillsStr.split(',').map((s) => s.trim()).filter((s) => s) : [];
  const skillNames = normalizeSkillNames(rawSkills);

  // Jobを作成
  const job = await prisma.job.create({
    data: {
      title,
      company: company || null,
      grade: grade || null,
      location: location || null,
      unitPrice,
      summary: summary || null,
      description: description || null,
      originalTitle,
      originalBody,
      senderEmail,
      receivedAt,
    },
  });

  // スキルを関連付け
  for (const skillName of skillNames) {
    // スキルを取得または作成
    let skill = await prisma.skill.findUnique({
      where: { name: skillName },
    });

    if (!skill) {
      skill = await prisma.skill.create({
        data: { name: skillName },
      });
    }

    // JobSkillを作成（重複チェック）
    const existing = await prisma.jobSkill.findUnique({
      where: {
        jobId_skillId: {
          jobId: job.id,
          skillId: skill.id,
        }
      }
    });

    if (!existing) {
      await prisma.jobSkill.create({
        data: {
          jobId: job.id,
          skillId: skill.id,
        },
      });
    }
  }

  // 案件一覧ページのキャッシュを再検証
  revalidatePath('/jobs');

  return { success: true, jobId: job.id };
}
