// ===============================================================
// Torchバッチ処理 - メールから案件情報を抽出してAPIに送信
// ===============================================================

// スクリプトプロパティから取得
var GEMINI_API_KEY_TORCH =
  PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
var TORCH_API_URL_CONFIG =
  PropertiesService.getScriptProperties().getProperty("TORCH_API_URL");
var TORCH_API_KEY_CONFIG =
  PropertiesService.getScriptProperties().getProperty("TORCH_API_KEY");

// 設定
var TARGET_EMAIL_TORCH = "eigyo@luxy-inc.com";
var MAX_THREADS_TORCH = 200;
var MAX_PROCESS_PER_RUN = 10; // 1回の実行で処理する最大メール数（現在は制限なしで全件処理）
var API_CALL_DELAY_MS = 1000; // API呼び出し間の待機時間（ミリ秒）

// 案件関連キーワード（事前フィルタリング用）
// 重み: 高いほど案件の可能性が高い
var JOB_KEYWORDS = {
  // 高重みキーワード（案件の可能性が非常に高い）
  high: [
    "エンド直案件",
    "現場直案件",
    "直案件",
    "案件",
    "単価変更",
    "求人",
    "プロジェクト",
    "募集",
    "業務委託",
    "単価",
    "万円",
    "勤務地",
    "勤務",
    "契約",
    "常駐",
    "出社",
    "体制再構築",
  ],
  // 中重みキーワード
  medium: [
    "開発",
    "システム",
    "SIer",
    "SES",
    "PM",
    "SE",
    "PG",
    "フロントエンド",
    "バックエンド",
    "インフラ",
    "運用",
    "保守",
    "運用保守",
    "基本設計",
    "詳細設計",
  ],
  // 低重みキーワード（技術名など、案件と人材の両方に出現）
  low: [
    "AWS",
    "React",
    "Vue",
    "Java",
    "Python",
    "TypeScript",
    "Go",
    "PHP",
    "Ruby",
    "Node.js",
    "Kotlin",
    "Salesforce",
    "M365",
    "Entra",
    "Intune",
  ],
};

// 人材関連キーワード（人材メールの可能性が高い）
var TALENT_KEYWORDS = {
  // 高重みキーワード（人材の可能性が非常に高い）
  high: [
    "ご紹介",
    "要員情報",
    "要員",
    "人材",
    "個人事業主",
    "技術者のご紹介",
    "エンジニアのご紹介",
    "候補",
    "年齢",
    "希望単価",
    "希望",
    "転職",
    "フリーランス",
  ],
  // 中重みキーワード
  medium: [
    "ご提案",
    "候補者",
    "プロフィール",
    "実績",
    "スキル",
    "経験",
    "経歴",
    "履歴書",
    "レジュメ",
  ],
  // 低重みキーワード
  low: ["ご連絡", "お問い合わせ", "ご検討"],
};

// 除外キーワード（明らかに案件でも人材でもないメール）
var EXCLUDE_KEYWORDS = [
  "会議",
  "ミーティング",
  "打ち合わせ",
  "調整",
  "お疲れ様",
  "ご挨拶",
  "お礼",
  "ありがとう",
  "失礼",
  "お世話",
  "ご連絡",
  "ご報告",
];

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

    console.log(`${threads.length}件のメールスレッドが見つかりました。`);

    // 事前フィルタリング: 案件関連キーワードを含むメールのみを抽出
    const filteredMessages = [];
    let talentCount = 0; // 事前フィルタリングでスキップされた人材メール数
    for (
      let i = 0;
      i < threads.length;
      i++
    ) {
      const thread = threads[i];
      const message = thread.getMessages()[0];

      // 重複チェック: 既に処理済みのメールIDをスキップ
      if (isAlreadyProcessed(message.getId())) {
        console.log(
          `メールID: ${message.getId()} は既に処理済みのためスキップします。`
        );
        continue;
      }

      // 事前フィルタリング: キーワードチェック
      if (shouldProcessMail(message)) {
        filteredMessages.push({ thread: thread, message: message });
      } else {
        console.log(
          `メールID: ${message.getId()} は事前フィルタリングでスキップ: ${message.getSubject()}`
        );
        // 案件ではないメール = 人材メールとして扱い、talentラベルを付与
        const talentLabel = getOrCreateLabel("eigyo@luxy-inc.com/talent");
        thread.addLabel(talentLabel);
        thread.markRead();
        talentCount++;
      }
    }

    console.log(
      `${filteredMessages.length}件のメールを処理します。`
    );

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < filteredMessages.length; i++) {
      const { thread, message } = filteredMessages[i];

      try {
        // API呼び出し間隔を制御（最初のリクエスト以外）
        if (i > 0) {
          Utilities.sleep(API_CALL_DELAY_MS);
        }

        const result = processSingleMail(message);

        if (result === "success") {
          successCount++;
          markAsProcessed(message.getId());
          // 案件メールに "eigyo@luxy-inc.com/job" ラベルを追加
          const jobLabel = getOrCreateLabel("eigyo@luxy-inc.com/job");
          thread.addLabel(jobLabel);
          thread.markRead();
        } else if (result === "skip") {
          skipCount++;
          markAsProcessed(message.getId());
          // 人材メールに "eigyo@luxy-inc.com/talent" ラベルを追加
          const talentLabel = getOrCreateLabel("eigyo@luxy-inc.com/talent");
          thread.addLabel(talentLabel);
          thread.markRead();
        } else {
          errorCount++;
        }
      } catch (e) {
        // レート制限エラーの場合は処理を中断
        if (e.toString().includes("RATE_LIMIT_EXCEEDED")) {
          console.error("APIレート制限に達したため、処理を中断します。");
          break;
        }
        console.error(
          `スレッド(ID: ${thread.getId()})の処理中にエラー: ${e.toString()}`
        );
        errorCount++;
      }
    }

    // 統計情報を出力
    const totalCount = threads.length;
    const jobCount = successCount; // 案件メール数
    const totalTalentCount = talentCount + skipCount; // 人材メール数（事前フィルタリング + Gemini解析結果）

    console.log("=== 処理結果統計 ===");
    console.log(`全体数: ${totalCount}件`);
    console.log(`案件メール数: ${jobCount}件`);
    console.log(
      `人材メール数: ${totalTalentCount}件（事前フィルタリング: ${talentCount}件, Gemini解析後: ${skipCount}件）`
    );
    console.log(`エラー数: ${errorCount}件`);
  } catch (e) {
    console.error(
      "メール検索または処理ループ全体でエラーが発生しました: " + e.toString()
    );
  }
}

