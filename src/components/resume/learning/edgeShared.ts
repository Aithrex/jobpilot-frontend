import { Github, GitPullRequest, Globe, FileText, type LucideIcon } from 'lucide-react';
import type { EdgeProofType, EdgeLevel, EdgeDuration } from '@/types/learning';

/** How each proof type is labelled + collected in the verify step. */
export interface ProofMeta {
  label: string;
  icon: LucideIcon;
  /** Whether verification wants a URL or a pasted write-up. */
  kind: 'url' | 'text';
  placeholder: string;
  inputLabel: string;
}

export const PROOF_META: Record<EdgeProofType, ProofMeta> = {
  github_repo: {
    label: 'GitHub repo',
    icon: Github,
    kind: 'url',
    placeholder: 'https://github.com/you/your-project',
    inputLabel: 'Repository URL',
  },
  github_pr: {
    label: 'GitHub PR',
    icon: GitPullRequest,
    kind: 'url',
    placeholder: 'https://github.com/org/repo/pull/123',
    inputLabel: 'Pull request URL',
  },
  deployed_url: {
    label: 'Deployed URL',
    icon: Globe,
    kind: 'url',
    placeholder: 'https://your-demo.vercel.app',
    inputLabel: 'Live URL',
  },
  writeup: {
    label: 'Write-up',
    icon: FileText,
    kind: 'text',
    placeholder: 'Paste your write-up — what you built, the tradeoffs, what you learned…',
    inputLabel: 'Your write-up',
  },
};

export function proofMeta(type: EdgeProofType): ProofMeta {
  return PROOF_META[type] ?? PROOF_META.writeup;
}

export const LEVEL_OPTIONS: { id: EdgeLevel; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'We read your level and pick the right scaffolding.' },
  { id: 'guided', label: 'Guided', hint: 'We give you the skeleton and sub-steps.' },
  { id: 'advanced', label: 'Advanced', hint: "You're on your own — just the brief and a stretch." },
];

export const DURATION_OPTIONS: EdgeDuration[] = [7, 14];

/** market_frequency (0..1) → a calm "trending in your market" percentage. */
export function marketPct(frequency: number): number {
  const n = Number.isFinite(frequency) ? frequency : 0;
  return Math.max(0, Math.min(100, Math.round(n * 100)));
}
