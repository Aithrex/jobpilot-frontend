import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";

/**
 * Lands here after the user consents on Google. We POST { code, state } to
 * the backend (which validates the state, exchanges for tokens, and stores
 * the encrypted refresh token), then bounce them back to Applications
 * with a query flag the Applications tab listens for.
 */
export default function GmailCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(oauthError === "access_denied" ? "You cancelled the Gmail link." : oauthError);
      setStatus("error");
      return;
    }
    if (!code || !state) {
      setError("Missing authorization code or state.");
      setStatus("error");
      return;
    }

    (async () => {
      const resp = await apiService.finishGmailLink(code, state);
      if (resp.error) {
        setError(resp.error);
        setStatus("error");
        return;
      }
      setStatus("done");
      // Hop back into the Applications tracker. The ?gmail=linked flag lets
      // ApplicationsTab refresh its Gmail status without a full reload.
      setTimeout(() => navigate("/app/apply/tracker?gmail=linked", { replace: true }), 600);
    })();
  }, [params, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      {/* One live region for the whole card, so each phase is announced. */}
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
        role={status === "error" ? "alert" : "status"}
        aria-live={status === "error" ? "assertive" : "polite"}
      >
        {status === "working" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-3 font-display text-title-md text-foreground">Linking your Gmail...</h1>
            <p className="mt-1 text-body-sm text-muted-foreground">This usually takes a couple of seconds.</p>
          </>
        )}
        {status === "done" && (
          <>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-3 font-display text-title-md text-foreground">Gmail linked.</h1>
            <p className="mt-1 text-body-sm text-muted-foreground">Taking you back to your applications...</p>
          </>
        )}
        {status === "error" && (
          <>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-3 font-display text-title-md text-foreground">Couldn't link Gmail</h1>
            <p className="mt-1 text-body-sm text-ink-muted">{error}</p>
            <Button
              type="button"
              className="mt-4"
              onClick={() => navigate("/app/apply/tracker", { replace: true })}
            >
              Back to Applications
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
