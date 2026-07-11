import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileForm {
  name: string;
  role: string;
  sector: string;
}

const EMPTY: ProfileForm = { name: "", role: "", sector: "" };

/**
 * Lightweight identity panel for the consolidated settings hub. Reads and
 * writes name/role/sector via apiService; deeper strategy/memory fields stay in
 * the classic workspace profile (linked below).
 */
export default function ProfilePanel() {
  const [email, setEmail] = useState<string>("");
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [initial, setInitial] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiService.getProfile();
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error || "Couldn't load your profile.");
      return;
    }
    const next: ProfileForm = {
      name: res.data.name || "",
      role: res.data.role || "",
      sector: res.data.sector || "",
    };
    setEmail(res.data.email || "");
    setForm(next);
    setInitial(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty =
    form.name !== initial.name ||
    form.role !== initial.role ||
    form.sector !== initial.sector;

  const onSave = useCallback(async () => {
    setSaving(true);
    const res = await apiService.updateProfile({
      name: form.name.trim(),
      role: form.role.trim(),
      sector: form.sector.trim(),
    });
    setSaving(false);
    if (res.error || !res.data) {
      toast.error(res.error || "Couldn't save your profile.");
      return;
    }
    const next: ProfileForm = {
      name: res.data.name || "",
      role: res.data.role || "",
      sector: res.data.sector || "",
    };
    setForm(next);
    setInitial(next);
    toast.success("Profile updated.");
  }, [form]);

  if (loading) {
    return (
      <div className="max-w-xl space-y-6" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-3">
            <p className="text-sm text-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load()} className="min-h-[44px]">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <section className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            value={email}
            readOnly
            disabled
            className="min-h-[44px] bg-muted/40"
            aria-describedby="profile-email-hint"
          />
          <p id="profile-email-hint" className="text-xs text-muted-foreground">
            Your sign-in address. Manage sign-in methods in the classic workspace.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Your name"
            className="min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-role">Target role</Label>
          <Input
            id="profile-role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="e.g. Senior Frontend Engineer"
            className="min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-sector">Sector</Label>
          <Input
            id="profile-sector"
            value={form.sector}
            onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
            placeholder="e.g. Fintech, Healthcare"
            className="min-h-[44px]"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => void onSave()} disabled={!dirty || saving} className="min-h-[44px]">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {dirty && !saving && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
        </div>
      </section>

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">
          Career strategy &amp; memory
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Job-search preferences, saved answers, and long-term memory still live
          in the classic workspace.
        </p>
        <Link
          to="/app?tab=profile"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Open advanced profile
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
