/** Types for scripts/copy-lint.mjs, so tests can import it under strict TS. */
export interface CopyViolation {
  file: string;
  line: number;
  col: number;
  kind: string;
  snippet: string;
}
export type CopyContext = 'copy' | 'unknown' | 'ignore';
export function isScannable(path: string): boolean;
export function findInText(text: string): Array<{ kind: string; index: number }>;
export function nameKind(name: string | null | undefined): 'copy' | 'code' | null;
export function lintSource(sourceText: string, fileName?: string): CopyViolation[];
export function lintTree(roots?: string[]): CopyViolation[];
export function formatViolation(v: CopyViolation): string;
