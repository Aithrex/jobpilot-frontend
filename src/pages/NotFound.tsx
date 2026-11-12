import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * 404. Token-driven so it reads in both themes (it used to pin a light
 * gradient and raw grays, which went unreadable in dark mode). One h1 that
 * says what happened; the large "404" is decoration and stays out of the
 * heading outline.
 */
export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="max-w-md space-y-6">
        <div className="space-y-3">
          <p aria-hidden="true" className="font-display text-display-lg tabular-nums text-primary">
            404
          </p>
          <h1 className="font-display text-h1 text-foreground">Page Not Found</h1>
          <p className="text-body-md text-ink-muted">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/">Return Home</Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </main>
  );
}
