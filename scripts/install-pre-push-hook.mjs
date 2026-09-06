#!/usr/bin/env node
/**
 * Install a repository-local pre-push hook. Does not change global Git config.
 *
 *   node scripts/install-pre-push-hook.mjs
 */
import { chmodSync, copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(ROOT, ".githooks", "pre-push");

function gitDir() {
  const git = join(ROOT, ".git");
  try {
    const text = readFileSync(git, "utf8");
    const line = text.split("\n").find((l) => l.startsWith("gitdir:"));
    if (line) return line.split(":").slice(1).join(":").trim();
  } catch {
    // .git is a directory
  }
  return git;
}

const dest = join(gitDir(), "hooks", "pre-push");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
try {
  chmodSync(dest, 0o755);
} catch {
  // Windows: executable bit is not required when Git Bash runs the hook.
}
console.log(`Installed repository-local pre-push hook at ${dest}`);
console.log("Pushes will run: node scripts/verify.mjs --full --cache");
console.log("CI remains the authoritative gate. Bypass only with git push --no-verify.");
