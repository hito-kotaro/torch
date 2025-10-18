// ===============================================================
// Torchバッチ処理 - メールから案件情報を抽出してAPIに送信
// ===============================================================

// スクリプトプロパティから取得
var GEMINI_API_KEY_TORCH = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
var TORCH_API_URL_CONFIG = PropertiesService.getScriptProperties().getProperty('TORCH_API_URL');
var TORCH_API_KEY_CONFIG = PropertiesService.getScriptProperties().getProperty('TORCH_API_KEY');

// 設定
var TARGET_EMAIL_TORCH = "eigyo@luxy-inc.com";
var MAX_THREADS_TORCH = 100;

/**
 * メール自動処理トリガー（5分ごとに実行）
 */
function processEmailsTrigger() {
  if (!GEMINI_API_KEY_TORCH || !TORCH_API_URL_CONFIG || !TORCH_API_KEY_CONFIG) {
    console.error("必要な環境変数が設定されていません。");
    return;
  }

  // 前日の日付を取得
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate = Utilities.formatDate(yesterday, "JST", "yyyy/MM/dd");
  const query = `to:${TARGET_EMAIL_TORCH} is:unread after:${formattedDate}`;

  try {
    const threads = GmailApp.search(query, 0, MAX_THREADS_TORCH);
    if (threads.length === 0) {
      console.log("処理対象の未読メールはありませんでした。");
      return;
    }

    console.log(`${threads.length}件のメールスレッドを処理します。`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    threads.forEach(function(thread) {
      try {
        const message = thread.getMessages()[0];
        const result = processSingleMail(message);

        if (result === 'success') {
          successCount++;
          thread.markRead();
        } else if (result === 'skip') {
          skipCount++;
          thread.markRead();
        } else {
          errorCount++;
        }
      } catch (e) {
        console.error(`スレッド(ID: ${thread.getId()})の処理中にエラー: ${e.toString()}`);
        errorCount++;
      }
    });

    console.log(`処理完了: 成功=${successCount}, スキップ=${skipCount}, エラー=${errorCount}`);

  } catch (e) {
    console.error("メール検索または処理ループ全体でエラーが発生しました: " + e.toString());
  }
}

/**
 * 個別メールを処理
 * @returns {string} 'success' | 'skip' | 'error'
 */
function processSingleMail(message) {
  try {
    const mailBody = message.getPlainBody().replace(/(\r\n|\n|\r){2,}/g, '\n');
    if (!mailBody || mailBody.trim() === "") {
      console.log(`メールID: ${message.getId()} は本文が空のためスキップします。`);
      return 'skip';
    }

    const from = message.getFrom();
    const subject = message.getSubject();
    const mailDate = message.getDate();

    console.log(`メール処理開始: ${subject}`);

    // ステップ1: メールの種類を判定（人材 or 案件 or その他）
    const typePrompt = createTypeDetectionPrompt(mailBody, subject);
    const typeResponse = callGeminiAPI(typePrompt);

    if (!typeResponse) {
      console.error(`メールID: ${message.getId()} の種類判定に失敗しました。`);
      return 'error';
    }

    let typeData;
    try {
      typeData = JSON.parse(typeResponse);
    } catch (e) {
      console.error(`種類判定JSONパースエラー: ${typeResponse}`);
      return 'error';
    }

    console.log(`メール種類判定: ${typeData.type} (確信度: ${typeData.confidence})`);

    // 確信度が低い場合、またはその他の場合はスキップ
    if (typeData.confidence !== 'high' || typeData.type === 'other') {
      console.log(`メールID: ${message.getId()} は処理対象外のためスキップします。種類: ${typeData.type}, 確信度: ${typeData.confidence}`);
      return 'skip';
    }

    // ステップ2: 種類に応じて情報を抽出
    let extractedData;
    let prompt;

    if (typeData.type === 'talent') {
      prompt = createTalentExtractionPrompt(mailBody, subject);
    } else if (typeData.type === 'job') {
      prompt = createJobExtractionPrompt(mailBody, subject);
    } else {
      console.log(`メールID: ${message.getId()} は不明な種類のためスキップします。`);
      return 'skip';
    }

    const aiResponse = callGeminiAPI(prompt);

    if (!aiResponse) {
      console.error(`メールID: ${message.getId()} のAI解析に失敗しました。`);
      return 'error';
    }

    try {
      extractedData = JSON.parse(aiResponse);
    } catch (e) {
      console.error(`JSONパースエラー: ${aiResponse}`);
      return 'error';
    }

    // ステップ3: 適切なAPIに送信
    let apiResult;

    if (typeData.type === 'talent') {
      // 人材情報が見つからない場合はスキップ
      if (!extractedData.summary || extractedData.summary.trim() === "") {
        console.log(`メールID: ${message.getId()} からは人材情報が見つかりませんでした。`);
        return 'skip';
      }

      apiResult = sendToTalentAPI({
        name: extractedData.name,
        age: extractedData.age,
        position: extractedData.position,
        workStyle: extractedData.workStyle,
        location: extractedData.location,
        unitPrice: extractedData.unitPrice,
        summary: extractedData.summary,
        description: extractedData.description,
        originalTitle: subject,
        originalBody: mailBody,
        senderEmail: from,
        receivedAt: mailDate.toISOString(),
        skills: extractedData.skills || []
      });

      if (apiResult.success) {
        console.log(`人材を保存しました: ${extractedData.name || '非公開'} (ID: ${apiResult.talentId})`);
        return 'success';
      } else {
        console.error(`人材API送信エラー: ${apiResult.error}`);
        return 'error';
      }

    } else if (typeData.type === 'job') {
      // 案件情報が見つからない場合はスキップ
      if (!extractedData.title || extractedData.title.trim() === "") {
        console.log(`メールID: ${message.getId()} からは案件情報が見つかりませんでした。`);
        return 'skip';
      }

      apiResult = sendToJobAPI({
        title: extractedData.title,
        company: extractedData.company,
        grade: extractedData.grade,
        location: extractedData.location,
        unitPrice: extractedData.unitPrice,
        summary: extractedData.summary,
        description: extractedData.description,
        originalTitle: subject,
        originalBody: mailBody,
        senderEmail: from,
        receivedAt: mailDate.toISOString(),
        skills: extractedData.skills || []
      });

      if (apiResult.success) {
        console.log(`案件を保存しました: ${extractedData.title} (ID: ${apiResult.jobId})`);
        return 'success';
      } else {
        console.error(`案件API送信エラー: ${apiResult.error}`);
        return 'error';
      }
    }

  } catch(e) {
    console.error(`メール(ID: ${message.getId()})の処理中にエラー: ${e.toString()}`);
    return 'error';
  }
}

/**
 * メール種類判定用のプロンプト
 */
function createTypeDetectionPrompt(mailBody, subject) {
  return `
以下のメールが「人材情報」「案件情報」「その他」のいずれかを判定してください。

【メール件名】
${subject}

【メール本文】
${mailBody}

【判定基準】
- **人材情報(talent)**: エンジニアのスキルシート、経歴書、人材紹介、稼働可能な人の情報
  - キーワード例: 「スキルシート」「経歴書」「〇〇歳」「参画可能」「稼働中」「ご紹介」「人材」「エンジニア募集」ではなく「エンジニア紹介」
- **案件情報(job)**: プロジェクト募集、業務委託案件、求人情報
  - キーワード例: 「案件」「募集」「プロジェクト」「参画者募集」「〇〇万円/月」で募集している
- **その他(other)**: 営業メール、挨拶、会議調整、問い合わせ、返信など

【重要】
- 迷った場合は確信度を"low"または"medium"にしてください
- 人材情報と案件情報が混在している場合は、メインの内容で判定してください
- 件名だけでなく本文の内容を重視してください

【出力形式】
必ず以下のJSON形式で返却してください。

\`\`\`json
{
  "type": "talent" | "job" | "other",
  "confidence": "high" | "medium" | "low",
  "reason": "判定理由を簡潔に"
}
\`\`\`
`;
}

/**
 * 人材情報抽出用のプロンプト
 */
function createTalentExtractionPrompt(mailBody, subject) {
  return `
以下のメール本文から、人材情報を抽出してJSON形式で出力してください。

【メール件名】
${subject}

【メール本文】
${mailBody}

【抽出ルール】
- **name**: 名前（匿名の場合はnull）
- **age**: 年齢（数値のみ）
- **position**: ポジション。必ず以下のいずれかを設定してください（必須項目）
  - チームリーダー: チームリーダー、リーダー
  - テックリード: テックリード、技術責任者
  - PMO: PMO
  - PM: プロジェクトマネージャー、マネージャー
  - SE: その他のエンジニア（デフォルト）
  ※明示されていない場合、またはどれにも該当しない場合は必ず「SE」を設定してください
- **workStyle**: 勤務形態（例: "常駐可", "リモート希望", "週3日リモート"）
- **location**: 希望勤務地（例: "東京都渋谷区"）
- **unitPrice**: 希望単価（数値のみ、万円単位）
  - 「70万円(140-200)」 → 70（括弧内は無視）
  - 「60~70万」 → 65（中央値）
  - 「80万～100万」 → 90（中央値）
- **summary**: 経歴概要（200字以内で要約）
- **description**: 詳細経歴（業務経験、プロジェクト履歴など）
- **skills**: 保有スキルの配列
  - 技術名を正確に抽出し、以下の表記ルールに従って正規化してください
  - 大文字小文字: .NET, JavaScript, TypeScript, MySQL, PostgreSQL, GitHub, Git, Linux
  - スラッシュ表記: CI/CD, HTML/CSS, PL/SQL
  - スペース表記: React Native, Spring Boot, AWS Lambda, AWS S3, SQL Server
  - ハイフン表記: Intra-mart
  - フレームワーク略記: React（React.jsではなく）, Vue（Vue.jsではなく）, Next.js, Nest.js
  - 製品名: VMware, Windows Server, Microsoft 365, Power BI, Oracle DB
  - その他の統一表記: Palo Alto, Entra ID, Kubernetes（K8sではなく）, SageMaker

【出力形式】
必ず以下のJSON形式で、\`\`\`json ... \`\`\` のブロックで返却してください。

\`\`\`json
{
  "name": null,
  "age": null,
  "position": "SE",
  "workStyle": "",
  "location": "",
  "unitPrice": null,
  "summary": "",
  "description": "",
  "skills": []
}
\`\`\`

※注意: positionは必須項目です。nullは不可。
`;
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
このメールから案件情報を抽出してください。以下のルールに従って抽出してください：

## 抽出ルール

- **title**: 案件のタイトル。メールから適切な案件名を生成してください（例: "React/TypeScript フロントエンドエンジニア"）
- **company**: 企業名またはクライアント名
- **grade**: ポジション。必ず以下のいずれかを設定してください（必須項目）
  - チームリーダー: チームリーダー、リーダー
  - テックリード: テックリード、技術責任者
  - PMO: PMO
  - PM: プロジェクトマネージャー、マネージャー
  - SE: その他のエンジニア（デフォルト）
  ※明示されていない場合、またはどれにも該当しない場合は必ず「SE」を設定してください
- **location**: 勤務地（例: "東京都渋谷区"）
- **unitPrice**: 単価（数値のみ、万円単位）
  - 「70万円(140-200)」 → 70（括弧内は無視）
  - 「60~70万」 → 60（下限）
  - 「550,000円」 → 55（10000で割る）
  - 「80万～100万」 → 100（上限）
- **summary**: 案件概要（200字以内で要約）
- **description**: 詳細説明（業務内容、開発環境など）
- **skills**: 必要なスキルの配列（例: ["React", "TypeScript", "AWS"]）
  - 技術名を正確に抽出し、以下の表記ルールに従って正規化してください
  - 大文字小文字: .NET, JavaScript, TypeScript, MySQL, PostgreSQL, GitHub, Git, Linux
  - スラッシュ表記: CI/CD, HTML/CSS, PL/SQL
  - スペース表記: React Native, Spring Boot, AWS Lambda, AWS S3, SQL Server
  - ハイフン表記: Intra-mart
  - フレームワーク略記: React（React.jsではなく）, Vue（Vue.jsではなく）, Next.js, Nest.js
  - 製品名: VMware, Windows Server, Microsoft 365, Power BI, Oracle DB
  - その他の統一表記: Palo Alto, Entra ID, Kubernetes（K8sではなく）, SageMaker

【出力形式】
必ず以下のJSON形式で、\`\`\`json ... \`\`\` のブロックで返却してください。

\`\`\`json
{
  "title": "",
  "company": "",
  "grade": "SE",
  "location": "",
  "unitPrice": null,
  "summary": "",
  "description": "",
  "skills": []
}
\`\`\`

※注意: gradeは必須項目です。nullは不可。
`;
}

/**
 * Gemini APIを呼び出す
 */
function callGeminiAPI(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY_TORCH}`;

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

/**
 * 案件APIに送信
 */
function sendToJobAPI(jobData) {
  const url = `${TORCH_API_URL_CONFIG}/api/jobs/import`;

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-API-Key': TORCH_API_KEY_CONFIG
    },
    payload: JSON.stringify(jobData),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      return JSON.parse(responseBody);
    } else {
      console.error(`案件APIエラー (${responseCode}): ${responseBody}`);
      return { success: false, error: `API returned ${responseCode}` };
    }

  } catch (e) {
    console.error("案件API呼び出しエラー: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * 人材APIに送信
 */
function sendToTalentAPI(talentData) {
  const url = `${TORCH_API_URL_CONFIG}/api/talents/import`;

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-API-Key': TORCH_API_KEY_CONFIG
    },
    payload: JSON.stringify(talentData),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      return JSON.parse(responseBody);
    } else {
      console.error(`人材APIエラー (${responseCode}): ${responseBody}`);
      return { success: false, error: `API returned ${responseCode}` };
    }

  } catch (e) {
    console.error("人材API呼び出しエラー: " + e.toString());
    return { success: false, error: e.toString() };
  }
}
