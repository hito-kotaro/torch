import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ImportTalentRequest = {
  originalTitle: string;
  originalBody: string;
  senderEmail: string;
  receivedAt: string; // ISO 8601 format
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

    const body: ImportTalentRequest = await request.json();

    // バリデーション
    if (!body.originalTitle || !body.originalBody || !body.senderEmail || !body.receivedAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Talentを作成（原文のみ保存）
    const talent = await prisma.talent.create({
      data: {
        originalTitle: body.originalTitle,
        originalBody: body.originalBody,
        senderEmail: body.senderEmail,
        receivedAt: new Date(body.receivedAt),
        // AI抽出された情報はnullのまま（後で手動で入力する可能性があるため）
        name: null,
        age: null,
        position: null,
        workStyle: null,
        location: null,
        unitPrice: null,
        summary: null,
        description: null,
      },
    });

    return NextResponse.json({
      success: true,
      talentId: talent.id,
    });

  } catch (error) {
    console.error('Talent import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
