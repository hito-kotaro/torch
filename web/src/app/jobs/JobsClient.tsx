"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import SplitLayout from "@/components/SplitLayout";
import SearchBar from "@/components/SearchBar";
import JobDetailModal from "@/components/JobDetailModal";
import type { JobsFilterParams } from "@/lib/listingLimit";
import { buildJobsQueryString } from "@/lib/listingLimit";

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
  receivedAtDisplay: string;
  receivedAtDisplayLong: string;
  skills: string[];
};

type JobsClientProps = {
  jobs: Job[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  filter: JobsFilterParams;
  userRole: "admin" | "general";
};

export default function JobsClient({
  jobs,
  totalCount,
  totalPages,
  currentPage,
  filter,
  userRole,
}: JobsClientProps) {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<Job | null>(jobs[0] || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const jobListRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === "admin";

  useEffect(() => {
    setSelectedJob((prev) => {
      if (jobs.length === 0) return null;
      const stillInList = prev && jobs.some((j) => j.id === prev.id);
      return stillInList ? prev : jobs[0];
    });
  }, [jobs]);

  useEffect(() => {
    if (jobListRef.current) {
      jobListRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  useEffect(() => {
    setIsLoading(false);
  }, [currentPage, jobs]);

  const applyParams = (next: Partial<JobsFilterParams>) => {
    setIsLoading(true);
    const filterKeys = [
      "q",
      "id",
      "grades",
      "skills",
      "minPrice",
      "maxPrice",
      "startDate",
      "endDate",
      "sort",
    ];
    const isFilterChange = Object.keys(next).some((k) =>
      filterKeys.includes(k)
    );
    const merged: JobsFilterParams = {
      ...filter,
      ...next,
      page:
        next.page !== undefined
          ? next.page
          : isFilterChange
            ? 1
            : filter.page,
    };
    const qs = buildJobsQueryString(merged);
    router.push(qs ? `/jobs?${qs}` : "/jobs");
  };

  const applyPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    applyParams({ page });
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    if (window.innerWidth < 768) setIsModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:block">
          <Sidebar isAdmin={isAdmin} />
        </div>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative w-64 h-full bg-white animate-slide-in-left">
              <Sidebar isAdmin={isAdmin} />
            </div>
          </div>
        )}

        <SplitLayout
          left={
            <div className="flex flex-col h-full">
              <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    案件一覧
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {totalCount}件
                    </span>
                    <select
                      value={filter.sort}
                      onChange={(e) =>
                        applyParams({
                          sort: e.target.value as "desc" | "asc",
                          page: 1,
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">新しい順</option>
                      <option value="asc">古い順</option>
                    </select>
                  </div>
                </div>
                <SearchBar
                  initialQuery={filter.q}
                  initialId={filter.id}
                  initialGrades={filter.grades}
                  initialSkills={filter.skills}
                  initialMinPrice={filter.minPrice}
                  initialMaxPrice={filter.maxPrice}
                  initialStartDate={filter.startDate}
                  initialEndDate={filter.endDate}
                  onSearch={(q) => applyParams({ q, page: 1 })}
                  onGradeFilter={(grades) => applyParams({ grades, page: 1 })}
                  onIdSearch={(id) => applyParams({ id, page: 1 })}
                  onSkillFilter={(skills) => applyParams({ skills, page: 1 })}
                  onUnitPriceFilter={(min, max) =>
                    applyParams({
                      minPrice: min,
                      maxPrice: max,
                      page: 1,
                    })
                  }
                  onDateRangeFilter={(start, end) =>
                    applyParams({
                      startDate: start,
                      endDate: end,
                      page: 1,
                    })
                  }
                />
              </div>
              <div
                ref={jobListRef}
                className="flex-1 overflow-y-auto p-6 pt-4 space-y-3 min-h-[200px] flex flex-col"
              >
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div
                      className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
                      aria-label="読み込み中"
                    />
                  </div>
                ) : (
                  <>
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleJobSelect(job)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedJob?.id === job.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 flex-1">
                        {job.title}
                      </h3>
                      <span className="text-xs text-gray-400 ml-2">
                        {job.receivedAtDisplay}
                      </span>
                    </div>
                    {isAdmin && job.company && (
                      <p className="text-sm text-gray-600 mt-1">
                        {job.company}
                      </p>
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
                  </>
                )}
              </div>
              {totalPages > 1 && (
                <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => applyPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages} ページ
                  </span>
                  <button
                    onClick={() => applyPage(currentPage + 1)}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                案件詳細
              </h2>
              {selectedJob && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedJob.title}
                    </h3>
                    {isAdmin && selectedJob.company && (
                      <p className="text-gray-600 mt-2">
                        {selectedJob.company}
                      </p>
                    )}
                    <p className="text-gray-500 mt-1">
                      {selectedJob.location}
                    </p>
                    {selectedJob.grade && (
                      <p className="text-sm text-gray-600 mt-1">
                        ポジション: {selectedJob.grade}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      ID: {selectedJob.id}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      着信日: {selectedJob.receivedAtDisplayLong}
                    </p>
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
                          <h4 className="font-semibold text-gray-900">
                            元のメール件名
                          </h4>
                          <p className="text-gray-700 mt-2">
                            {selectedJob.originalTitle}
                          </p>
                        </div>
                      )}
                      {selectedJob.senderEmail && (
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            送信者
                          </h4>
                          <p className="text-gray-700 mt-2">
                            {selectedJob.senderEmail}
                          </p>
                        </div>
                      )}
                      {selectedJob.originalBody && (
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            元のメール本文
                          </h4>
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

      {isModalOpen && selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isAdmin={isAdmin}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
