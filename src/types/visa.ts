export type VisaStatusCode =
  | 'F1'
  | 'F1-CPT'
  | 'F1-OPT'
  | 'F1-STEM-OPT'
  | 'H1B'
  | 'Other';

export interface VisaProfile {
  visa_status: VisaStatusCode;
  country_of_birth?: string | null;
  stem_degree: boolean;
  opt_ead_arrival_date?: string | null;
  opt_start_date?: string | null;
  opt_end_date?: string | null;
  stem_extension_filed: boolean;
  stem_extension_end_date?: string | null;
  cpt_end_date?: string | null;
  h1b_lottery_year?: number | null;
  h1b_lottery_filed: boolean;
  current_employer_e_verified: boolean;
  /** Cumulative days unemployed on OPT so far. Null until the student tells us. */
  unemployment_days_used?: number | null;
  notes?: string;
}

export type MilestoneSeverity = 'info' | 'warning' | 'critical';

export interface VisaMilestone {
  id: string;
  label: string;
  description: string;
  date: string | null;
  days_remaining: number | null;
  severity: MilestoneSeverity;
}

/** Restrained visual band for the OPT Clock - never an alarm. */
export type OptClockBand = 'ok' | 'watch' | 'urgent';

export interface OptClockKeyDate {
  label: string;
  date: string;
}

/**
 * The OPT Clock - a calm, precise projection of an F-1 student's unemployment
 * runway on OPT. `unemployment_days_used` / `days_remaining` / `status_band`
 * are grounded in the saved profile or explicitly null; nothing is guessed.
 */
export interface OptClock {
  has_profile: boolean;
  opt_ead_start: string | null;
  opt_ead_end: string | null;
  stem_eligible: boolean;
  stem_ead_end: string | null;
  unemployment_days_used: number | null;
  unemployment_days_limit: number;
  days_remaining: number | null;
  key_dates: OptClockKeyDate[];
  status_band: OptClockBand;
  disclaimer: string;
}
