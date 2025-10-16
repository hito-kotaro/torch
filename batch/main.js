// ===============================================================
// グローバル設定
// ===============================================================
// スプレッドシートID (スクリプトプロパティから取得)
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
// 対象メールアドレス
const TARGET_EMAIL_ADDRESS = "eigyo@luxy-inc.com";
// 自社ドメイン
const MY_COMPANY_DOMAIN = "luxy-inc.com";
// 処理するメールの上限数
const MAX_THREADS_PER_EXECUTION = 100;
// 古いデータを削除する日数
const DELETE_DATA_OLDER_THAN_DAYS = 14;

// スクリプトプロパティからAPIキーを取得
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

// シート名
const SHEET_NAME_JINZAI = "人材DB";
const SHEET_NAME_ANKEN = "案件DB";

// ===============================================================
// Webアプリケーションの提供
// ===============================================================

/**
 * WebアプリケーションにアクセスされたときにHTMLを返す
 */
function doGet(e) {
  if (!SPREADSHEET_ID) {
    return HtmlService.createHtmlOutput('<h1>エラー: スプレッドシートIDが設定されていません。</h1><p>スクリプトプロパティで SPREADSHEET_ID を設定してください。</p>');
  }
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('AIメール情報管理システム')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ===============================================================
// URL横断検索機能
// ===============================================================

// URL横断検索のバッチサイズ
const BATCH_SIZE = 5; 

/**
 * URL横断検索の初期化と最初のバッチ処理を開始する
 */
function initializeUrlSearch(urlsString, keyword, sessionId) {
  if (!keyword || !keyword.trim()) {
    throw new Error("キーワードが指定されていません。");
  }
  const urls = urlsString.split('\n').map(function(url) { return url.trim(); }).filter(Boolean);
  if (urls.length === 0) {
    throw new Error("URLが入力されていません。");
  }

  const cache = CacheService.getUserCache(); // UserCacheを使用
  cache.put(sessionId + '_urls', urlsString, 600); // 10分間キャッシュ
  cache.put(sessionId + '_keyword', keyword, 600);

  return { totalUrls: urls.length };
}

/**
 * URLのバッチを処理する
 */
function processUrlBatch(sessionId, startIndex) {
  const cache = CacheService.getUserCache();
  const urlsString = cache.get(sessionId + '_urls');
  const keyword = cache.get(sessionId + '_keyword');

  if (!urlsString || !keyword) {
    return { success: false, error: "セッションデータが見つかりません。再度検索を開始してください。", matchingUrls: [], errors: [], processedCount: 0, nextStartIndex: null };
  }

  const allUrls = urlsString.split('\n').map(function(url) { return url.trim(); }).filter(Boolean);
  const lowerCaseKeyword = keyword.toLowerCase();

  const batchUrls = allUrls.slice(startIndex, startIndex + BATCH_SIZE);
  const matchingUrls = [];
  const errors = [];

  batchUrls.forEach(function(url) {
    try {
      let content = '';
      // Check if it's a Google Drive URL
      const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]{25,})/);
      if (driveMatch && driveMatch[1]) {
        const fileId = driveMatch[1];
        const file = DriveApp.getFileById(fileId);
        const mimeType = file.getMimeType();
        let tempFileId = null; // 一時的に作成されたファイルのID

        try {
          switch (mimeType) {
            case MimeType.GOOGLE_SHEETS:
              const spreadsheet = SpreadsheetApp.openById(fileId);
              spreadsheet.getSheets().forEach(function(sheet) {
                content += sheet.getDataRange().getValues().map(function(row) { return row.join(' '); }).join('\n');
              });
              break;
            case MimeType.MICROSOFT_EXCEL:
            case MimeType.MICROSOFT_EXCEL_LEGACY:
              // ExcelファイルをGoogleスプレッドシートに変換して処理
              const blob = file.getBlob();
              const newFile = Drive.Files.create({
                title: `Temp_Converted_Excel_${fileId}`,
                mimeType: MimeType.GOOGLE_SHEETS
              }, blob);
              tempFileId = newFile.id;
              
              const tempSpreadsheet = SpreadsheetApp.openById(tempFileId);
              tempSpreadsheet.getSheets().forEach(function(sheet) {
                content += sheet.getDataRange().getValues().map(function(row) { return row.join(' '); }).join('\n');
              });
              break;
            case MimeType.GOOGLE_DOCS:
              content = DocumentApp.openById(fileId).getBody().getText();
              break;
            case MimeType.PLAIN_TEXT:
            case MimeType.CSS:
            case MimeType.HTML:
            case MimeType.JAVASCRIPT:
               content = file.getBlob().getDataAsString();
               break;
            default:
              throw new Error(`サポートされていないGoogleドライブのファイル形式です: ${mimeType}`);
          }
        } finally {
          // 一時ファイルが存在すれば削除
          if (tempFileId) {
            try {
              Drive.Files.remove(tempFileId);
              console.log(`一時ファイル ${tempFileId} を削除しました。`);
            } catch (deleteError) {
              console.error(`一時ファイル ${tempFileId} の削除に失敗しました: ${deleteError.toString()}`);
            }
          }
        }
      } else {
        // Assume it's a public web page
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        const responseCode = response.getResponseCode();
        if (responseCode === 200) {
          content = response.getContentText();
        } else {
          throw new Error(`サーバーからエラーが返されました (コード: ${responseCode})`);
        }
      }

      if (content.toLowerCase().includes(lowerCaseKeyword)) {
        matchingUrls.push(url);
      }

    } catch (e) {
      let errorMessage = e.message;
      if (e.message.includes("You do not have permission") || e.message.includes("Access Denied")) {
        errorMessage = "アクセス権限がありません。";
      } else if (e.message.includes("Not Found")) {
        errorMessage = "ファイルまたはURLが見つかりません。";
      } else if (e.message.includes("Service invoked too many times")) {
        errorMessage = "Google Apps Scriptのサービス制限に達しました。しばらくしてから再度お試しください。";
      }
      errors.push({ url: url, message: errorMessage });
      console.error(`URL検索エラー (${url}): ${e.toString()}`);
    }
  });

  const nextStartIndex = startIndex + BATCH_SIZE;
  const isLastBatch = nextStartIndex >= allUrls.length;

  return {
    success: true,
    matchingUrls: matchingUrls,
    errors: errors,
    processedCount: batchUrls.length,
    totalUrls: allUrls.length,
    nextStartIndex: isLastBatch ? null : nextStartIndex
  };
}

