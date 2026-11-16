import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, LogIn } from "lucide-react";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { gmailErrorCode, startGmailConnect } from "@/components/resume/gmailState";

const TRACKER = "/app/apply/tracker";

/** What went wrong, in words, and whether starting again can fix it. */
interface Failure {
  title: string;
  body: string;
  retry: boolean;
}

const NOTHING_CONNECTED = "Nothing was connected and no email was read.";

/**
 * Every failure gets its own sentence. The server's text is never shown: an
 * older backend put the raw exception there.
 */
function failureFor(code: string | null): Failure {
  switch (code) {
    case "access_denied":
      return {
        title: "Gmail was not connected",
        body: `You left Google's screen without allowing access. ${NOTHING_CONNECTED} You can connect whenever you like.`,
        retry: true,
      };
    case "missing_params":
    case "state_invalid":
      return {
        title: "This Google sign in has expired",
        body: `The step at Google lasts 10 minutes and works once. This one took longer, was already used, or was started from a different Aspirely account. ${NOTHING_CONNECTED}`,
        retry: true,
      };
    case "code_rejected":
      return {
        title: "Google did not accept the sign in",
        body: `It may have expired or been used twice, for example by reloading this page. ${NOTHING_CONNECTED}`,
        retry: true,
      };
    case "permission_missing":
      return {
        title: "Gmail access was not ticked",
        body: `Google's screen has a box that lets Aspirely view your email messages, and it was left unticked. Without it there is nothing Aspirely can read. Connect again and tick that box. ${NOTHING_CONNECTED}`,
        retry: true,
      };
    case "no_refresh_token":
      return {
        title: "Google did not give lasting access",
        body: `Google let Aspirely in for this visit only, which is not enough to keep your tracker updated. Connect again and choose Allow when Google asks. ${NOTHING_CONNECTED}`,
        retry: true,
      };
    case "gmail_unavailable":
      return {
        title: "Gmail connection is switched off",
        body: `Connecting Gmail is not available on Aspirely right now. This is on our side. ${NOTHING_CONNECTED} Try again later.`,
        retry: false,
      };
    default:
      return {
        title: "Couldn't connect Gmail",
        body: `Something went wrong while finishing the connection. ${NOTHING_CONNECTED} Connecting again usually works.`,
        retry: true,
      };
  }
}

type Phase = "checking" | "working" | "done" | "signin" | "error";

/**
 * Google sends the user back here with a one time code. We hand `{code, state}`
 * to the backend, which checks the state belongs to the signed-in account,
 * swaps the code for tokens and stores the encrypted refresh token.
 *
 * The backend needs the session for that check, so a session that ran out
 * while the user was at Google must not throw the code away: we ask them to
 * sign in and come straight back to this exact URL to finish.
 */
export default function GmailCallback() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>("checking");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const ranRef = useRef(false);

  const fail = useCallback((code: string | null) => {
    setFailure(failureFor(code));
    setPhase("error");
  }, []);

  useEffect(() => {
    // Wait until we know whether there is a session before spending the code.
    if (isLoading || ranRef.current) return;

    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      ranRef.current = true;
      fail(oauthError === "access_denied" ? "access_denied" : null);
      return;
    }
    if (!code || !state) {
      ranRef.current = true;
      fail("missing_params");
      return;
    }
    if (!isAuthenticated) {
      // Not burned: the code is still in the URL for after sign in.
      setPhase("signin");
      return;
    }

    ranRef.current = true;
    setPhase("working");
    (async () => {
      const resp = await apiService.finishGmailLink(code, state);
      if (resp.status === 401) {
        // The session ended at Google. The backend refused before touching the
        // code, so it is still good once they sign in again.
        ranRef.current = false;
        setPhase("signin");
        return;
      }
      if (resp.error) {
        fail(gmailErrorCode(resp));
        return;
      }
      setPhase("done");
      // The tracker sees ?gmail=linked and starts the first check by itself.
      setTimeout(() => navigate(`${TRACKER}?gmail=linked`, { replace: true }), 600);
    })();
  }, [params, navigate, isLoading, isAuthenticated, fail]);

  const signIn = useCallback(() => {
    navigate("/login", {
      state: { from: { pathname: location.pathname, search: location.search } },
    });
  }, [navigate, location.pathname, location.search]);

  const connectAgain = useCallback(async () => {
    setReconnecting(true);
    const error = await startGmailConnect(() => apiService.getGmailAuthUrl());
    if (error) {
      setReconnecting(false);
      setFailure({ title: "Couldn't open Google", body: error, retry: true });
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      {/* One live region for the whole card, so each phase is announced. */}
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
        role={phase === "error" ? "alert" : "status"}
        aria-live={phase === "error" ? "assertive" : "polite"}
      >
        {(phase === "checking" || phase === "working") && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-3 font-display text-title-md text-foreground">Connecting your Gmail...</h1>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Google sent you back. Aspirely is saving read only access. This takes a few seconds, so
              keep this page open.
            </p>
          </>
        )}
        {phase === "done" && (
          <>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-3 font-display text-title-md text-foreground">Gmail connected</h1>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Taking you to your tracker, where the first check starts by itself.
            </p>
          </>
        )}
        {phase === "signin" && (
          <>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <LogIn className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-3 font-display text-title-md text-foreground">
              Sign in to finish connecting Gmail
            </h1>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Google approved the connection, but your Aspirely session ended while you were there.
              Sign in and you come straight back here to finish. The Google step lasts 10 minutes,
              so do it now. Use the same account you started from.
            </p>
            <Button type="button" className="mt-4" onClick={signIn}>
              Sign in to finish
            </Button>
          </>
        )}
        {phase === "error" && failure && (
          <>
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-3 font-display text-title-md text-foreground">{failure.title}</h1>
            <p className="mt-1 text-body-sm text-ink-muted">{failure.body}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {failure.retry && isAuthenticated && (
                <Button type="button" disabled={reconnecting} onClick={connectAgain}>
                  {reconnecting ? "Opening Google..." : "Connect again"}
                </Button>
              )}
              <Button
                type="button"
                variant={failure.retry && isAuthenticated ? "ghost" : "default"}
                onClick={() => navigate(TRACKER, { replace: true })}
              >
                Back to the tracker
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
