#!/usr/bin/env node
/**
 * CI-equivalent verification for jobpilot-frontend.
 *
 * Fast:  node scripts/verify.mjs --fast     (pnpm test)
 * Full:  node scripts/verify.mjs --full     (install + test + build)
 *
 * Matches .github/workflows/tests.yml. Node 22 + pnpm from packageManager.
 * Does not call the backend or paid APIs.
 * copy:check and lint are recommended locally; they are not in --full
 * because the tree currently has pre-existing findings (ASCII sweep ~172
 * substitutions / ESLint). Do not add them to the required gate until green.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CACHE = join(ROOT, ".git", "verify-full.stamp");

function run(cmd, args) {
  console.log("+", cmd, args.join(" "));
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    // Windows needs a shell to resolve pnpm.cmd on PATH.
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error("verify: failed to start", cmd, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function pnpm() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function fingerprint() {
  const files = ["package.json", "pnpm-lock.yaml"];
  const h = createHash("sha256");
  for (const rel of files) {
    const p = join(ROOT, rel);
    if (existsSync(p)) h.update(rel).update(readFileSync(p));
  }
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  const diff = spawnSync("git", ["diff", "HEAD"], { cwd: ROOT });
  h.update(git.stdout || "");
  h.update(diff.stdout || Buffer.alloc(0));
  return h.digest("hex");
}

function cacheValid() {
  if (!existsSync(CACHE)) return false;
  try {
    const saved = JSON.parse(readFileSync(CACHE, "utf8"));
    return saved.ok === true && saved.fp === fingerprint();
  } catch {
    return false;
  }
}

function writeCache(ok) {
  try {
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(CACHE, JSON.stringify({ ok, fp: fingerprint() }, null, 2) + "\n");
  } catch (err) {
    console.warn("verify: could not write stamp", err.message);
  }
}

const args = process.argv.slice(2);
const full = args.includes("--full") || !args.includes("--fast");
const useCache = args.includes("--cache");

if (full && useCache && cacheValid()) {
  console.log("verify: reusing successful --full stamp (code, lockfile, HEAD unchanged)");
  process.exit(0);
}

if (full) {
  run(pnpm(), ["install", "--frozen-lockfile"]);
  run(pnpm(), ["test"]);
  run(pnpm(), ["build"]);
  writeCache(true);
} else {
  run(pnpm(), ["test"]);
}
