// Learning Hub — Social Sharing / Verification stubs (interfaces only).
//
// These are intentionally NOT implemented. They exist so future GitHub-OAuth
// verification and LinkedIn editable-post sharing plug in without changing the
// Learning Hub components — the affordances already call these stubs.

import type { HubDay } from "@/types/hub";

export interface ShareDraft {
  platform: "linkedin";
  headline: string;
  body: string;
  hashtags: string[];
  editable: boolean;
}

export interface StubResult {
  disabled: true;
  reason: "coming_soon";
}

/** Future: generate an editable LinkedIn post from a completed day/achievement. */
export function shareToLinkedIn(_day: HubDay): StubResult {
  return { disabled: true, reason: "coming_soon" };
}

/** Future: verify a submission via GitHub OAuth (repo/commit/build/tests/CI). */
export function verifyViaGitHub(_day: HubDay): StubResult {
  return { disabled: true, reason: "coming_soon" };
}
