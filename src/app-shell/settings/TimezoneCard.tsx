/**
 * Time zone for "Posted today", the job feed's days and the midnight refresh.
 *
 * Automatic follows this browser every time it is read, so travel is picked up
 * on its own. Choosing a zone pins it for this account on this browser until
 * Automatic is chosen again. See `lib/viewerTimezone`.
 */
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Globe2 } from "lucide-react";
import {
  detectedTimeZone,
  setTimeZoneOverride,
  timeZoneName,
  timeZoneOverride,
  US_TIME_ZONES,
  useViewerTimeZone,
} from "@/lib/viewerTimezone";
import { cn } from "@/lib/utils";
import {
  settingsCardCls,
  settingsCardHintCls,
  settingsCardTitleCls,
  settingsHelpCls,
  settingsSelectCls as selectCls,
} from "./settingsStyles";

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
    <section aria-labelledby="tz-card-title" className={cn(settingsCardCls, "space-y-4")}>
      <div>
        <h2 id="tz-card-title" className={settingsCardTitleCls}>
          <Globe2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          Time zone
        </h2>
        <p className={settingsCardHintCls}>
          Decides what counts as today and yesterday in your job feed. Automatic follows this
          device, so it changes on its own when you travel.
        </p>
      </div>

      <label className="relative block">
        <span className="sr-only">Time zone</span>
        <select
          aria-label="Time zone"
          className={selectCls}
          value={pinned ?? AUTOMATIC}
          onChange={(e) => choose(e.target.value)}
        >
          <option value={AUTOMATIC}>
            Automatic: {timeZoneName(detected)} ({detected})
          </option>
          <optgroup label="United States">
            {US_TIME_ZONES.map(({ zone, label }) => (
              <option key={zone} value={zone}>
                {label} · {timeZoneName(zone)}
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
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </label>

      <p className={cn(settingsHelpCls, "mt-0")} data-testid="timezone-active">
        {pinned
          ? `Using ${timeZoneName(active)} on this device until you choose Automatic.`
          : `Using ${timeZoneName(active)}, detected from this device.`}
      </p>
      {saved && (
        <p className="flex items-center gap-1.5 text-sm text-success" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Time zone saved
        </p>
      )}
    </section>
  );
}
