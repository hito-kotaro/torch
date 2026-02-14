/** 一覧で閲覧できる直近の日数 */
export const LISTING_DAYS = 20;

/** 一覧取得の開始日（この日付 0:00 以降のデータを表示） */
export function getListingSince(): Date {
  const d = new Date();
  d.setDate(d.getDate() - LISTING_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}
