import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { normalizeSkillNames } from '@/lib/normalizeSkill';

// Prismaクライアントのシングルトンインスタンス
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// APIキーの検証
const API_KEY = process.env.TORCH_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // APIキーの検証
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || apiKey !== API_KEY) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // 必須フィールドのバリデーション
    if (!body.originalTitle || !body.originalBody || !body.senderEmail || !body.receivedAt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // スキル名を正規化
    const normalizedSkills = normalizeSkillNames(body.skills || []);

    // 人材情報を保存
    const talent = await prisma.talent.create({
      data: {
        name: body.name || null,
        age: body.age || null,
        position: body.position || 'SE',
        workStyle: body.workStyle || null,
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

    // スキルタグを保存
    if (normalizedSkills.length > 0) {
      for (const skillName of normalizedSkills) {
        // スキルマスタに存在するか確認、なければ作成
        let skill = await prisma.skill.findUnique({
          where: { name: skillName },
        });

        if (!skill) {
          skill = await prisma.skill.create({
            data: { name: skillName },
          });
        }

        // 重複チェック
        const existing = await prisma.talentSkill.findUnique({
          where: {
            talentId_skillId: {
              talentId: talent.id,
              skillId: skill.id,
            },
          },
        });

        if (!existing) {
          await prisma.talentSkill.create({
            data: {
              talentId: talent.id,
              skillId: skill.id,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, talentId: talent.id });
  } catch (error) {
    console.error('人材情報保存エラー:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
