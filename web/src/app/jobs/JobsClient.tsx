'use client';

import { useState, useMemo } from 'react';
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
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const [gradeFilters, setGradeFilters] = useState<string[]>([]);

  const isAdmin = userRole === 'admin';

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        searchQuery === '' ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.summary?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSkills =
        skillFilters.length === 0 ||
        skillFilters.every((skill) => job.skills.includes(skill));

      const matchesGrade =
        gradeFilters.length === 0 ||
        (job.grade && gradeFilters.includes(job.grade));

      return matchesSearch && matchesSkills && matchesGrade;
    });
  }, [jobs, searchQuery, skillFilters, gradeFilters]);

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isAdmin={isAdmin} />
        <SplitLayout
          left={
            <div className="flex flex-col h-full">
              <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">案件一覧</h2>
                <SearchBar
                  onSearch={setSearchQuery}
                  onSkillFilter={setSkillFilters}
                  onGradeFilter={setGradeFilters}
                />
              </div>
              <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-3">
                {filteredJobs.map((job) => (
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
                    <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                    <p className="text-sm text-gray-500 mt-1">{job.location}</p>
                    {isAdmin && job.unitPrice && (
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        ¥{job.unitPrice.toLocaleString()}/月
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
                    <p className="text-gray-600 mt-2">{selectedJob.company}</p>
                    <p className="text-gray-500 mt-1">{selectedJob.location}</p>
                    {isAdmin && selectedJob.unitPrice && (
                      <p className="text-lg font-semibold text-green-600 mt-2">
                        ¥{selectedJob.unitPrice.toLocaleString()}/月
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">必要スキル</h4>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {selectedJob.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
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
