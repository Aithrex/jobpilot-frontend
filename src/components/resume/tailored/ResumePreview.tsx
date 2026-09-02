/**
 * Tailored resume preview - shared across the Tailor flow.
 *
 * Extracted verbatim from the ResumeParser monolith so both the classic
 * workspace (`/app`) and the new app-shell render an identical resume preview
 * from one source. Markup/classes are a parity move (raw purple/gray colors
 * preserved intentionally - this is NOT a re-theme).
 *
 * Section order follows `content_plan.section_order` when the backend
 * attached a plan (licenses near the top for licensed professions).
 */
import type { ReactNode } from "react";
import { CopySectionButton } from "./CopySectionButton";
import { titleCaseName } from "@/lib/filename";
import type { TailoredFullResume } from "@/types/resume";

const DEFAULT_SECTION_ORDER = [
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
  "licenses",
  "certifications",
  "languages",
  "awards",
  "publications",
  "patents",
  "leadership",
  "volunteering",
  "associations",
  "clearance",
];

const LIST_SECTIONS: Array<{ key: keyof TailoredFullResume; title: string }> = [
  { key: "licenses", title: "Licenses" },
  { key: "certifications", title: "Certifications" },
  { key: "languages", title: "Languages" },
  { key: "awards", title: "Awards" },
  { key: "publications", title: "Publications" },
  { key: "patents", title: "Patents" },
  { key: "leadership", title: "Leadership" },
  { key: "volunteering", title: "Volunteering" },
  { key: "associations", title: "Associations" },
  { key: "clearance", title: "Clearance" },
];

export function ResumePreview({ resume }: { resume: TailoredFullResume }) {
  const ST = ({
    title,
    copyText,
  }: {
    title: string;
    copyText?: () => string;
  }) => (
    <div className="flex items-center gap-3 mb-2 group">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-black">
        {title}
      </h3>
      <div className="flex-1 h-px bg-black" />
      {copyText && <CopySectionButton getText={copyText} />}
    </div>
  );

  const planned =
    resume.layout_plan?.section_order || resume.content_plan?.section_order || [];
  const order = planned.length
    ? [
        ...planned.filter((k) => DEFAULT_SECTION_ORDER.includes(k)),
        ...DEFAULT_SECTION_ORDER.filter((k) => !planned.includes(k)),
      ]
    : DEFAULT_SECTION_ORDER;

  const blocks: Record<string, ReactNode> = {
    summary: resume.summary ? (
      <div className="group" key="summary">
        <ST title="Summary" copyText={() => resume.summary || ""} />
        <p className="text-[13.5px] text-gray-800 dark:text-gray-100 leading-[1.7]">
          {resume.summary}
        </p>
      </div>
    ) : null,
    experience: resume.experience?.length ? (
      <div className="group" key="experience">
        <ST
          title="Experience"
          copyText={() =>
            (resume.experience || [])
              .map(
                (e) =>
                  `${e.company}${e.location ? `, ${e.location}` : ""}${e.title ? ` - ${e.title}` : ""}${e.dates ? ` (${e.dates})` : ""}\n${(e.bullets || []).map((b) => `  • ${b}`).join("\n")}`,
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
    ) : null,
    projects: resume.projects?.length ? (
      <div className="group" key="projects">
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
    ) : null,
    skills: resume.skills && Object.keys(resume.skills).length > 0 ? (
      <div className="group" key="skills">
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
    ) : null,
    education: resume.education?.length ? (
      <div className="group" key="education">
        <ST
          title="Education"
          copyText={() =>
            (resume.education || [])
              .map(
                (e) =>
                  `${e.institution}${e.degree ? ` - ${e.degree}` : ""}${e.dates ? ` (${e.dates})` : ""}`,
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
                  {d ? `  - ${d}` : ""}
                </p>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                  {edu.dates}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    ) : null,
    licenses: resume.licenses && resume.licenses.length > 0 ? (
      <div className="group" key="licenses">
        <ST
          title="Licenses"
          copyText={() => (resume.licenses || []).join("\n")}
        />
        <div className="flex flex-wrap gap-2">
          {resume.licenses.map((c, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    ) : null,
    certifications: resume.certifications?.length ? (
      <div className="group" key="certifications">
        <ST
          title="Certifications"
          copyText={() => (resume.certifications || []).join("\n")}
        />
        <p className="text-[12px] text-black">{resume.certifications.join("  ·  ")}</p>
      </div>
    ) : null,
  };

  for (const { key, title } of LIST_SECTIONS) {
    if (key === "licenses" || key === "certifications") continue;
    const items = (resume[key] as string[] | undefined) || [];
    blocks[String(key)] = items.length ? (
      <div className="group" key={String(key)}>
        <ST title={title} copyText={() => items.join("\n")} />
        <p className="text-[12px] text-black">{items.join("  ·  ")}</p>
      </div>
    ) : null;
  }

  const letter = (resume.layout_plan?.page_format || "").toLowerCase() === "letter";
  const bodyPt = resume.layout_plan?.body_size || 10;

  return (
    <div className="flex justify-center bg-[#d8d4cc] py-6 dark:bg-neutral-950">
      <div
        className="relative bg-white text-black shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
        style={{
          width: letter ? "8.5in" : "210mm",
          minHeight: letter ? "11in" : "297mm",
          padding: "0.4in 0.6in",
          fontFamily: '"Tinos", "Times New Roman", Times, serif',
          fontSize: `${bodyPt}pt`,
        }}
      >
        <div className="group relative border-b border-black pb-2">
          <h2 className="text-center text-[17pt] font-bold leading-none text-black">
            {titleCaseName(resume.contact?.name || "")}
          </h2>
          {resume.headline ? (
            <p className="mt-1 text-center text-[11pt] italic text-black">
              {resume.headline}
            </p>
          ) : null}
          <p className="mt-1 text-center text-[10.5pt] text-black">
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
          <div className="absolute top-0 right-0">
            <CopySectionButton
              getText={() =>
                [
                  resume.contact?.name,
                  resume.headline,
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
        <div className="mt-3 space-y-3">
          {order.map((key) => blocks[key])}
        </div>
      </div>
    </div>
  );
}