/**
 * セッションデータをクリアする
 */
function clearUrlSearchSession(sessionId) {
  const cache = CacheService.getUserCache();
  cache.remove(sessionId + '_urls');
  cache.remove(sessionId + '_keyword');
  console.log(`セッション ${sessionId} のキャッシュをクリアしました。`);
}


// ===============================================================
// URLからのインポート機能
// ===============================================================


function importFromUrls(urlsString) {
  if (!GEMINI_API_KEY || !SPREADSHEET_ID) {
    return { success: false, message: "サーバー側でAPIキーまたはスプレッドシートIDが設定されていません。" };
  }

  const urls = urlsString.split('\n').map(function(url) { return url.trim(); }).filter(Boolean);
  if (urls.length === 0) {
    return { success: false, message: "URLが入力されていません。" };
  }

  let totalImportedCount = 0;
  const results = [];

  urls.forEach(function(url) {
    try {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]{25,})/);
      if (!match || !match[1]) {
        throw new Error("有効なGoogleドライブのURL形式ではありません。");
      }
      const fileId = match[1];

      const file = DriveApp.getFileById(fileId);
      const mimeType = file.getMimeType();
      let tempFileId = null; // 一時的に作成されたファイルのID
      let spreadsheetToOpen = null;

      try {
        const allowedMimeTypes = [
          MimeType.GOOGLE_SHEETS,
          MimeType.MICROSOFT_EXCEL,
          MimeType.MICROSOFT_EXCEL_LEGACY
        ];

        if (!allowedMimeTypes.includes(mimeType)) {
          let fileType = "不明なファイル";
          if (mimeType === MimeType.GOOGLE_DOCS) fileType = "Googleドキュメント";
          else if (mimeType === MimeType.GOOGLE_SLIDES) fileType = "Googleスライド";
          else if (mimeType === MimeType.PDF) fileType = "PDF";
          else fileType = `サポートされていないファイル形式 (${mimeType})`;
          
          throw new Error(`このファイルは「${fileType}」です。スプレッドシートまたはExcelファイルではありません。`);
        }

        if (mimeType === MimeType.MICROSOFT_EXCEL || mimeType === MimeType.MICROSOFT_EXCEL_LEGACY) {
          // ExcelファイルをGoogleスプレッドシートに変換
          const blob = file.getBlob();
          const newFile = Drive.Files.create({
            title: `Temp_Import_Excel_${fileId}`,
            mimeType: MimeType.GOOGLE_SHEETS
          }, blob);
          tempFileId = newFile.id;
          spreadsheetToOpen = SpreadsheetApp.openById(tempFileId);
        } else {
          spreadsheetToOpen = SpreadsheetApp.openById(fileId);
        }
      
        const sheets = spreadsheetToOpen.getSheets();

        sheets.forEach(function(sourceSheet) {
          const sourceSheetName = sourceSheet.getName();
          try {
            const sourceData = sourceSheet.getDataRange().getValues();
            if (sourceData.length < 2) {
              results.push(`⚠️ スキップ: シート「${sourceSheetName}」- データが2行未満です。`);
              return;
            }

            const sourceHeaders = sourceData.shift();
            
            const dbType = determineSheetType(sourceHeaders, sourceData.slice(0, 5));
            
            if (!dbType || dbType === 'other') {
              results.push(`⚠️ スキップ: シート「${sourceSheetName}」- 人材・案件情報ではないため処理対象外とします。`);
              return;
            }
            
            const sheetName = dbType === 'jinzai' ? SHEET_NAME_JINZAI : SHEET_NAME_ANKEN;
            const dbNameForLog = dbType === 'jinzai' ? "人材DB" : "案件DB";

            console.log(`[Import] URL: ${url}, Sheet: ${sourceSheetName}, Type: ${dbType}. Converting ${sourceData.length} rows...`);
            
            const prompt = createImportPrompt(sourceHeaders, sourceData, dbType);
            const aiResponse = callGeminiAPI(prompt, 'gemini-2.0-flash-lite');
            if (!aiResponse) {
              throw new Error("AIによるデータ変換に失敗しました。");
            }

            const importedDataArray = JSON.parse(aiResponse);
            if (!Array.isArray(importedDataArray)) {
              throw new Error("AIが予期しない形式のデータを返しました。");
            }

            console.log(`[Import] Saving ${importedDataArray.length} items to ${sheetName}`);
            importedDataArray.forEach(function(item) {
              saveToSheet(sheetName, item, new Date(), `インポート(${sourceSheetName})`, url, url);
            });

            totalImportedCount += importedDataArray.length;
            results.push(`✅ 成功: シート「${sourceSheetName}」から ${importedDataArray.length} 件を ${dbNameForLog} にインポートしました。`);

          } catch (e) {
              console.error(`シート処理エラー (URL: ${url}, Sheet: ${sourceSheetName}): ${e.toString()}`);
              results.push(`❌ 失敗: シート「${sourceSheetName}」 - ${e.message}`);
          }
        });
      } finally {
        // 一時ファイルが存在すれば削除
        if (tempFileId) {
          try {
            Drive.Files.remove(tempFileId);
            console.log(`一時ファイル ${tempFileId} を削除しました。`);
          } catch (deleteError) {
            console.error(`一時ファイル ${tempFileId} の削除に失敗しました: ${deleteError.toString()}`);
          }
        }
      }
    } catch (e) {
      console.error(`URL処理エラー (${url}): ${e.toString()}`);
      let errorMessage = e.message;
      if (e.message.includes("You do not have permission") || e.message.includes("Access Denied")) {
        errorMessage = "アクセス権限がありません。シートが共有されているか確認してください。";
      } 
      else if (e.message.includes("Service error: Spreadsheets") || e.message.includes("スプレッドシート のサービスに接続できなくなりました")) {
        errorMessage = "スプレッドシートとして開けませんでした。URLが正しいか、またはファイル形式（Excelなど）が原因である可能性があります。";
      }
      results.push(`❌ 失敗: URL「${url}」 - ${errorMessage}`);
    }
  });
  
  if (totalImportedCount > 0) {
    clearCache();
  }

  const finalMessage = `インポート処理が完了しました。\n\n【結果】\n${results.join('\n')}\n\n合計: ${totalImportedCount}件`;
  return { success: true, message: finalMessage, totalImported: totalImportedCount };
}

