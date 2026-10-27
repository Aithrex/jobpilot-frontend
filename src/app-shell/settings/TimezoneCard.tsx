/**
 * Time zone for "Posted today", the job feed's days and the midnight refresh.
 *
 * Automatic follows this browser every time it is read, so travel is picked up
 * on its own. Choosing a zone pins it for this account on this browser until
 * Automatic is chosen again. See `lib/viewerTimezone`.
 */
import { useMemo, useState } from "react";
import { CheckCircle2, Globe2 } from "lucide-react";
import {
  detectedTimeZone,
  setTimeZoneOverride,
  timeZoneName,
  timeZoneOverride,
  US_TIME_ZONES,
  useViewerTimeZone,
} from "@/lib/viewerTimezone";

const selectCls =
  "w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/60 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all";

const AUTOMATIC = "__auto__";

/** Every IANA zone the browser knows, when it can list them. */
function allZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  try {
    return intl.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
}

export default function TimezoneCard() {
  const active = useViewerTimeZone();
  const [pinned, setPinned] = useState<string | null>(() => timeZoneOverride());
  const [saved, setSaved] = useState(false);
  const detected = detectedTimeZone();
  const usZones = new Set(US_TIME_ZONES.map((z) => z.zone));
  const others = useMemo(() => allZones().filter((z) => !usZones.has(z)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (value: string) => {
    const zone = value === AUTOMATIC ? null : value;
    setTimeZoneOverride(zone);
    setPinned(zone);
    setSaved(true);
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-6 space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
          <Globe2 className="w-4 h-4" />
          Time zone
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          Decides what counts as today and yesterday in your job feed. Automatic follows this
          device, so it changes on its own when you travel.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Time zone</span>
        <select
          aria-label="Time zone"
          className={selectCls}
          value={pinned ?? AUTOMATIC}
          onChange={(e) => choose(e.target.value)}
        >
          <option value={AUTOMATIC}>
            Automatic - {timeZoneName(detected)} ({detected})
          </option>
          <optgroup label="United States">
            {US_TIME_ZONES.map(({ zone, label }) => (
              <option key={zone} value={zone}>
                {label} - {timeZoneName(zone)}
              </option>
            ))}
          </optgroup>
          {others.length > 0 && (
            <optgroup label="Other time zones">
              {others.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="timezone-active">
        {pinned
          ? `Using ${timeZoneName(active)} on this device until you choose Automatic.`
          : `Using ${timeZoneName(active)}, detected from this device.`}
      </p>
      {saved && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Time zone saved
        </p>
      )}
    </div>
  );
}
