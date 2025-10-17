// ===============================================================
// NeonDB接続設定
// ===============================================================

// スクリプトプロパティから取得
const DB_HOST = PropertiesService.getScriptProperties().getProperty('DB_HOST');
const DB_NAME = PropertiesService.getScriptProperties().getProperty('DB_NAME');
const DB_USER = PropertiesService.getScriptProperties().getProperty('DB_USER');
const DB_PASSWORD = PropertiesService.getScriptProperties().getProperty('DB_PASSWORD');

/**
 * NeonDBにSQLを実行する
 */
function executeSQL(sql, params) {
  const url = `https://${DB_HOST}/sql`;

  const payload = {
    query: sql,
    params: params || []
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${DB_PASSWORD}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      return JSON.parse(response.getContentText());
    } else {
      console.error(`SQL実行エラー (${responseCode}): ${response.getContentText()}`);
      return null;
    }
  } catch (e) {
    console.error('SQL実行エラー: ' + e.toString());
    return null;
  }
}

/**
 * Jobを保存する
 */
function saveJob(jobData) {
  const sql = `
    INSERT INTO "Job" (
      id, title, company, grade, location, "unitPrice",
      summary, description, "originalTitle", "originalBody",
      "senderEmail", "receivedAt", "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING id
  `;

  const now = new Date().toISOString();
  const id = generateCUID();

  const params = [
    id,
    jobData.title,
    jobData.company || null,
    jobData.grade || null,
    jobData.location || null,
    jobData.unitPrice || null,
    jobData.summary || null,
    jobData.description || null,
    jobData.originalTitle,
    jobData.originalBody,
    jobData.senderEmail,
    jobData.receivedAt.toISOString(),
    now,
    now
  ];

  const result = executeSQL(sql, params);
  if (!result) {
    throw new Error('Job保存に失敗しました');
  }

  return id;
}

/**
 * スキルを取得または作成
 */
function getOrCreateSkill(skillName) {
  // スキルを検索
  let sql = `SELECT id FROM "Skill" WHERE name = $1`;
  let result = executeSQL(sql, [skillName]);

  if (result && result.rows && result.rows.length > 0) {
    return result.rows[0].id;
  }

  // 存在しない場合は作成
  const id = generateCUID();
  const now = new Date().toISOString();

  sql = `
    INSERT INTO "Skill" (id, name, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;

  result = executeSQL(sql, [id, skillName, now, now]);

  if (!result || !result.rows || result.rows.length === 0) {
    throw new Error(`スキル作成に失敗しました: ${skillName}`);
  }

  return id;
}

/**
 * JobとSkillを関連付け
 */
function linkJobSkill(jobId, skillId) {
  const id = generateCUID();
  const sql = `
    INSERT INTO "JobSkill" (id, "jobId", "skillId")
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `;

  executeSQL(sql, [id, jobId, skillId]);
}

/**
 * CUID生成（簡易版）
 */
function generateCUID() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return 'c' + timestamp + randomPart;
}
