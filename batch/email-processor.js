// ===============================================================
// メール処理ロジック
// ===============================================================

// 対象メールアドレス
const TARGET_EMAIL_ADDRESS = "eigyo@luxy-inc.com";
const MAX_THREADS_PER_EXECUTION = 100;

// Gemini APIキー
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

/**
 * メール自動処理トリガー（5分ごとに実行）
 */
function processEmailsTrigger() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEYが設定されていません。");
    return;
  }

  // 前日の日付を取得
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate = Utilities.formatDate(yesterday, "JST", "yyyy/MM/dd");
  const query = `to:${TARGET_EMAIL_ADDRESS} is:unread after:${formattedDate}`;

  try {
    const threads = GmailApp.search(query, 0, MAX_THREADS_PER_EXECUTION);
    if (threads.length === 0) {
      console.log("処理対象の未読メールはありませんでした。");
      return;
    }

    console.log(`${threads.length}件のメールスレッドを処理します。`);

    threads.forEach(function(thread) {
      try {
        const message = thread.getMessages()[0];
        processSingleMail(message);
        thread.markRead();
        console.log(`スレッドID: ${thread.getId()} を処理し、既読にしました。`);
      } catch (e) {
        console.error(`スレッド(ID: ${thread.getId()})の処理中にエラー: ${e.toString()}`);
      }
    });

  } catch (e) {
    console.error("メール検索または処理ループ全体でエラーが発生しました: " + e.toString());
  }
}

/**
 * 個別メールを処理
 */
function processSingleMail(message) {
  try {
    const mailBody = message.getPlainBody().replace(/(\r\n|\n|\r){2,}/g, '\n');
    if (!mailBody) {
      console.log(`メールID: ${message.getId()} は本文が空のためスキップします。`);
      return;
    }

    const from = message.getFrom();
    const subject = message.getSubject();
    const mailDate = message.getDate();

    console.log(`メール処理開始: ${subject}`);

    // Gemini APIで案件情報を抽出
    const prompt = createJobExtractionPrompt(mailBody, subject);
    const aiResponse = callGeminiAPI(prompt, 'gemini-2.0-flash-lite');

    if (!aiResponse) {
      console.error(`メールID: ${message.getId()} のAI解析に失敗しました。`);
      return;
    }

    const jobData = JSON.parse(aiResponse);

    // 案件情報が見つからない場合はスキップ
    if (!jobData.title || jobData.title.trim() === "") {
      console.log(`メールID: ${message.getId()} からは案件情報が見つかりませんでした。`);
      return;
    }

    // データベースに保存
    const jobId = saveJob({
      title: jobData.title,
      company: jobData.company,
      grade: jobData.grade,
      location: jobData.location,
      unitPrice: jobData.unitPrice,
      summary: jobData.summary,
      description: jobData.description,
      originalTitle: subject,
      originalBody: mailBody,
      senderEmail: from,
      receivedAt: mailDate
    });

    // スキルを関連付け
    if (jobData.skills && Array.isArray(jobData.skills)) {
      jobData.skills.forEach(function(skillName) {
        try {
          const skillId = getOrCreateSkill(skillName.trim());
          linkJobSkill(jobId, skillId);
        } catch (e) {
          console.error(`スキル関連付けエラー (${skillName}): ${e.toString()}`);
        }
      });
    }

    console.log(`案件を保存しました: ${jobData.title} (ID: ${jobId})`);

  } catch(e) {
    console.error(`メール(ID: ${message.getId()})の処理中にエラー: ${e.toString()}`);
  }
}

/**
 * 案件情報抽出用のプロンプト
 */
function createJobExtractionPrompt(mailBody, subject) {
  return `
以下のメール本文から、案件情報を抽出してJSON形式で出力してください。

【メール件名】
${subject}

【メール本文】
${mailBody}

【指示】
1. このメールが案件情報（求人情報、プロジェクト募集）を含む場合のみ、情報を抽出してください
2. 人材情報（エンジニアの経歴書など）の場合は、すべてのフィールドを空文字にしてください
3. 各項目は以下のルールに従って抽出してください：

## 抽出ルール

- **title**: 案件のタイトル。メールから適切な案件名を生成してください
- **company**: 企業名またはプロジェクト名
- **grade**: グレード（S1, S2, S3, S4, S5, SS, MG）。明示されていない場合はnull
- **location**: 勤務地（「東京都渋谷区」など）
- **unitPrice**: 単価（数値のみ、万円単位）。「70万円(140-200)」→70、「60~70万」→60、「550,000円」→55
- **summary**: 案件概要（200字以内）
- **description**: 詳細説明
- **skills**: 必要なスキルの配列（例: ["React", "TypeScript", "AWS"]）

【出力形式】
必ず以下のJSON形式で、\`\`\`json ... \`\`\` のブロックで返却してください。

\`\`\`json
{
  "title": "",
  "company": "",
  "grade": "",
  "location": "",
  "unitPrice": null,
  "summary": "",
  "description": "",
  "skills": []
}
\`\`\`
`;
}

/**
 * Gemini APIを呼び出す
 */
function callGeminiAPI(prompt, modelName) {
  const model = modelName || 'gemini-2.0-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      response_mime_type: "application/json"
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      const result = JSON.parse(response.getContentText());
      if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
        return result.candidates[0].content.parts[0].text;
      }
    }

    console.error(`Gemini APIエラー (${responseCode}): ${response.getContentText()}`);
    return null;

  } catch (e) {
    console.error("Gemini API呼び出しエラー: " + e.toString());
    return null;
  }
}
