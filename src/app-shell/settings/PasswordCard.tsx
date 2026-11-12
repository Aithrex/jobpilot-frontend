/**
 * Sign-in password management for the signed-in account.
 *
 * Exists mainly for accounts created with "Continue with Google": those have no
 * password, so the email + password form rejects them and the only route in was
 * the reset email. This card sets a password in-session, so password sign-in
 * never depends on mail delivery.
 */
import { useState } from "react";
import { Check, CheckCircle2, Circle, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  settingsCardCls,
  settingsCardHintCls,
  settingsCardTitleCls,
  settingsInputCls as inputCls,
  settingsLabelCls as labelCls,
} from "./settingsStyles";

/** Mirrors models/user.py: 8+ chars with upper, lower, digit and special. */
const RULES: Array<{ label: string; test: (v: string) => boolean }> = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "An uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "A lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "A number", test: (v) => /\d/.test(v) },
  { label: "A special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function PasswordCard() {
  const { user, refreshProfile } = useAuth();
  const providers = user?.authProviders ?? [];
  const hasPassword = providers.includes("password");
  const socialProviders = providers.filter((p) => p !== "password");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const rulesMet = RULES.every((r) => r.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = rulesMet && matches && (!hasPassword || currentPassword.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDone(false);
    if (!matches) {
      setError("The two passwords do not match.");
      return;
    }
    setSaving(true);
    const resp = await apiService.setPassword(
      newPassword,
      hasPassword ? currentPassword : undefined,
    );
    setSaving(false);
    if (resp.error) {
      setError(resp.error);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setDone(true);
    // Pull the updated auth_providers so the card flips to "change" mode.
    await refreshProfile();
  };

  return (
    <section aria-labelledby="pw-card-title" className={cn(settingsCardCls, "space-y-5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="pw-card-title" className={settingsCardTitleCls}>
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {hasPassword ? "Change password" : "Add a password"}
          </h2>
          <p className={settingsCardHintCls}>
            {hasPassword
              ? "Update the password you use to sign in with your email."
              : `You signed up with ${
                  socialProviders.length ? socialProviders.join(" and ") : "social sign-in"
                }, so this account has no password yet. Set one to sign in with your email and password too. Social sign-in keeps working either way.`}
          </p>
        </div>
        {providers.length > 0 && (
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-caption-sm uppercase tracking-wide text-muted-foreground">
            {providers.join(" + ")}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {hasPassword && (
          <div>
            <label htmlFor="pw-current" className={labelCls}>
              Current password
            </label>
            <input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
              disabled={saving}
            />
          </div>
        )}

        <div>
          <label htmlFor="pw-new" className={labelCls}>
            New password
          </label>
          <input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputCls}
            disabled={saving}
          />
        </div>

        <div>
          <label htmlFor="pw-confirm" className={labelCls}>
            Confirm new password
          </label>
          <input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputCls}
            disabled={saving}
          />
          {confirmPassword.length > 0 && !matches && (
            <p className="mt-1.5 text-caption-sm text-destructive">Passwords do not match.</p>
          )}
        </div>

        {newPassword.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {RULES.map((r) => {
              const ok = r.test(newPassword);
              return (
                <li
                  key={r.label}
                  className={cn(
                    "flex items-center gap-1.5 text-caption-sm",
                    ok ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {ok ? (
                    <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="sr-only">{ok ? "Met: " : "Not met: "}</span>
                  {r.label}
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="flex items-center gap-1.5 text-sm text-success" role="status">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Password saved. You can now sign in with your email
            and password.
          </p>
        )}

        <Button type="submit" disabled={saving || !canSubmit} aria-busy={saving}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : hasPassword ? (
            "Update password"
          ) : (
            "Set password"
          )}
        </Button>
      </form>
    </section>
  );
}
