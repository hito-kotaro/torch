'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import SplitLayout from '@/components/SplitLayout';
import SearchBar from '@/components/SearchBar';

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
  skills: string[];
};

type JobsClientProps = {
  jobs: Job[];
  userRole: 'admin' | 'general';
};

export default function JobsClient({ jobs, userRole }: JobsClientProps) {
  const [selectedJob, setSelectedJob] = useState(jobs[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilters, setGradeFilters] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 新しい順がデフォルト
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const jobListRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === 'admin';

  // ページ変更時にスクロールを一番上に戻す
  useEffect(() => {
    if (jobListRef.current) {
      jobListRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  const filteredAndSortedJobs = useMemo(() => {
    const result = jobs.filter((job) => {
      const matchesSearch =
        searchQuery === '' ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.summary?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGrade =
        gradeFilters.length === 0 ||
        (job.grade && gradeFilters.includes(job.grade));

      return matchesSearch && matchesGrade;
    });

    // ソート処理
    result.sort((a, b) => {
      const dateA = new Date(a.receivedAt).getTime();
      const dateB = new Date(b.receivedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [jobs, searchQuery, gradeFilters, sortOrder]);

  // ページネーション
  const totalPages = Math.ceil(filteredAndSortedJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedJobs, currentPage]);

  // フィルタ変更時にページを1にリセット
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isAdmin={isAdmin} />
        <SplitLayout
          left={
            <div className="flex flex-col h-full">
              <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">案件一覧</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {filteredAndSortedJobs.length}件
                    </span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">新しい順</option>
                      <option value="asc">古い順</option>
                    </select>
                  </div>
                </div>
                <SearchBar
                  onSearch={(query) => {
                    setSearchQuery(query);
                    handleFilterChange();
                  }}
                  onGradeFilter={(grades) => {
                    setGradeFilters(grades);
                    handleFilterChange();
                  }}
                />
              </div>
              <div ref={jobListRef} className="flex-1 overflow-y-auto p-6 pt-4 space-y-3">
                {paginatedJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedJob?.id === job.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    {isAdmin && job.company && (
                      <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                    {isAdmin && job.unitPrice && (
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        {job.unitPrice}万円/月
                      </p>
                    )}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages} ページ
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    次へ
                  </button>
                </div>
              )}
            </div>
          }
          right={
            <div className="p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">案件詳細</h2>
              {selectedJob && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedJob.title}
                    </h3>
                    {isAdmin && selectedJob.company && (
                      <p className="text-gray-600 mt-2">{selectedJob.company}</p>
                    )}
                    <p className="text-gray-500 mt-1">{selectedJob.location}</p>
                    {isAdmin && selectedJob.unitPrice && (
                      <p className="text-lg font-semibold text-green-600 mt-2">
                        {selectedJob.unitPrice}万円/月
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      必要スキル ({selectedJob.skills.length}件)
                    </h4>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {selectedJob.skills.map((skill) => (
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
                    <p className="text-gray-700 mt-2">{selectedJob.summary}</p>
                  </div>
                  {selectedJob.description && (
                    <div>
                      <h4 className="font-semibold text-gray-900">詳細</h4>
                      <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                        {selectedJob.description}
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
                      {selectedJob.originalTitle && (
                        <div>
                          <h4 className="font-semibold text-gray-900">元のメール件名</h4>
                          <p className="text-gray-700 mt-2">{selectedJob.originalTitle}</p>
                        </div>
                      )}
                      {selectedJob.senderEmail && (
                        <div>
                          <h4 className="font-semibold text-gray-900">送信者</h4>
                          <p className="text-gray-700 mt-2">{selectedJob.senderEmail}</p>
                        </div>
                      )}
                      {selectedJob.originalBody && (
                        <div>
                          <h4 className="font-semibold text-gray-900">元のメール本文</h4>
                          <p className="text-gray-700 mt-2 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-200">
                            {selectedJob.originalBody}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
