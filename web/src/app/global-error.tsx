"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
          <h1 className="text-xl font-bold text-red-600 mb-2">エラーが発生しました</h1>
          <p className="text-sm text-gray-700 mb-4 font-mono break-all max-w-lg">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 mb-4">Digest: {error.digest}</p>
          )}
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
