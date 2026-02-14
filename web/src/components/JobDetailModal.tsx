"use client";

import { useEffect } from "react";

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  grade: string | null;
  unitPrice: number | null;
  summary: string | null;
  description: string | null;
  originalTitle: string | null;
  originalBody: string | null;
  senderEmail: string | null;
  receivedAt: Date;
  /** 着信日表示用（Asia/Tokyo でフォーマット済み）。渡されていればこちらを表示 */
  receivedAtDisplayLong?: string;
  skills: string[];
};

type JobDetailModalProps = {
  job: Job;
  isAdmin: boolean;
  onClose: () => void;
};

export default function JobDetailModal({
  job,
  isAdmin,
  onClose,
}: JobDetailModalProps) {
  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // スクロールを無効化
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gray-500 flex items-end md:items-center justify-center">
      {/* モーダル背景クリックで閉じる */}
      <div className="absolute inset-0 " onClick={onClose} />

      {/* モーダル本体 */}
      <div className="relative bg-white w-full h-[90vh] md:h-auto md:max-h-[80vh] md:max-w-2xl md:rounded-lg overflow-hidden animate-slide-up">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">案件詳細</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto h-full pb-20 px-6 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {job.title}
              </h3>
              {isAdmin && job.company && (
                <p className="text-gray-600 mt-2">{job.company}</p>
              )}
              <p className="text-gray-500 mt-1">{job.location}</p>
              {job.grade && (
                <p className="text-sm text-gray-600 mt-1">
                  ポジション: {job.grade}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">ID: {job.id}</p>
              <p className="text-xs text-gray-400 mt-1">
                着信日: {job.receivedAtDisplayLong ?? new Date(job.receivedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {isAdmin && job.unitPrice && (
                <p className="text-lg font-semibold text-green-600 mt-2">
                  {job.unitPrice}万円/月
                </p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-900">
                必要スキル ({job.skills.length}件)
              </h4>
              <div className="flex gap-2 mt-2 flex-wrap">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900">概要</h4>
              <p className="text-gray-700 mt-2">{job.summary}</p>
            </div>

            {job.description && (
              <div>
                <h4 className="font-semibold text-gray-900">詳細</h4>
                <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
            )}

            {isAdmin && (
              <>
                <div className="border-t pt-4 mt-6">
                  <h4 className="font-semibold text-red-700 mb-2">
                    【管理者専用情報】
                  </h4>
                </div>
                {job.originalTitle && (
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      元のメール件名
                    </h4>
                    <p className="text-gray-700 mt-2">{job.originalTitle}</p>
                  </div>
                )}
                {job.senderEmail && (
                  <div>
                    <h4 className="font-semibold text-gray-900">送信者</h4>
                    <p className="text-gray-700 mt-2">{job.senderEmail}</p>
                  </div>
                )}
                {job.originalBody && (
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      元のメール本文
                    </h4>
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
                      {job.originalBody}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