function determineSheetType(headers, dataSample) {
  const prompt = createContentTypeDeterminationPrompt(headers, dataSample);
  const aiResponse = callGeminiAPI(prompt, 'gemini-2.0-flash-lite');
  if (!aiResponse) return null;
  try {
    const result = JSON.parse(aiResponse);
    return result.type || null;
  } catch (e) {
    console.error("シートタイプ判断のJSONパースに失敗:", e);
    return null;
  }
}

function createContentTypeDeterminationPrompt(headers, dataSample) {
  const sampleCSV = dataSample.map(function(row) {
    return row.map(function(cell) { return `"${String(cell).replace(/"/g, '""')}"`; }).join(',');
  }).join('\n');

  return `
以下のスプレッドシートのヘッダーとサンプルデータを分析してください。
このシートの内容が、主に「人材情報」か「案件情報」のどちらに該当するかを判断してください。
- 「人材情報」と判断した場合: "jinzai"
- 「案件情報」と判断した場合: "anken"
- どちらでもないと判断した場合: "other"
と返してください。
【判断基準】
- 人材情報には、「氏名」「年齢」「性別」「スキル」「経験」などの列が含まれる傾向があります。
- 案件情報には、「案件名」「業務内容」「必須スキル」「勤務地」「単価」などの列が含まれる傾向があります。
---
【ヘッダー】
[${headers.join(', ')}]
---
【サンプルデータ (CSV形式)】
${sampleCSV}
---
【出力形式】
必ず以下のJSON形式で、\`\`\`json ... \`\`\` のブロックで返却してください。
\`\`\`json
{
  "type": "（jinzai, anken, other のいずれか）"
}
\`\`\`
`;
}

