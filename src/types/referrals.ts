/**
 * Referral discovery + the LinkedIn-archive diff. Backend:
 * /api/resume/referrals* and /api/resume/linkedin-archive*.
 * Referrals gate at Premium+ (403 upgrade_required).
 */

export interface Referral {
  id?: string;
  name: string;
  headline?: string;
  title?: string;
  company?: string;
  /** True when this person shares the user's school (alumni signal). */
  is_alumni?: boolean;
  /** e.g. "Stanford '21" — surfaced next to the alumni flag. */
  alumni_of?: string;
  profile_url?: string;
  relationship?: string;
  mutuals?: number;
  location?: string;
}

export interface ReferralsResponse {
  company: string;
  referrals: Referral[];
}

/** One field that differs between the user's résumé and their LinkedIn export. */
export interface LinkedInDiffItem {
  field: string;
  label?: string;
  resume_value?: string;
  linkedin_value?: string;
  suggestion?: string;
  severity?: 'info' | 'minor' | 'major';
}

export interface LinkedInDiff {
  has_archive: boolean;
  uploaded_at?: string;
  items: LinkedInDiffItem[];
  summary?: string;
}
