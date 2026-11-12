/**
 * Tailored resume preview - shared across the Tailor flow.
 *
 * Extracted verbatim from the ResumeParser monolith so both the classic
 * workspace (`/app`) and the new app-shell render an identical resume preview
 * from one source. Markup/classes are a parity move (raw purple/gray colors
 * preserved intentionally - this is NOT a re-theme).
 */
import { CopySectionButton } from "./CopySectionButton";
import { titleCaseName } from "@/lib/filename";
import { RESUME_LAYOUT_SPEC } from "@/lib/resumeLayoutSpec";
import type { TailoredFullResume } from "@/types/resume";

const H = RESUME_LAYOUT_SPEC.headings;

export function ResumePreview({ resume }: { resume: TailoredFullResume }) {
  const ST = ({
    title,
    copyText,
  }: {
    title: string;
    copyText?: () => string;
  }) => (
    <div className="flex items-center gap-3 mb-3 group">
      <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted">
        {title}
      </h3>
      <div className="flex-1 h-px bg-border" />
      {copyText && <CopySectionButton getText={copyText} />}
    </div>
  );
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="bg-muted px-6 py-5 border-b border-border group relative">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          {titleCaseName(resume.contact?.name || "")}
        </h2>
        <p className="text-[12px] text-muted-foreground mt-1">
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
            <ST title={H.summary} copyText={() => resume.summary || ""} />
            <p className="text-[13.5px] text-foreground leading-[1.7]">
              {resume.summary}
            </p>
          </div>
        )}
        {resume.experience?.length > 0 && (
          <div className="group">
            <ST
              title={H.experience}
              copyText={() =>
                (resume.experience || [])
                  .map(
                    (e) =>
                      `${e.company}${e.location ? `, ${e.location}` : ""}${e.title ? ` · ${e.title}` : ""}${e.dates ? ` (${e.dates})` : ""}\n${(e.bullets || []).map((b) => `  • ${b}`).join("\n")}`,
                  )
                  .join("\n\n")
              }
            />
            <div className="space-y-4">
              {resume.experience.map((exp, i) => {
                const prev = i > 0 ? resume.experience[i - 1] : null;
                const grouped = Boolean(
                  prev &&
                    (prev.company || "").trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, "") ===
                      (exp.company || "").trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, ""),
                );
                return (
                <div key={exp.content_id || i}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      {!grouped && (
                        <p className="text-[13.5px] font-semibold text-foreground">
                          {exp.company}
                          {exp.location ? `, ${exp.location}` : ""}
                        </p>
                      )}
                      {(exp.title || exp.type) && (
                        <p className={`text-[12px] text-muted-foreground italic ${grouped ? "" : "mt-0.5"}`}>
                          {exp.title}
                          {exp.title && exp.type ? " · " : ""}
                          {exp.type || ""}
                        </p>
                      )}
                    </div>
                    <span className="text-caption-sm text-muted-foreground whitespace-nowrap shrink-0">
                      {exp.dates}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {exp.bullets?.map((b, j) => (
                      <li
                        key={j}
                        className="text-[12.5px] text-ink-muted flex gap-2 leading-[1.65]"
                      >
                        <span className="text-muted-foreground shrink-0 mt-0.5">
                          &bull;
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                );
              })}
            </div>
          </div>
        )}
        {resume.projects?.length > 0 && (
          <div className="group">
            <ST
              title={H.projects}
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
                  <p className="text-[13.5px] font-semibold text-foreground">
                    {p.name}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {p.bullets?.map((b, j) => (
                      <li
                        key={j}
                        className="text-[12.5px] text-ink-muted flex gap-2 leading-[1.65]"
                      >
                        <span className="text-muted-foreground shrink-0 mt-0.5">
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
              title={(resume.skills_section_title || H.skills).toUpperCase()}
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
                  <span className="font-semibold text-foreground">
                    {c}:{" "}
                  </span>
                  <span className="text-ink-muted">
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
              title={H.education}
              copyText={() =>
                (resume.education || [])
                  .map(
                    (e) =>
                      `${e.institution}${e.degree ? ` · ${e.degree}` : ""}${e.dates ? ` (${e.dates})` : ""}`,
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
                  <div key={i}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-[12.5px] text-foreground">
                        <span className="font-semibold text-foreground">
                          {edu.institution}
                        </span>
                        {d ? ` · ${d}` : ""}
                      </p>
                      <span className="text-caption-sm text-muted-foreground whitespace-nowrap shrink-0">
                        {edu.dates}
                      </span>
                    </div>
                    {edu.coursework ? (
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {edu.coursework}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {resume.certifications?.length > 0 && (
          <div className="group">
            <ST
              title={H.certifications}
              copyText={() => (resume.certifications || []).join("\n")}
            />
            <div className="flex flex-wrap gap-2">
              {resume.certifications.map((c, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md text-caption-sm font-medium bg-muted text-ink-muted border border-border"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
        {(resume.additional_sections || []).map((sec, si) => {
          const heading = (sec.original_heading || sec.heading || "Additional").toUpperCase();
          const entries = sec.entries || [];
          const raw = (sec.raw_text || "").trim();
          if (!entries.length && !raw && sec.parse_status !== "unresolved") return null;
          return (
            <div className="group" key={sec.content_id || si}>
              <ST
                title={heading}
                copyText={() =>
                  [
                    heading,
                    raw,
                    ...entries.map((e) =>
                      [
                        [e.title, e.organization, e.dates].filter(Boolean).join(" · "),
                        e.body,
                        ...(e.bullets || []).map((b) => `  • ${b}`),
                      ]
                        .filter(Boolean)
                        .join("\n"),
                    ),
                  ]
                    .filter(Boolean)
                    .join("\n\n")
                }
              />
              {raw && !entries.length ? (
                <p className="text-[12.5px] text-ink-muted leading-[1.65]">{raw}</p>
              ) : null}
              <div className="space-y-3">
                {entries.map((e, ei) => (
                  <div key={e.content_id || ei}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-[13.5px] font-semibold text-foreground">
                        {[e.title, e.organization].filter(Boolean).join(" | ")}
                      </p>
                      <span className="text-caption-sm text-muted-foreground whitespace-nowrap shrink-0">
                        {e.dates}
                      </span>
                    </div>
                    {e.body ? (
                      <p className="text-[12.5px] text-ink-muted mt-1 leading-[1.65]">
                        {e.body}
                      </p>
                    ) : null}
                    <ul className="mt-1 space-y-1">
                      {(e.bullets || []).map((b, j) => (
                        <li
                          key={j}
                          className="text-[12.5px] text-ink-muted flex gap-2 leading-[1.65]"
                        >
                          <span className="text-muted-foreground shrink-0 mt-0.5">
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
          );
        })}
      </div>
    </div>
  );
}
