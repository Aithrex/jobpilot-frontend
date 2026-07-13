/**
 * Onboarding hero (first-run resume upload) — shared across the Tailor flow.
 *
 * Extracted verbatim from the ResumeParser monolith so both the classic
 * workspace (`/app`) and the new app-shell render an identical onboarding
 * upload experience from one source. Named inline-SVG icons from the monolith
 * were swapped to their lucide-react equivalents so this file is
 * self-contained; markup and raw colors are otherwise a parity move (NOT a
 * re-theme).
 */
import { useState, useCallback } from "react";
import {
  Sparkles,
  UploadCloud,
  Clipboard,
  FileDown,
  Search,
} from "lucide-react";
import { apiService } from "@/lib/api";

export default function OnboardingHero({
  onUploaded,
}: {
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const handleUpload = useCallback(
    async (file: File) => {
      const fname = file.name.toLowerCase();
      if (!fname.endsWith(".pdf") && !fname.endsWith(".docx")) {
        setUploadError("Only PDF and DOCX files are accepted");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File too large (max 5 MB)");
        return;
      }
      setUploading(true);
      setUploadError("");
      const resp = await apiService.uploadResumeForParser(file);
      setUploading(false);
      if (resp.error) {
        setUploadError(resp.error);
        return;
      }
      onUploaded();
    },
    [onUploaded],
  );
  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="text-center pt-2 pb-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-purple-500 dark:text-purple-300">
            AI-Powered Resume Tailoring
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight">
          Land more interviews with a<br />
          <span className="bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
            perfectly tailored resume
          </span>
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
          Upload your resume once, paste any job description, and get an
          ATS-optimized version tailored to that specific role in seconds.
        </p>
      </div>
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center mb-4 sm:mb-5">
          How it works
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-center gap-4 sm:gap-6">
          {[
            {
              n: 1,
              icon: <UploadCloud className="w-5 h-5" />,
              l: "Upload",
              d: "Upload your existing resume",
              active: true,
            },
            {
              n: 2,
              icon: <Clipboard className="w-5 h-5" />,
              l: "Paste JD",
              d: "Paste the job description you're targeting",
            },
            {
              n: 3,
              icon: <FileDown className="w-5 h-5" />,
              l: "Download",
              d: "Get your ATS-optimized resume",
            },
          ].map((s, i) => (
            <div
              key={s.n}
              className="flex items-start sm:items-start gap-4 sm:gap-6 sm:flex-row"
            >
              {i > 0 && (
                <div className="hidden sm:flex items-center pt-5 shrink-0">
                  <div className="w-6 sm:w-10 h-px bg-gray-300 dark:bg-gray-700" />
                  <svg
                    className="w-3 h-3 text-gray-400 dark:text-gray-500 -ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </div>
              )}
              <div className="flex sm:flex-col items-center sm:text-center flex-1 min-w-0 gap-3 sm:gap-0">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center sm:mb-2.5 shrink-0 ${s.active ? "bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25 text-white" : "bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400"}`}
                >
                  {s.icon}
                </div>
                <div className="text-left sm:text-center min-w-0">
                  <p
                    className={`text-xs font-semibold mb-0.5 ${s.active ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    Step {s.n}: {s.l}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug sm:max-w-[160px]">
                    {s.d}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleUpload(f);
        }}
        className={`rounded-xl border-2 border-dashed transition-all duration-200 ${dragOver ? "border-purple-500/50 bg-purple-500/5" : "border-gray-300 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-900/40 hover:border-gray-400 dark:hover:border-gray-600/60"}`}
      >
        <div className="flex flex-col items-center text-center py-12 px-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
            Get started — upload your resume
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-sm">
            Drop your PDF or DOCX here or click below. We'll parse it and
            prepare it for tailoring.
          </p>
          {uploading ? (
            <div className="w-full max-w-xs space-y-2">
              <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-pulse"
                  style={{ width: "60%" }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Parsing your resume...
              </p>
            </div>
          ) : (
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200">
                <UploadCloud className="w-4 h-4" />
                Choose File
              </span>
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </label>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
            PDF or DOCX, max 5 MB
          </p>
          {uploadError && (
            <p className="text-sm text-red-400 mt-2">{uploadError}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          {
            icon: <Search className="w-4 h-4 text-blue-400" />,
            l: "ATS Keyword Matching",
            d: "Scanned against 6+ ATS systems",
          },
          {
            icon: <Sparkles className="w-4 h-4 text-violet-400" />,
            l: "AI-Powered Tailoring",
            d: "Optimizes content for the role",
          },
          {
            icon: <FileDown className="w-4 h-4 text-emerald-400" />,
            l: "PDF & DOCX Export",
            d: "Download in any format",
          },
        ].map((f) => (
          <div
            key={f.l}
            className="rounded-lg border border-gray-200 dark:border-gray-800/60 bg-gray-50/40 dark:bg-gray-900/40 p-4 text-center"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
              {f.icon}
            </div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
              {f.l}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {f.d}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
