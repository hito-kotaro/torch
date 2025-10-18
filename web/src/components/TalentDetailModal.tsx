'use client';

import { useEffect } from 'react';

type Talent = {
  id: string;
  name: string | null;
  age: number | null;
  position: string | null;
  workStyle: string | null;
  location: string | null;
  unitPrice: number | null;
  summary: string | null;
  description: string | null;
  originalTitle: string | null;
  originalBody: string | null;
  senderEmail: string | null;
  receivedAt: Date;
  skills: string[];
};

type TalentDetailModalProps = {
  talent: Talent;
  isAdmin: boolean;
  onClose: () => void;
};

export default function TalentDetailModal({ talent, isAdmin, onClose }: TalentDetailModalProps) {
  // ESCキーで閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // スクロールを無効化
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
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
          <h2 className="text-xl font-bold text-gray-900">人材詳細</h2>
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
                {talent.name || '非公開'}
                {talent.age && <span className="text-gray-600 ml-2">({talent.age}歳)</span>}
              </h3>
              {talent.position && (
                <p className="text-sm text-gray-600 mt-1">
                  ポジション: {talent.position}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">ID: {talent.id}</p>
              <p className="text-gray-500 mt-1">{talent.location}</p>
              {talent.workStyle && (
                <p className="text-sm text-gray-600 mt-1">勤務形態: {talent.workStyle}</p>
              )}
              {isAdmin && talent.unitPrice && (
                <p className="text-lg font-semibold text-green-600 mt-2">
                  {talent.unitPrice}万円/月
                </p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-gray-900">
                スキル ({talent.skills.length}件)
              </h4>
              <div className="flex gap-2 mt-2 flex-wrap">
                {talent.skills.map((skill) => (
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
              <p className="text-gray-700 mt-2">{talent.summary}</p>
            </div>

            {talent.description && (
              <div>
                <h4 className="font-semibold text-gray-900">詳細</h4>
                <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                  {talent.description}
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
                {talent.originalTitle && (
                  <div>
                    <h4 className="font-semibold text-gray-900">元のメール件名</h4>
                    <p className="text-gray-700 mt-2">{talent.originalTitle}</p>
                  </div>
                )}
                {talent.senderEmail && (
                  <div>
                    <h4 className="font-semibold text-gray-900">送信者</h4>
                    <p className="text-gray-700 mt-2">{talent.senderEmail}</p>
                  </div>
                )}
                {talent.originalBody && (
                  <div>
                    <h4 className="font-semibold text-gray-900">元のメール本文</h4>
                    <p className="text-gray-700 mt-2 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
                      {talent.originalBody}
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
