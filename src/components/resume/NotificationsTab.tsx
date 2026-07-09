import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell, Mail, MessageCircle, MessageSquare, Smartphone, Moon, RefreshCw, AlertCircle,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  NotificationChannel,
  NotificationPrefs,
} from "@/types/notifications";

const CHANNEL_META: { key: NotificationChannel; label: string; icon: typeof Mail }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "push", label: "Push", icon: Smartphone },
];

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: typeof Bell; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiService.getNotificationPrefs();
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setPrefs(res.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Optimistically apply `next`, PUT it, reconcile with the server echo. */
  const save = async (next: NotificationPrefs) => {
    const prev = prefs;
    setPrefs(next);
    setSaving(true);
    const res = await apiService.updateNotificationPrefs(next);
    setSaving(false);
    if (res.error) {
      setPrefs(prev);
      toast.error("Couldn't save preferences", { description: res.error });
      return;
    }
    if (res.data) setPrefs(res.data);
  };

  const unsubscribe = async () => {
    const res = await apiService.unsubscribeNotifications();
    if (res.error) {
      toast.error("Couldn't unsubscribe", { description: res.error });
      return;
    }
    if (prefs) setPrefs({ ...prefs, master_enabled: false });
    toast.success("Unsubscribed from all notifications");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (error || !prefs) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">{error || "Notification preferences are unavailable."}</div>
        <Button variant="outline" size="sm" onClick={load}>Retry</Button>
      </div>
    );
  }

  const p = prefs;
  const disabled = !p.master_enabled;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Account · Notifications</p>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Notifications</h2>
          {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Choose what we tell you about, where, and when — no noise you didn't ask for.
        </p>
      </div>

      {/* Master switch */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <p className="text-sm font-bold">All notifications</p>
          <p className="text-xs text-muted-foreground">Master switch for everything below.</p>
        </div>
        <Switch
          checked={p.master_enabled}
          onCheckedChange={(v) => save({ ...p, master_enabled: v })}
          aria-label="Toggle all notifications"
        />
      </div>

      <div className={cn("space-y-6 transition-opacity", disabled && "opacity-60")}>
        {/* Channels */}
        <SectionCard title="Channels" icon={Mail}>
          <ul className="space-y-1">
            {CHANNEL_META.map(({ key, label, icon: Icon }) => {
              const ch = p.channels?.[key] ?? { enabled: false, available: key === "email" };
              return (
                <li key={key} className="flex items-center justify-between gap-3 rounded-lg px-1 py-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      {ch.address && <p className="truncate text-xs text-muted-foreground">{ch.address}</p>}
                    </div>
                  </div>
                  {ch.available ? (
                    <Switch
                      checked={ch.enabled}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        save({ ...p, channels: { ...p.channels, [key]: { ...ch, enabled: v } } })
                      }
                      aria-label={`Toggle ${label} notifications`}
                    />
                  ) : (
                    <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* Events */}
        <SectionCard title="What to notify me about" icon={Bell}>
          {(p.events?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No event types available yet.</p>
          ) : (
            <ul className="divide-y divide-border/70">
              {p.events.map((ev, i) => (
                <li key={ev.key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Label htmlFor={`ev-${ev.key}`} className="text-sm font-medium">{ev.label}</Label>
                    {ev.description && <p className="text-xs text-muted-foreground">{ev.description}</p>}
                  </div>
                  <Switch
                    id={`ev-${ev.key}`}
                    checked={ev.enabled}
                    disabled={disabled}
                    onCheckedChange={(v) => {
                      const events = p.events.map((e, idx) => (idx === i ? { ...e, enabled: v } : e));
                      save({ ...p, events });
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Quiet hours */}
        <SectionCard title="Quiet hours" icon={Moon}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pause notifications during a nightly window.</p>
            <Switch
              checked={p.quiet_hours?.enabled ?? false}
              disabled={disabled}
              onCheckedChange={(v) =>
                save({ ...p, quiet_hours: { ...p.quiet_hours, enabled: v } })
              }
              aria-label="Toggle quiet hours"
            />
          </div>
          {p.quiet_hours?.enabled && (
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="qh-start" className="text-[11px] uppercase tracking-wide text-muted-foreground">From</Label>
                <Input
                  id="qh-start"
                  type="time"
                  value={p.quiet_hours.start ?? "22:00"}
                  disabled={disabled}
                  className="h-9 w-32"
                  onChange={(e) => setPrefs({ ...p, quiet_hours: { ...p.quiet_hours, start: e.target.value } })}
                  onBlur={() => save(p)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qh-end" className="text-[11px] uppercase tracking-wide text-muted-foreground">To</Label>
                <Input
                  id="qh-end"
                  type="time"
                  value={p.quiet_hours.end ?? "07:00"}
                  disabled={disabled}
                  className="h-9 w-32"
                  onChange={(e) => setPrefs({ ...p, quiet_hours: { ...p.quiet_hours, end: e.target.value } })}
                  onBlur={() => save(p)}
                />
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Unsubscribe */}
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">Want to stop everything at once?</p>
        <Button variant="outline" size="sm" onClick={unsubscribe}>Unsubscribe from all</Button>
      </div>
    </div>
  );
}