function createImportPrompt(sourceHeaders, sourceData, dbType) {
  const targetFormat = dbType === 'jinzai' ?
`{
    "name": "", "affiliation": "", "work_style": "", "station": "", "age": "", "gender": "", "nationality": "",
    "skill_detail": "", "skill_summary": "", "skill_tags": "", "price": "", "wish_detail": "", "wish_summary": "",
    "desired_position": "", "other_detail": "", "other_summary": ""
}` :
`{
    "name": "", "summary": "", "skill_req_detail": "", "skill_req_summary": "", "required_position": "", "skill_tags": "",
    "location": "", "work_style": "", "price": "", "period": "", "other_detail": "", "other_summary": ""
}`;

  const sourceDataCSV = sourceData.map(function(row) {
    return row.map(function(cell) {
      return `"${String(cell).replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');

  return `
あなたは、異なるフォーマットの2つのデータベース間でデータを移行する専門家です。
以下の【変換元データ】を、【指示】に従って【変換先フォーマット】にマッピングし、JSON配列として出力してください。
---
【指示】
1.  【変換元データ】はCSV形式で、1行目はヘッダー、2行目以降がデータです。
2.  変換元の各行を、変換先のJSONオブジェクト1つにマッピングしてください。
3.  変換元の列名と変換先のキーの意味を推測し、最も適切にデータを割り当ててください。例えば、変換元の「氏名」や「名前」は、変換先の "name" にマッピングします。
4.  変換先のルール（年齢や単価は数字のみ抽出するなど）も可能な限り適用してください。特に「スキル」に関連する列は、カンマ区切りの "skill_tags" に変換することが重要です。
5.  変換先フォーマットに存在しないデータは無視してください。
6.  変換先フォーマットに対応するデータが変換元にない場合は、空文字("")としてください。
7.  【重要】ステータスによる除外: 変換元のデータに「ステータス」「状況」といった列があり、その値が「営業終了」「決定済」「クローズ」「終了」など、その人材や案件が現在有効でないことを示唆している場合、その行は**出力に含めないでください**。有効なデータのみを変換対象とします。
8.  最終的な出力は、必ずJSON配列の形式で、\`\`\`json ... \`\`\` のブロックで返却してください。
---
【変換先フォーマット（1行分の例）】
${targetFormat}
---
【変換元データ】
ヘッダー: ${sourceHeaders.join(',')}
データ本体 (CSV形式):
${sourceDataCSV}
---
【出力形式】
\`\`\`json
[
  { ... },
  { ... }
]
\`\`\`
`;
}

// ===============================================================
// データ取得とキャッシュ
// ===============================================================

function getSheetDataWithChunking(sheetName) {
    const cache = CacheService.getScriptCache();
    const CHUNK_INFO_KEY = SPREADSHEET_ID + '_' + sheetName + '_info';
    
    const chunkInfoJson = cache.get(CHUNK_INFO_KEY);
    if (chunkInfoJson) {
        console.log('Cache HIT for ' + sheetName + ' info.');
        const chunkInfo = JSON.parse(chunkInfoJson);
        const allData = [];
        for (let i = 0; i < chunkInfo.chunkCount; i++) {
            const chunkKey = SPREADSHEET_ID + '_' + sheetName + '_chunk_' + i;
            const chunkJson = cache.get(chunkKey);
            if (!chunkJson) {
                console.log('Cache chunk ' + i + ' for ' + sheetName + ' is missing. Refetching...');
                clearCacheForSheet(sheetName);
                return getSheetDataWithChunking(sheetName);
            }
            allData.push.apply(allData, JSON.parse(chunkJson));
        }
        console.log('Reassembled ' + allData.length + ' rows from ' + chunkInfo.chunkCount + ' chunks.');
        return { headers: chunkInfo.headers, data: allData };
    }

    console.log('Cache MISS for ' + sheetName + '. Reading from Spreadsheet.');
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);

    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return { headers: [], data: [] };
    
    const values = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
    const headers = values.shift() || [];
    const data = values;

    const MAX_CACHE_SIZE = 90 * 1024;
    const chunks = [];
    let currentChunk = [];
    let currentChunkSize = 0;

    for (let i = 0; i < data.length; i++) {
        const rowString = JSON.stringify(data[i]);
        if (currentChunk.length > 0 && currentChunkSize + rowString.length > MAX_CACHE_SIZE) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentChunkSize = 0;
        }
        currentChunk.push(data[i]);
        currentChunkSize += rowString.length;
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    const cacheables = {};
    const chunkInfo = {
        headers: headers,
        chunkCount: chunks.length
    };
    cacheables[CHUNK_INFO_KEY] = JSON.stringify(chunkInfo);

    chunks.forEach(function(chunk, i) {
        const chunkKey = SPREADSHEET_ID + '_' + sheetName + '_chunk_' + i;
        cacheables[chunkKey] = JSON.stringify(chunk);
    });

    cache.putAll(cacheables, 3600);
    console.log('Stored ' + data.length + ' rows for ' + sheetName + ' in ' + chunks.length + ' cache chunks.');

    return { headers: headers, data: data };
}

function clearCacheForSheet(sheetName) {
    const cache = CacheService.getScriptCache();
    const CHUNK_INFO_KEY = SPREADSHEET_ID + '_' + sheetName + '_info';
    const chunkInfoJson = cache.get(CHUNK_INFO_KEY);
    if (chunkInfoJson) {
        const chunkInfo = JSON.parse(chunkInfoJson);
        const keysToRemove = [CHUNK_INFO_KEY];
        for (let i = 0; i < chunkInfo.chunkCount; i++) {
            keysToRemove.push(SPREADSHEET_ID + '_' + sheetName + '_chunk_' + i);
        }
        cache.removeAll(keysToRemove);
        console.log('Cleared ' + keysToRemove.length + ' cache entries for ' + sheetName + '.');
    }
}

function clearCache() {
  clearCacheForSheet(SHEET_NAME_JINZAI);
  clearCacheForSheet(SHEET_NAME_ANKEN);
  return "キャッシュをクリアしました。";
}


// ===============================================================
// メイン機能
// ===============================================================

function searchDatabase(params, page, pageSize) {
  try {
    if (!SPREADSHEET_ID) {
      return { error: "サーバー側でスプレッドシートIDが設定されていません。" };
    }

    const sheetName = params.db_type === 'jinzai' ? SHEET_NAME_JINZAI : SHEET_NAME_ANKEN;
    
    const { headers, data } = getSheetDataWithChunking(sheetName);
    
    if (data.length === 0) {
        return { headers: headers, data: [], totalItems: 0 };
    }

    let skillSynonymMap = {};
    if (params.skill_tags && params.skill_tags.length > 0) {
      try {
        const synonymPrompt = createSynonymExpansionPrompt(params.skill_tags);
        const synonymResponse = callGeminiAPI(synonymPrompt, 'gemini-2.0-flash-lite');
        if (synonymResponse) {
          skillSynonymMap = JSON.parse(synonymResponse);
        }
      } catch(e) {
        console.error("AIによるスキル類義語の取得に失敗しました: " + e.toString());
        params.skill_tags.forEach(function(tag) {
          skillSynonymMap[tag] = [tag];
        });
      }
    }
    
    const filteredData = data.filter(function(row) {
      const rowData = headers.reduce(function(obj, header, i) {
        obj[header] = row[i];
        return obj;
      }, {});
      
      if (params.free_word) {
        const keywords = params.free_word.toLowerCase().split(/[\s　]+/).filter(Boolean);
        if (keywords.length > 0) {
          const rowText = row.join(' ').toLowerCase();
          const allKeywordsMatch = keywords.every(function(keyword) {
             return rowText.includes(keyword);
          });
          if (!allKeywordsMatch) {
            return false;
          }
        }
      }
      
      if (params.db_type === 'jinzai') {
        if (params.age_min && (rowData['年齢'] === '' || parseInt(rowData['年齢']) < parseInt(params.age_min))) return false;
        if (params.age_max && (rowData['年齢'] === '' || parseInt(rowData['年齢']) > parseInt(params.age_max))) return false;
        if (params.price_min && (rowData['希望単価'] === '' || parseInt(rowData['希望単価']) < parseInt(params.price_min))) return false;
        if (params.price_max && (rowData['希望単価'] === '' || parseInt(rowData['希望単価']) > parseInt(params.price_max))) return false;
        if (params.work_style && rowData['勤務形態'] !== params.work_style) return false;
        
        if (params.affiliation_type && params.affiliation_type !== 'all') {
            const affiliation = rowData['所属'] ? String(rowData['所属']) : '';
            const isEmployee = affiliation.includes('社員');

            if (params.affiliation_type === 'employee' && !isEmployee) {
                return false;
            }
            if (params.affiliation_type === 'other' && isEmployee) {
                return false;
            }
        }
        if (params.nationality_type && params.nationality_type !== 'all') {
            const nationality = rowData['国籍'] || '日本籍';
            if (nationality !== params.nationality_type) {
                return false;
            }
        }
      } else { // anken
         if (params.price_min && (rowData['単価'] === '' || parseInt(rowData['単価']) < parseInt(params.price_min))) return false;
         if (params.price_max && (rowData['単価'] === '' || parseInt(rowData['単価']) > parseInt(params.price_max))) return false;
         if (params.work_style && rowData['勤務形態'] !== params.work_style) return false;
      }

      if (params.skill_tags && params.skill_tags.length > 0) {
        const rowSkills = rowData['スキルタグ'] ? rowData['スキルタグ'].toLowerCase().split(',').map(function(s) { return s.trim(); }) : [];
        if (rowSkills.length === 0) return false;

        const allTagsMatch = Object.keys(skillSynonymMap).every(function(originalTag) {
          const synonyms = skillSynonymMap[originalTag].map(function(s) { return s.toLowerCase(); });
          return synonyms.some(function(synonym) {
            return rowSkills.includes(synonym);
          });
        });

        if (!allTagsMatch) {
          return false;
        }
      }
      return true;
    });
    
    filteredData.reverse();

    const totalItems = filteredData.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = filteredData.slice(start, end);

    return {
      headers: headers,
      data: paginatedData,
      totalItems: totalItems
    };

  } catch (e) {
    console.error("searchDatabase Error:", e.toString(), e.stack);
    return { error: `サーバー側で予期せぬエラーが発生しました: ${e.toString()}` };
  }
}

function createSynonymExpansionPrompt(skillTags) {
  return `
あなたはIT業界の専門用語に詳しいアシスタントです。
以下の【スキルタグリスト】に含まれる各スキルについて、一般的な類義語や別表記をリストアップしてください。

【指示】
- 各スキルタグをキーとし、その類義語の配列を値とするJSONオブジェクトを作成してください。
- 類義語には、元のスキル名自体も必ず含めてください。
- 例えば、「Go (Golang)」に対しては「Go」「Golang」「Go言語」などが考えられます。
- 「React」に対しては「React」「React.js」などが考えられます。
- 英語の大文字・小文字の違いは吸収する必要はありません。
- 最終的な出力は、必ずJSON形式で、\`\`\`json ... \`\`\` のブロックで返却してください。

【スキルタグリスト】
${JSON.stringify(skillTags)}

【出力形式の例】
\`\`\`json
{
  "Go (Golang)": ["Go (Golang)", "Go", "Golang", "Go言語"],
  "React": ["React", "React.js"],
  "AWS": ["AWS", "Amazon Web Services"]
}
\`\`\`
`;
}


function performMatching(matchType, inputText, maxResults, additionalPrompt, sourceId) {
  try {
    let sourceData;

    if (sourceId) {
        const sourceSheetName = (matchType === 'jinzai') ? SHEET_NAME_JINZAI : SHEET_NAME_ANKEN;
        const { headers, data } = getSheetDataWithChunking(sourceSheetName);
        const idIndex = headers.indexOf('ID');
        if (idIndex === -1) throw new Error("ID列が見つかりません。");
        
        const sourceRow = data.find(function(row) { return String(row[idIndex]) === String(sourceId); });
        if (!sourceRow) throw new Error("指定されたIDの情報が見つかりません: " + sourceId);
        
        sourceData = headers.reduce(function(obj, header, i) {
            obj[header.toLowerCase()] = sourceRow[i];
            return obj;
        }, {});

    } else if (inputText) {
        const parsePrompt = createPrompt(inputText);
        const parsedJsonString = callGeminiAPI(parsePrompt, 'gemini-2.5-flash');
        if (!parsedJsonString) throw new Error("入力情報の解析に失敗しました。");
        
        let parsedData;
        try {
            parsedData = JSON.parse(parsedJsonString);
        } catch(e) {
            const trimmedResponse = parsedJsonString.trim();
            if (trimmedResponse.startsWith('[') && trimmedResponse.endsWith(']')) {
                const tempArray = JSON.parse(trimmedResponse);
                if (tempArray.length > 0) parsedData = tempArray[0];
            }
            if (!parsedData) throw e;
        }
        sourceData = (matchType === 'jinzai') ? parsedData.jinzai : parsedData.anken;
        if (!sourceData || !sourceData.name) throw new Error("入力情報から氏名または案件名を抽出できませんでした。");
    } else {
        throw new Error("マッチング元の情報（IDまたはテキスト）が指定されていません。");
    }


    const targetSheetName = (matchType === 'jinzai') ? SHEET_NAME_ANKEN : SHEET_NAME_JINZAI;
    const { headers, data: targetDb } = getSheetDataWithChunking(targetSheetName);

    const dateIndex = headers.indexOf('受信日時');
    if (dateIndex !== -1) {
      targetDb.sort(function(a, b) {
        return new Date(b[dateIndex]) - new Date(a[dateIndex]);
      });
    }

    const sourceSkills = (sourceData.skill_tags || sourceData['スキルタグ'] || "").toLowerCase().split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    const skillTagsHeader = 'スキルタグ'; 
    const skillTagsIndex = headers.indexOf(skillTagsHeader);

    if (skillTagsIndex === -1) throw new Error("データベースに「スキルタグ」列が見つかりません。");

    let candidates = targetDb.map(function(row) {
        const targetSkillsText = row[skillTagsIndex] || "";
        const targetSkills = targetSkillsText.toLowerCase().split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        const commonSkills = sourceSkills.filter(function(skill) { return targetSkills.includes(skill); });
        return { row: row, score: commonSkills.length };
    }).filter(function(candidate) { return candidate.score > 0; });

    candidates.sort(function(a, b) { return b.score - a.score; });
    let prefilteredCandidatesData = candidates.map(function(c) { return c.row; });

    if (additionalPrompt) {
        const priceHeader = (matchType === 'anken') ? '希望単価' : '単価';
        const priceIndex = headers.indexOf(priceHeader);

        if (priceIndex !== -1) {
            const lessThanMatch = additionalPrompt.match(/(\d+)\s*万(?:円)?(?:以下)?/);
            if (lessThanMatch && lessThanMatch[1]) {
                const maxPrice = parseInt(lessThanMatch[1], 10);
                prefilteredCandidatesData = prefilteredCandidatesData.filter(function(row) {
                    const price = parseInt(row[priceIndex], 10);
                    return !isNaN(price) && price <= maxPrice;
                });
            }

            const greaterThanMatch = additionalPrompt.match(/(\d+)\s*万(?:円)?(?:以上)?/);
            if (greaterThanMatch && greaterThanMatch[1]) {
                const minPrice = parseInt(greaterThanMatch[1], 10);
                prefilteredCandidatesData = prefilteredCandidatesData.filter(function(row) {
                    const price = parseInt(row[priceIndex], 10);
                    return !isNaN(price) && price >= minPrice;
                });
            }
        }
    }

    prefilteredCandidatesData = prefilteredCandidatesData.slice(0, 100);

    if (prefilteredCandidatesData.length === 0) {
        return { success: true, result: [] };
    }

    const matchingPrompt = createMatchingPrompt(sourceData, prefilteredCandidatesData, headers, matchType, maxResults, additionalPrompt);
    
    const matchingResultString = callGeminiAPI(matchingPrompt, 'gemini-2.5-flash');
    if (!matchingResultString) throw new Error("AIによる最終マッチング処理に失敗しました。");

    const matchingResult = JSON.parse(matchingResultString);

    const idColumnIndex = headers.indexOf('ID');
    const enrichedResults = matchingResult.map(function(item) {
        const matchedRow = targetDb.find(function(row) {
            return String(row[idColumnIndex]) === String(item.id);
        });
        
        if (matchedRow) {
            const rowDataObject = headers.reduce(function(obj, header, i) {
                obj[header] = matchedRow[i];
                return obj;
            }, {});

            return {
                id: item.id,
                reason: item.reason,
                fullData: rowDataObject 
            };
        }
        return null;
    }).filter(function(item) { return item !== null; });


    return { success: true, result: enrichedResults };

  } catch (e) {
    console.error("performMatching Error:", e.toString(), e.stack);
    return { success: false, error: `マッチング処理中にエラーが発生しました: ${e.toString()}` };
  }
}

function getMailBody(mailId) {
  try {
    const message = GmailApp.getMessageById(mailId);
    if (message) {
      return {
        subject: message.getSubject(),
        body: message.getBody()
      };
    }
    return { subject: "メールが見つかりません", body: "メールが見つかりません。" };
  } catch (e) {
    console.error("メール本文取得エラー: " + e.toString());
    return { subject: "取得エラー", body: "エラーによりメール本文を取得できませんでした。" };
  }
}

function deleteOldData() {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error("スプレッドシートIDが設定されていません。");
    }
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - DELETE_DATA_OLDER_THAN_DAYS);
    
    const jinzaiSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME_JINZAI);
    const ankenSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME_ANKEN);
    
    let deletedJinzaiCount = deleteDataFromSheet(jinzaiSheet, thresholdDate);
    let deletedAnkenCount = deleteDataFromSheet(ankenSheet, thresholdDate);
    
    clearCache();
    
    return { success: true, message: `削除が完了しました。\n人材DB: ${deletedJinzaiCount}件\n案件DB: ${deletedAnkenCount}件` };
  } catch (e) {
    console.error("古いデータ削除エラー: " + e.toString());
    return { success: false, message: "エラーが発生しました: " + e.toString() };
  }
}

