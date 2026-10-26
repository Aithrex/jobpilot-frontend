import { Navigate, useLocation, useParams } from "react-router-dom";
import { APP_HOME, appPath } from "./nav.config";

/**
 * Maps retired classic `?tab=` URLs onto the canonical `/app` shell.
 */
const TAB_TO_APP: Record<string, string> = {
  dashboard: APP_HOME,
  "auto-apply": appPath("apply", "tracker"),
  applications: appPath("apply", "tracker"),
  pipeline: appPath("apply", "pipeline"),
  jobs: appPath("jobs", "for-you"),
  "career-portals": appPath("jobs", "for-you"),
  tailor: appPath("resume", "tailor"),
  batch: appPath("resume", "batch"),
  "my-resumes": appPath("resume", "library"),
  tailored: appPath("resume", "tailored"),
  "six-seconds": appPath("resume", "library"),
  voicegraph: appPath("resume", "library"),
  learning: appPath("grow", "learning"),
  network: appPath("grow", "network"),
  events: appPath("grow", "events"),
  interview: appPath("grow", "interview"),
  copilot: appPath("grow", "copilot"),
  billing: appPath("settings", "billing"),
  notifications: appPath("settings", "notifications"),
  profile: appPath("settings", "profile"),
  visa: appPath("settings", "visa"),
  beta: appPath("settings", "beta"),
};

export default function ClassicWorkspaceRedirect() {
  const { search } = useLocation();
  const tab = new URLSearchParams(search).get("tab")?.trim() || "";
  const dest = (tab && TAB_TO_APP[tab]) || APP_HOME;
  const params = new URLSearchParams(search);
  params.delete("tab");
  const qs = params.toString();
  return <Navigate to={qs ? `${dest}?${qs}` : dest} replace />;
}

const NEXT_AREA: Record<string, string> = {
  today: "home",
  discover: "jobs",
  craft: "resume",
  applications: "apply",
};

const NEXT_LEAF: Record<string, string> = {
  jobs: "for-you",
  "my-resumes": "library",
  voicegraph: "voice",
};

/**
 * Remaps temporary `/next/*` strangler paths onto `/app/*` with renamed areas.
 */
export function LegacyNextRedirect() {
  const { "*": splat } = useParams();
  const { search } = useLocation();
  const parts = (splat || "").split("/").filter(Boolean);
  if (parts.length === 0) {
    return <Navigate to={`${APP_HOME}${search}`} replace />;
  }

  const area = NEXT_AREA[parts[0]] || parts[0];
  const leafRaw = parts[1];
  let leaf = leafRaw ? NEXT_LEAF[leafRaw] || leafRaw : undefined;
  const tail = parts.slice(2).map((p) => NEXT_LEAF[p] || p);

  // /app/jobs/for-you → area jobs + leaf was "jobs" → for-you
  if (parts[0] === "discover" && leafRaw === "jobs") {
    leaf = "for-you";
  }

  if (area === "jobs" && !leaf) leaf = "for-you";
  if (area === "resume" && !leaf) leaf = "tailor";
  if (area === "apply" && !leaf) leaf = "tracker";
  if (area === "home") {
    return <Navigate to={`${APP_HOME}${search}`} replace />;
  }

  const segs = [area, leaf, ...tail].filter(Boolean) as string[];
  return <Navigate to={`${appPath(...segs)}${search}`} replace />;
}
