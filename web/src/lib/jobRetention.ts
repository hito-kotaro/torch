/**
 * 案件情報の保持期間（日数）。この日数より古い案件は定期的に削除する。
 * 分析はスナップショットで保持するため、案件本体は短期間でよい。
 */
export const JOB_RETENTION_DAYS = 7;

/** この日付より前の案件を削除対象とする */
export function getJobRetentionCutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - JOB_RETENTION_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}
