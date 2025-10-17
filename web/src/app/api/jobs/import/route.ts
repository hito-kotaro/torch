import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeSkillNames } from '@/lib/normalizeSkill';

type ImportJobRequest = {
  title: string;
  company?: string;
  grade?: string;
  location?: string;
  unitPrice?: number;
  summary?: string;
  description?: string;
  originalTitle: string;
  originalBody: string;
  senderEmail: string;
  receivedAt: string; // ISO 8601 format
  skills?: string[]; // スキル名の配列
};

export async function POST(request: NextRequest) {
  try {
    // APIキー認証
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.BATCH_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ImportJobRequest = await request.json();

    // バリデーション
    if (!body.title || !body.originalTitle || !body.originalBody || !body.senderEmail || !body.receivedAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Jobを作成
    const job = await prisma.job.create({
      data: {
        title: body.title,
        company: body.company || null,
        grade: body.grade || null,
        location: body.location || null,
        unitPrice: body.unitPrice || null,
        summary: body.summary || null,
        description: body.description || null,
        originalTitle: body.originalTitle,
        originalBody: body.originalBody,
        senderEmail: body.senderEmail,
        receivedAt: new Date(body.receivedAt),
      },
    });

    // スキルを関連付け
    if (body.skills && body.skills.length > 0) {
      // スキル名を正規化（重複排除含む）
      const normalizedSkills = normalizeSkillNames(body.skills);

      for (const skillName of normalizedSkills) {
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
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
    });

  } catch (error) {
    console.error('Job import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