/**
 * メールが処理対象かどうかを判定（事前フィルタリング）
 * 案件と人材を切り分け、案件メールのみを処理対象とする
 * @param {GmailMessage} message - Gmailメッセージオブジェクト
 * @returns {boolean} 処理対象（案件メール）の場合true
 */
function shouldProcessMail(message) {
  const subject = message.getSubject().toLowerCase();
  const body = message.getPlainBody().toLowerCase();
  const text = (subject + " " + body).toLowerCase();

  // 除外キーワードが含まれている場合はスキップ
  for (let i = 0; i < EXCLUDE_KEYWORDS.length; i++) {
    if (text.includes(EXCLUDE_KEYWORDS[i].toLowerCase())) {
      // ただし、案件キーワードも含まれている場合は処理対象
      let hasJobKeyword = false;
      // 高重みキーワードをチェック
      for (let j = 0; j < JOB_KEYWORDS.high.length; j++) {
        if (text.includes(JOB_KEYWORDS.high[j].toLowerCase())) {
          hasJobKeyword = true;
          break;
        }
      }
      if (!hasJobKeyword) {
        return false;
      }
    }
  }

  // 人材キーワードの重みを計算（人材の可能性が高い場合はスキップ）
  let talentScore = 0;
  for (let i = 0; i < TALENT_KEYWORDS.high.length; i++) {
    if (text.includes(TALENT_KEYWORDS.high[i].toLowerCase())) {
      talentScore += 3; // 高重みは3点
    }
  }
  for (let i = 0; i < TALENT_KEYWORDS.medium.length; i++) {
    if (text.includes(TALENT_KEYWORDS.medium[i].toLowerCase())) {
      talentScore += 2; // 中重みは2点
    }
  }
  for (let i = 0; i < TALENT_KEYWORDS.low.length; i++) {
    if (text.includes(TALENT_KEYWORDS.low[i].toLowerCase())) {
      talentScore += 1; // 低重みは1点
    }
  }

  // 人材の可能性が高い場合はスキップ
  if (talentScore >= 3) {
    return false;
  }

  // 案件キーワードの重みを計算
  let jobScore = 0;
  for (let i = 0; i < JOB_KEYWORDS.high.length; i++) {
    if (text.includes(JOB_KEYWORDS.high[i].toLowerCase())) {
      jobScore += 3; // 高重みは3点
    }
  }
  for (let i = 0; i < JOB_KEYWORDS.medium.length; i++) {
    if (text.includes(JOB_KEYWORDS.medium[i].toLowerCase())) {
      jobScore += 2; // 中重みは2点
    }
  }
  for (let i = 0; i < JOB_KEYWORDS.low.length; i++) {
    if (text.includes(JOB_KEYWORDS.low[i].toLowerCase())) {
      jobScore += 1; // 低重みは1点
    }
  }

  // 案件の可能性が高い場合は処理対象
  return jobScore >= 2;
}

