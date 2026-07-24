/**
 * Mail-ingress - a personal forwarding address that auto-captures application
 * updates from the inbox. Backend: /api/resume/mail-ingress/*.
 * A 404 on any of these means the feature flag is off → hide the surface.
 */

export interface MailIngressAddress {
  provisioned: boolean;
  address?: string;
  /** Ready-to-paste Gmail filter query, e.g. from:(*) to:(you+jobs@...). */
  gmail_filter?: string;
  /** Deep link that opens Gmail's "create filter" dialog pre-filled. */
  gmail_deep_link?: string;
}

export interface MailIngressSuggestion {
  id: string;
  company?: string;
  role?: string;
  from_address?: string;
  subject?: string;
  snippet?: string;
  current_status?: string;
  suggested_status?: string;
  confidence: number;
  received_at?: string;
}

export interface MailIngressSuggestionsResponse extends MailIngressAddress {
  suggestions: MailIngressSuggestion[];
}

export type MailIngressAction = 'confirm' | 'reject';