function deleteDataFromSheet(sheet, thresholdDate) {
  if (!sheet) return 0;
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;

  const rowsToDelete = [];
  for (let i = data.length - 1; i > 0; i--) {
    const receiveDate = new Date(data[i][1]);
    if (receiveDate < thresholdDate) {
      rowsToDelete.push(i + 1);
    }
  }
  
  rowsToDelete.forEach(function(rowIndex) {
    sheet.deleteRow(rowIndex);
  });
  
  return rowsToDelete.length;
}


// ===============================================================
// メール自動処理 (バックエンド)
// ===============================================================

function processEmailsTrigger() {
  if (!GEMINI_API_KEY || !SPREADSHEET_ID) {
    console.error("APIキーまたはスプレッドシートIDが設定されていません。スクリプトプロパティを確認してください。");
    return;
  }

  // 前日の日付を取得（after:は指定日より後なので、当日を含めるため-1日）
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
        console.error(`スレッド(ID: ${thread.getId()})の処理中にエラーが発生したためスキップします: ${e.toString()}`);
      }
    });
    
    clearCache();

  } catch (e) {
    console.error("メール検索または処理ループ全体でエラーが発生しました: " + e.toString());
  }
}

function processSingleMail(message) {
  try {
    const mailBody = message.getPlainBody().replace(/(\r\n|\n|\r){2,}/g, '\n');
    if (!mailBody) {
      console.log(`メールID: ${message.getId()} は本文が空のためスキップします。`);
      return;
    }
    const from = message.getFrom();
    const replyTo = message.getReplyTo();
    const mailId = message.getId();
    const mailDate = message.getDate();
    const mailLink = `https://mail.google.com/mail/u/0/#inbox/${mailId}`;
    
    let companyName = getDomainFromEmail(from);
    if (companyName === MY_COMPANY_DOMAIN && replyTo) {
      companyName = getDomainFromEmail(replyTo);
    }
    
    const prompt = createPrompt(mailBody);
    const aiResponse = callGeminiAPI(prompt, 'gemini-2.0-flash-lite');

    if (!aiResponse) {
      console.error(`メールID: ${mailId} のAI解析に失敗しました。レスポンスが空です。`);
      return;
    }

    let parsedData;
    try {
      const trimmedResponse = aiResponse.trim();
      let dataToParse = trimmedResponse;
      if (trimmedResponse.startsWith('[') && trimmedResponse.endsWith(']')) {
        const tempArray = JSON.parse(trimmedResponse);
        if (tempArray.length > 0) {
          dataToParse = tempArray[0];
        } else {
          throw new Error("AI response is an empty array.");
        }
      }
      
      if (typeof dataToParse !== 'string') {
        dataToParse = JSON.stringify(dataToParse);
      }
      parsedData = JSON.parse(dataToParse);

    } catch(e) {
      console.error(`メールID: ${mailId} のAI応答JSONのパースに失敗しました。応答内容: ${aiResponse}`);
      return;
    }
    
    if (parsedData.jinzai && parsedData.jinzai.skill_tags) {
      parsedData.jinzai.skill_tags = normalizeSkillTags(parsedData.jinzai.skill_tags);
    }
    if (parsedData.anken && parsedData.anken.skill_tags) {
      parsedData.anken.skill_tags = normalizeSkillTags(parsedData.anken.skill_tags);
    }

    if (parsedData.jinzai && parsedData.jinzai.name && parsedData.jinzai.name.trim() !== "" && parsedData.jinzai.skill_detail && parsedData.jinzai.skill_detail.trim() !== "") {
        console.log("Found Personnel data with skills. Saving to 人材DB. Mail ID:", mailId);
        saveToSheet(SHEET_NAME_JINZAI, parsedData.jinzai, mailDate, companyName, mailId, mailLink);
    } 
    else if (parsedData.anken && parsedData.anken.name && parsedData.anken.name.trim() !== "") {
        console.log("Found Project data (or Personnel data without skills). Saving to 案件DB. Mail ID:", mailId);
        saveToSheet(SHEET_NAME_ANKEN, parsedData.anken, mailDate, companyName, mailId, mailLink);
    } else {
        console.log(`メールID: ${mailId} からは、有効な人材情報または案件情報が見つかりませんでした。`);
    }

  } catch(e) {
    console.error(`メール(ID: ${message.getId()})の処理中にエラー: ${e.toString()}\nStack: ${e.stack}`);
  }
}

