/**
 * Sign-in password management for the signed-in account.
 *
 * Exists mainly for accounts created with "Continue with Google": those have no
 * password, so the email + password form rejects them and the only route in was
 * the reset email. This card sets a password in-session, so password sign-in
 * never depends on mail delivery.
 */
import { useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";

const inputCls =
  "w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/60 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

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
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4" />
            {hasPassword ? "Change password" : "Add a password"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {hasPassword
              ? "Update the password you use to sign in with your email."
              : `You signed up with ${
                  socialProviders.length ? socialProviders.join(" and ") : "social sign-in"
                }, so this account has no password yet. Set one to sign in with your email and password too. Social sign-in keeps working either way.`}
          </p>
        </div>
        {providers.length > 0 && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide rounded-full border border-gray-300 dark:border-white/10 px-2 py-1 text-gray-500 dark:text-gray-400">
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
            <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
          )}
        </div>

        {newPassword.length > 0 && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {RULES.map((r) => {
              const ok = r.test(newPassword);
              return (
                <li
                  key={r.label}
                  className={`text-[11px] flex items-center gap-1.5 ${
                    ok ? "text-emerald-600 dark:text-emerald-300" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span aria-hidden>{ok ? "+" : "-"}</span>
                  {r.label}
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="text-sm text-emerald-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Password saved. You can now sign in with your email
            and password.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:shadow-none transition-all duration-200"
        >
          {saving ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />{" "}
              Saving...
            </>
          ) : hasPassword ? (
            "Update password"
          ) : (
            "Set password"
          )}
        </button>
      </form>
    </div>
  );
}
