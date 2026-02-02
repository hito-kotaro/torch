import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeSkillNames } from '@/lib/normalizeSkill';

type ImportJobRequest = {
  title: string;
  company?: string;
  grade?: string;
  location?: string;
  unitPrice?: number;
  recruitmentCount?: number; // 募集人数（2人以上の場合は「募集人数2人以上」タグを付与）
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

    // 募集人数が2人以上の場合は「募集人数2人以上」タグをスキルに追加
    const skillsToLink = body.skills ? [...body.skills] : [];
    const recruitmentCount = body.recruitmentCount != null ? Number(body.recruitmentCount) : null;
    if (recruitmentCount !== null && !Number.isNaN(recruitmentCount) && recruitmentCount >= 2) {
      const tag = '募集人数2人以上';
      if (!skillsToLink.includes(tag)) {
        skillsToLink.push(tag);
      }
    }

    // Jobを作成
    const job = await prisma.job.create({
      data: {
        title: body.title,
        company: body.company || null,
        grade: body.grade || null,
        location: body.location || null,
        unitPrice: body.unitPrice || null,
        recruitmentCount: recruitmentCount != null && !Number.isNaN(recruitmentCount) ? recruitmentCount : null,
        summary: body.summary || null,
        description: body.description || null,
        originalTitle: body.originalTitle,
        originalBody: body.originalBody,
        senderEmail: body.senderEmail,
        receivedAt: new Date(body.receivedAt),
      },
    });

    // スキルを関連付け
    if (skillsToLink.length > 0) {
      // スキル名を正規化（重複排除含む）
      const normalizedSkills = normalizeSkillNames(skillsToLink);

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