function normalizeSkillTags(tagsString) {
  if (!tagsString || typeof tagsString !== 'string') {
    return "";
  }

  let normalizedString = tagsString;

  const replacementMap = {
    'サーバー': 'サーバ',
    'コンサルタント': 'コンサル',
    'Javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'react.js': 'React',
    'vue.js': 'Vue',
    'next.js': 'Next.js'
  };

  for (const key in replacementMap) {
    const regex = new RegExp(key, 'gi');
    normalizedString = normalizedString.replace(regex, replacementMap[key]);
  }

  const tags = normalizedString.split(',').map(function(tag) {
    return tag.trim();
  }).filter(Boolean);

  const uniqueTags = [...new Set(tags)];
  return uniqueTags.join(',');
}

function getDomainFromEmail(email) {
  const match = email.match(/@([^>]+)/);
  return match ? match[1] : email;
}

// ★★★ 更新: 単価の変換ルールを強化 ★★★
function createPrompt(text) {
  return `
以下のメール本文を解析し、指定されたJSON形式で情報を抽出・整形してください。

---[メール本文]---
${text}
---[/メール本文]---

---[指示]---
1.  メール本文から「人材情報」と「案件情報」を明確に分離してください。両方が含まれる場合も、片方しか含まれない場合もあります。
2.  各情報は以下のルールに従って、指定されたキーを持つJSONオブジェクトとしてください。
3.  情報が存在しない項目は、必ず空文字("")として出力してください。
4.  JSONのキーは必ず英語にしてください (name, age, etc.)。

## 人材情報 (jinzai) のルール
-   name (氏名): フルネームを抽出。敬称は削除。
-   affiliation (所属): 「正社員」「BP」「フリーランス」などを抽出。
-   work_style (勤務形態): 本文から勤務形態を「出社」「リモート」「併用」のいずれかに分類してください。
-   station (最寄駅): 駅名を抽出。
-   age (年齢): 「〇〇歳」「〇〇代」といった表記から数字のみを抽出。「30代」なら「30」とする。
-   gender (性別): 「男性」「女性」などを抽出。
-   nationality (国籍): メール本文に「中国籍」「韓国出身」「来日」「日本語検定」「N1」などのキーワードが含まれる場合は「外国籍」と分類してください。それ以外の場合は「日本籍」としてください。
-   skill_detail (スキル詳細): スキルに関する記述をそのまま抽出。
-   skill_summary (スキルサマリー): skill_detailの内容を日本語200字以内で要約。
-   skill_tags (スキルタグ): skill_detailから該当する技術をカンマ区切りで列挙 (例: Java,Python,AWS)。表記ゆれは統一してください（例：「サーバ」に統一、「コンサル」に統一）。
-   price (希望単価): 金額に関する記述から数字のみを抽出。最優先ルールとして、「70万円(140-200)」のように、金額の後に括弧で囲まれた数字がある場合、括弧内の数字は完全に無視し、前の「70」を抽出してください。次に、「60~70万」の場合は下限の「60」を抽出します。「550,000円」のように桁数が多い場合は、10000で割って万円単位に変換し「55」としてください。最終的な単位は万円とします。
-   wish_detail (希望詳細): 働き方や勤務地の希望に関する記述をそのまま抽出。
-   wish_summary (希望サマリー): wish_detailの内容を日本語200字以内で要約。
-   desired_position (希望ポジション): 本人が希望する役割やポジションを抽出。例: 「バックエンドエンジニア」「フルスタックエンジニア」「PMO」「PL/PM」「テックリード」など。明示的な記載がない場合は、スキルや経験から推測してください。
-   other_detail (その他詳細): 上記以外の補足情報を抽出。
-   other_summary (その他サマリー): other_detailの内容を日本語200字以内で要約。

## 案件情報 (anken) のルール
-   name (案件名): 案件の名称を抽出。
-   summary (案件概要): 業務内容などを抽出。
-   skill_req_detail (スキル要件詳細): 必須スキルや歓迎スキルに関する記述を抽出。
-   skill_req_summary (スキル要件サマリー): skill_req_detailの内容を日本語200字以内で要約。
-   required_position (求めるポジション): 募集しているポジションや役割を抽出。例: 「Pythonエンジニア」「インフラエンジニア」「フロントエンドエンジニア」「PM」「テックリード」「SRE」など。明示的な記載がない場合は、スキル要件や業務内容から推測してください。
-   skill_tags (スキルタグ): skill_req_detailから該当する技術をカンマ区切りで列挙。表記ゆれは統一してください（例：「サーバ」に統一、「コンサル」に統一）。
-   location (場所): 勤務地を抽出。
-   work_style (勤務形態): 本文から勤務形態を「出社」「リモート」「併用」のいずれかに分類してください。
-   price (単価): 金額に関する記述から数字のみを抽出。最優先ルールとして、「70万円(140-200)」のように、金額の後に括弧で囲まれた数字がある場合、括弧内の数字は完全に無視し、前の「70」を抽出してください。次に、「80万～100万」の場合は上限の「100」を抽出します。**「円」表記（例: 550,000円）の場合、必ず10000で割って万円単位に変換してください。**最終的な単位は万円とします。
-   period (期間): 「即日～」「7月～長期」などを抽出。
-   other_detail (その他詳細): 上記以外の補足情報を抽出。
-   other_summary (その他サマリー): other_detailの内容を日本語200字以内で要約。

---[出力形式]---
必ず以下のJSON形式で、\`\`\` ... \`\`\` のブロックで返却してください。
\`\`\`
{
  "jinzai": {
    "name": "",
    "affiliation": "",
    "work_style": "",
    "station": "",
    "age": "",
    "gender": "",
    "nationality": "",
    "skill_detail": "",
    "skill_summary": "",
    "skill_tags": "",
    "price": "",
    "wish_detail": "",
    "wish_summary": "",
    "desired_position": "",
    "other_detail": "",
    "other_summary": ""
  },
  "anken": {
    "name": "",
    "summary": "",
    "skill_req_detail": "",
    "skill_req_summary": "",
    "required_position": "",
    "skill_tags": "",
    "location": "",
    "work_style": "",
    "price": "",
    "period": "",
    "other_detail": "",
    "other_summary": ""
  }
}
\`\`\`
`;
}