/**
 * メールIDが既に処理済みかどうかをチェック
 * @param {string} messageId - メールID
 * @returns {boolean} 処理済みの場合true
 */
function isAlreadyProcessed(messageId) {
  const cache = CacheService.getScriptCache();
  const key = "processed_" + messageId;
  return cache.get(key) !== null;
}

/**
 * メールIDを処理済みとしてマーク
 * @param {string} messageId - メールID
 */
function markAsProcessed(messageId) {
  const cache = CacheService.getScriptCache();
  const key = "processed_" + messageId;
  // 7日間キャッシュ（最大6時間なので、複数回に分けて保存）
  cache.put(key, "1", 21600); // 6時間
}

/**
 * 個別メールを処理
 * @returns {string} 'success' | 'skip' | 'error'
 */
function processSingleMail(message) {
  try {
    const mailBody = message.getPlainBody().replace(/(\r\n|\n|\r){2,}/g, "\n");
    if (!mailBody || mailBody.trim() === "") {
      console.log(
        `メールID: ${message.getId()} は本文が空のためスキップします。`
      );
      return "skip";
    }

    const from = message.getFrom();
    const subject = message.getSubject();
    const mailDate = message.getDate();

    console.log(`メール処理開始: ${subject}`);

    // Gemini APIで案件情報を抽出
    const prompt = createJobExtractionPrompt(mailBody, subject);
    const apiResult = callGeminiAPI(prompt);

    if (!apiResult.success) {
      if (apiResult.isRateLimited) {
        console.error(
          `メールID: ${message.getId()} のAI解析がレート制限により失敗しました。処理を中断します。`
        );
        // レート制限の場合は特別なエラーコードを返す
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      console.error(`メールID: ${message.getId()} のAI解析に失敗しました。`);
      return "error";
    }

    let jobData;
    try {
      jobData = JSON.parse(apiResult.data);
    } catch (e) {
      console.error(`JSONパースエラー: ${apiResult.data}`);
      return "error";
    }

    // 案件情報が見つからない場合はスキップ
    if (!jobData.title || jobData.title.trim() === "") {
      console.log(
        `メールID: ${message.getId()} からは案件情報が見つかりませんでした。`
      );
      return "skip";
    }

    // Torch APIに送信
    const torchApiResult = sendToTorchAPI({
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
      receivedAt: mailDate.toISOString(),
      skills: jobData.skills || [],
    });

    if (torchApiResult.success) {
      console.log(
        `案件を保存しました: ${jobData.title} (ID: ${torchApiResult.jobId})`
      );
      return "success";
    } else {
      console.error(`API送信エラー: ${torchApiResult.error}`);
      return "error";
    }
  } catch (e) {
    console.error(
      `メール(ID: ${message.getId()})の処理中にエラー: ${e.toString()}`
    );
    return "error";
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
1. このメールが案件情報（求人情報、プロジェクト募集、業務委託案件）を含む場合のみ、情報を抽出してください
2. 人材情報（エンジニアの経歴書、スキルシート）の場合は、titleを空文字にしてください
3. 営業メール、挨拶メール、会議調整などの場合も、titleを空文字にしてください
4. 各項目は以下のルールに従って抽出してください：

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
 * @param {string} prompt - プロンプト文字列
 * @returns {Object} { success: boolean, data: string | null, isRateLimited: boolean }
 */
function callGeminiAPI(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY_TORCH}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
    },
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      const result = JSON.parse(responseText);
      if (
        result.candidates &&
        result.candidates[0].content &&
        result.candidates[0].content.parts[0].text
      ) {
        return {
          success: true,
          data: result.candidates[0].content.parts[0].text,
          isRateLimited: false,
        };
      }
    }

    // レート制限エラーの検出
    const isRateLimited =
      responseCode === 429 ||
      (responseCode >= 500 && responseCode < 600) ||
      responseText.includes("quota") ||
      responseText.includes("rate limit");

    console.error(`Gemini APIエラー (${responseCode}): ${responseText}`);
    return { success: false, data: null, isRateLimited: isRateLimited };
  } catch (e) {
    console.error("Gemini API呼び出しエラー: " + e.toString());
    return { success: false, data: null, isRateLimited: false };
  }
}

/**
 * Torch APIに案件情報を送信
 */
function sendToTorchAPI(jobData) {
  const url = `${TORCH_API_URL_CONFIG}/api/jobs/import`;

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "X-API-Key": TORCH_API_KEY_CONFIG,
    },
    payload: JSON.stringify(jobData),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      return JSON.parse(responseBody);
    } else {
      console.error(`Torch APIエラー (${responseCode}): ${responseBody}`);
      return { success: false, error: `API returned ${responseCode}` };
    }
  } catch (e) {
    console.error("Torch API呼び出しエラー: " + e.toString());
    return { success: false, error: e.toString() };
  }
}
