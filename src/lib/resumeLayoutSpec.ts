/**
 * Mirrors services.resume_renderer.LayoutSpec.to_public_dict().
 * A backend test asserts this file stays in lockstep with DEFAULT_SPEC.
 */
export const RESUME_LAYOUT_SPEC = {
  page: "letter",
  page_width_mm: 215.9,
  page_height_mm: 279.4,
  margin_top_mm: 7.62,
  margin_bottom_mm: 6.096,
  margin_lr_mm: 10.668,
  name_pt: 19.0,
  section_pt: 11.5,
  entry_pt: 10.2,
  contact_pt: 9.4,
  body_pt: 9.4,
  text_align: "L",
  pdf_font_family: "CharisSIL",
  docx_font_family: "Georgia",
  section_order: [
    "summary",
    "experience",
    "projects",
    "skills",
    "education",
    "certifications",
  ] as const,
  headings: {
    summary: "SUMMARY",
    experience: "EXPERIENCE",
    projects: "PROJECTS",
    skills: "TECHNICAL SKILLS",
    education: "EDUCATION",
    certifications: "CERTIFICATIONS",
  } as const,
};

export type ResumeSectionKey = (typeof RESUME_LAYOUT_SPEC.section_order)[number];

/** User-facing copy when the renderer dropped content to fit the page. */
export function resumeTrimDescription(droppedCount: number): string {
  return droppedCount > 0
    ? `Removed ${droppedCount} item(s) from the downloaded file (oldest roles/projects first). Your editor copy is unchanged.`
    : "The downloaded file is shorter than the preview. Your editor copy is unchanged.";
}

export function isTrimmedOutcome(outcome?: string): boolean {
  return outcome === "trimmed_to_one" || outcome === "trimmed_to_two";
}