function createMatchingPrompt(sourceData, targetDb, headers, matchType, maxResults, additionalPrompt) {
  const targetType = (matchType === 'jinzai') ? '案件' : '人材';
  const sourceType = (matchType === 'jinzai') ? '人材' : '案件';
  
  const targetDbObjects = targetDb.map(function(row) {
    const obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });

  return `
あなたは優秀なITエージェントです。
以下の【${sourceType}情報】に最もマッチする候補を、【${targetType}データベース】の中から最大${maxResults}件提案してください。

# 指示
- スキル、単価、勤務形態、場所などの要素を総合的に評価してください。
- 提案は、マッチ度が高い順に並べてください。
- マッチングの根拠（どのスキルが一致したかなど）を具体的に示してください。
- 以下の【追加条件】も**絶対的なルール**として考慮してください。条件がない場合は無視してください。
- 結果は、指定されたJSON形式の配列で返却してください。

# 【追加条件】
${additionalPrompt || '特になし'}

# 【${sourceType}情報】
\`\`\`json
${JSON.stringify(sourceData, null, 2)}
\`\`\`

# 【${targetType}データベース】
\`\`\`json
${JSON.stringify(targetDbObjects, null, 2)}
\`\`\`

# 出力形式
以下のJSON形式の配列で、マッチした候補のIDと理由を返却してください。
\`\`\`json
[
  {
    "id": "（マッチした${targetType}のID）",
    "reason": "（マッチングの根拠を具体的に記述）"
  }
]
\`\`\`
`;
}

