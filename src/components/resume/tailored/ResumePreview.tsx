/**
 * Tailored resume preview — shared across the Tailor flow.
 *
 * Extracted verbatim from the ResumeParser monolith so both the classic
 * workspace (`/app`) and the new app-shell render an identical resume preview
 * from one source. Markup/classes are a parity move (raw purple/gray colors
 * preserved intentionally — this is NOT a re-theme).
 */
import { CopySectionButton } from "./CopySectionButton";
import { titleCaseName } from "@/lib/filename";
import type { TailoredFullResume } from "@/types/resume";

export function ResumePreview({ resume }: { resume: TailoredFullResume }) {
  const ST = ({
    title,
    copyText,
  }: {
    title: string;
    copyText?: () => string;
  }) => (
    <div className="flex items-center gap-3 mb-3 group">
      <h3 className="text-xs font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400/80">
        {title}
      </h3>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      {copyText && <CopySectionButton getText={copyText} />}
    </div>
  );
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-purple-50 via-white to-purple-50 dark:from-purple-500/10 dark:via-gray-900 dark:to-purple-500/10 px-6 py-5 border-b border-gray-200 dark:border-gray-800 group relative">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          {titleCaseName(resume.contact?.name || "")}
        </h2>
        <p className="text-[12px] text-gray-600 dark:text-gray-300 mt-1">
          {[
            resume.contact?.location,
            resume.contact?.phone,
            resume.contact?.email,
            resume.contact?.portfolio,
            resume.contact?.linkedin,
            resume.contact?.github,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
        <div className="absolute top-4 right-4">
          <CopySectionButton
            getText={() =>
              [
                resume.contact?.name,
                [
                  resume.contact?.location,
                  resume.contact?.phone,
                  resume.contact?.email,
                  resume.contact?.portfolio,
                  resume.contact?.linkedin,
                  resume.contact?.github,
                ]
                  .filter(Boolean)
                  .join(" · "),
              ]
                .filter(Boolean)
                .join("\n")
            }
          />
        </div>
      </div>
      <div className="px-6 py-5 space-y-5">
        {resume.summary && (
          <div className="group">
            <ST title="Summary" copyText={() => resume.summary || ""} />
            <p className="text-[13.5px] text-gray-800 dark:text-gray-100 leading-[1.7]">
              {resume.summary}
            </p>
          </div>
        )}
        {resume.experience?.length > 0 && (
          <div className="group">
            <ST
              title="Experience"
              copyText={() =>
                (resume.experience || [])
                  .map(
                    (e) =>
                      `${e.company}${e.location ? `, ${e.location}` : ""}${e.title ? ` — ${e.title}` : ""}${e.dates ? ` (${e.dates})` : ""}\n${(e.bullets || []).map((b) => `  • ${b}`).join("\n")}`,
                  )
                  .join("\n\n")
              }
            />
            <div className="space-y-4">
              {resume.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white">
                        {exp.company}
                        {exp.location ? `, ${exp.location}` : ""}
                      </p>
                      {exp.title && (
                        <p className="text-[12px] text-gray-600 dark:text-gray-300 italic mt-0.5">
                          {exp.title}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                      {exp.dates}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {exp.bullets?.map((b, j) => (
                      <li
                        key={j}
                        className="text-[12.5px] text-gray-700 dark:text-gray-200 flex gap-2 leading-[1.65]"
                      >
                        <span className="text-purple-500 dark:text-purple-400 shrink-0 mt-0.5">
                          &bull;
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        {resume.projects?.length > 0 && (
          <div className="group">
            <ST
              title="Projects"
              copyText={() =>
                (resume.projects || [])
                  .map(
                    (p) =>
                      `${p.name}\n${(p.bullets || []).map((b) => `  • ${b}`).join("\n")}`,
                  )
                  .join("\n\n")
              }
            />
            <div className="space-y-3">
              {resume.projects.map((p, i) => (
                <div key={i}>
                  <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {p.bullets?.map((b, j) => (
                      <li
                        key={j}
                        className="text-[12.5px] text-gray-700 dark:text-gray-200 flex gap-2 leading-[1.65]"
                      >
                        <span className="text-purple-500 dark:text-purple-400 shrink-0 mt-0.5">
                          &bull;
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        {resume.skills && Object.keys(resume.skills).length > 0 && (
          <div className="group">
            <ST
              title="Technical Skills"
              copyText={() =>
                Object.entries(resume.skills || {})
                  .map(
                    ([c, s]) =>
                      `${c}: ${Array.isArray(s) ? s.join(", ") : String(s)}`,
                  )
                  .join("\n")
              }
            />
            <div className="space-y-2">
              {Object.entries(resume.skills).map(([c, s]) => (
                <div key={c} className="text-[12.5px] leading-[1.65]">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {c}:{" "}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200">
                    {Array.isArray(s) ? s.join(", ") : String(s)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {resume.education?.length > 0 && (
          <div className="group">
            <ST
              title="Education"
              copyText={() =>
                (resume.education || [])
                  .map(
                    (e) =>
                      `${e.institution}${e.degree ? ` — ${e.degree}` : ""}${e.dates ? ` (${e.dates})` : ""}`,
                  )
                  .join("\n")
              }
            />
            <div className="space-y-2">
              {resume.education.map((edu, i) => {
                const d = edu.degree
                  ? [
                      ...new Set(
                        edu.degree
                          .split("|")
                          .map((s) => s.trim())
                          .filter(
                            (s) =>
                              !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(
                                s,
                              ),
                          )
                          .filter(Boolean),
                      ),
                    ].join(" | ")
                  : "";
                return (
                  <div
                    key={i}
                    className="flex justify-between items-start gap-2"
                  >
                    <p className="text-[12.5px] text-gray-800 dark:text-gray-100">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {edu.institution}
                      </span>
                      {d ? `  — ${d}` : ""}
                    </p>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                      {edu.dates}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {resume.certifications?.length > 0 && (
          <div className="group">
            <ST
              title="Certifications"
              copyText={() => (resume.certifications || []).join("\n")}
            />
            <div className="flex flex-wrap gap-2">
              {resume.certifications.map((c, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/20"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
