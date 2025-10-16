# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

このディレクトリは、Torchシステムのバッチ処理部分を含んでいます。Google Apps Script (GAS)で実装されており、メール処理の自動化を行います。

## File Structure

- `main.js` - メイン処理ロジック（メール取得、AI解析、データ保存、検索、マッチング機能など）
- `index.html` - WebアプリケーションのUI（検索画面、AIマッチング、インポート機能）
- `appsscript.json` - GASプロジェクトの設定ファイル

## Architecture

### 主要機能

1. **メール自動処理**
   - `processEmailsTrigger()` - 5分ごとにトリガーされ、未読メールを処理
   - `processSingleMail()` - 個別メールを処理し、Gemini APIで解析
   - 人材情報と案件情報を自動分類してスプレッドシートに保存

2. **検索機能**
   - `searchDatabase()` - 人材DBまたは案件DBを検索
   - スキルタグ、年齢、単価、勤務形態などの条件でフィルタリング
   - キャッシュ機能（`getSheetDataWithChunking()`）で高速化

3. **AIマッチング**
   - `performMatching()` - 人材と案件のマッチングをGemini APIで実行
   - スキルタグによる事前絞り込み + AIによる詳細マッチング

4. **インポート機能**
   - `importFromUrls()` - 外部スプレッドシートからデータをインポート
   - AIが自動的にシートの内容（人材/案件）を判断

5. **URL横断検索**
   - `initializeUrlSearch()` / `processUrlBatch()` - 複数URLから特定キーワードを検索
   - Googleドライブファイル（スプレッドシート、ドキュメント、Excel）と公開Webページに対応

### データフロー

```
Gmail → processEmailsTrigger() → Gemini API (解析) → スプレッドシート保存
                                                    ↓
                                              キャッシュ (CacheService)
                                                    ↓
                                        検索/マッチング機能で利用
```

### AI処理の重要なプロンプト

- `createPrompt()` - メール本文から人材・案件情報を抽出（単価変換ルールが重要）
- `createMatchingPrompt()` - 人材と案件のマッチング候補を生成
- `createImportPrompt()` - 外部データを内部フォーマットに変換
- `createContentTypeDeterminationPrompt()` - シートの内容が人材/案件どちらかを判断
- `createSynonymExpansionPrompt()` - スキルタグの類義語を展開（検索精度向上）

### キャッシュ戦略

- ScriptCache/UserCacheを使用して高速化
- 90KBのチャンク単位で分割してキャッシュ保存
- データ更新時に`clearCache()`で無効化

## Development Notes

### スクリプトプロパティ

以下の環境変数をGoogle Apps Scriptのスクリプトプロパティで設定する必要があります：
- `SPREADSHEET_ID` - データベースとして使用するGoogleスプレッドシートのID
- `GEMINI_API_KEY` - Gemini APIのキー

### デプロイ方法

Google Apps Scriptエディタで：
1. プロジェクトを開く
2. スクリプトプロパティを設定
3. Webアプリとして公開（アクセス権: 組織内のユーザー）
4. トリガーを設定：`processEmailsTrigger`を5分ごとに実行

### テスト方法

GASエディタの実行ボタンで個別関数をテスト可能：
- `processSingleMail()` - 特定のメールIDで実行
- `searchDatabase()` - 検索パラメータを渡してテスト
- `performMatching()` - マッチングロジックをテスト

### 制限事項

- GASの実行時間制限: 6分/実行
- API呼び出し制限: UrlFetchAppは1日あたり20,000回
- キャッシュサイズ: 1エントリあたり100KB未満
- 処理するメールの上限: 1回の実行で100スレッド（`MAX_THREADS_PER_EXECUTION`）

## Important Constants

- `TARGET_EMAIL_ADDRESS` - 処理対象のメールアドレス: `eigyo@luxy-inc.com`
- `MY_COMPANY_DOMAIN` - 自社ドメイン: `luxy-inc.com`
- `DELETE_DATA_OLDER_THAN_DAYS` - 古いデータの保持期間: 14日
- `SHEET_NAME_JINZAI` / `SHEET_NAME_ANKEN` - DB用シート名

## AI Model Usage

- メール解析: `gemini-2.0-flash-lite` (高速処理用)
- マッチング: `gemini-2.5-flash` (高精度処理用)
- その他の分析: モデルを切り替え可能（`callGeminiAPI()`の第2引数で指定）