function callGeminiAPI(prompt, modelName) {
  // modelNameが指定されていない場合は、デフォルトのモデルを使用
  const model = modelName || 'gemini-1.5-flash-latest';
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + GEMINI_API_KEY;
  
  const payload = {
    "contents": [{
      "parts": [{ "text": prompt }]
    }],
    "generationConfig": {
      "response_mime_type": "application/json",
    }
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const result = JSON.parse(responseBody);
      if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
        return result.candidates[0].content.parts[0].text;
      } else {
        console.error("API応答の形式が予期せぬものです: ", responseBody);
        return null;
      }
    } else {
      console.error(`APIエラー: Status ${responseCode}, Body: ${responseBody}`);
      return null;
    }
  } catch (e) {
    console.error("UrlFetchAppエラー: " + e.toString());
    return null;
  }
}

function saveToSheet(sheetName, data, mailDate, companyName, mailId, mailLink) {
  try {
    if (!SPREADSHEET_ID) {
      console.error("スプレッドシートIDが設定されていないため、書き込みをスキップします。");
      return;
    }
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) {
      console.error(`${sheetName} が見つかりません。`);
      return;
    }
    const newId = sheet.getLastRow();

    const timestamp = Utilities.formatDate(mailDate, "JST", "yyyy/MM/dd HH:mm");

    let rowData;
    if (sheetName === SHEET_NAME_JINZAI) {
      rowData = [
        newId, timestamp, companyName,
        data.name || "", data.affiliation || "", data.work_style || "",
        data.station || "", data.age || "", data.gender || "", data.nationality || "日本籍",
        data.skill_detail || "", data.skill_summary || "", normalizeSkillTags(data.skill_tags || ""),
        data.price || "", data.wish_detail || "", data.wish_summary || "",
        data.desired_position || "",
        data.other_detail || "", data.other_summary || "",
        mailId, mailLink
      ];
    } else { // 案件DB
      rowData = [
        newId, timestamp, companyName,
        data.name || "", data.summary || "", data.skill_req_detail || "",
        data.skill_req_summary || "", data.required_position || "", normalizeSkillTags(data.skill_tags || ""), data.location || "",
        data.work_style || "", data.price || "", data.period || "",
        data.other_detail || "", data.other_summary || "",
        mailId, mailLink
      ];
    }
    sheet.appendRow(rowData);
    console.log(`${sheetName}に新しいデータを追加しました。ID: ${newId}`);

  } catch (e) {
    console.error(`${sheetName}への書き込みエラー: ${e.toString()}`);
  }
}
