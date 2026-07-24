import { useMemo } from 'react';

interface SafeHtmlFrameProps {
  /** Server-sanitized HTML (the backend already stripped scripts + remote
   *  images). This is defense-in-depth, not the only line of defense. */
  html: string;
  /** When false (default), remote images are blocked via CSP; only data: URIs
   *  render. The user opts in per message. */
  showImages?: boolean;
  title?: string;
  className?: string;
}

/**
 * Renders untrusted message HTML inside a locked-down iframe.
 *
 * Layers of containment (even though the backend sanitizes upstream):
 * - `sandbox` WITHOUT `allow-scripts` and WITHOUT `allow-same-origin`: no JS
 *   runs, and the frame is a unique opaque origin that can't touch our DOM,
 *   cookies, or storage.
 * - A `<meta http-equiv="Content-Security-Policy">` inside the document blocks
 *   scripts/objects/frames outright and gates images: `img-src data:` when
 *   images are hidden, `img-src https: data:` once the user opts in. Remote
 *   images stay OFF by default (tracking-pixel defense).
 * - `referrerpolicy="no-referrer"` so nothing leaks a Referer.
 */
export function SafeHtmlFrame({
  html,
  showImages = false,
  title = 'Message content',
  className,
}: SafeHtmlFrameProps) {
  const srcDoc = useMemo(() => {
    // Scripts, plugins, and nested frames are always denied. Only image policy
    // flexes with the user's "show images" choice.
    const imgSrc = showImages ? 'https: data:' : 'data:';
    const csp = [
      "default-src 'none'",
      "style-src 'unsafe-inline'",
      `img-src ${imgSrc}`,
      "font-src data:",
      "script-src 'none'",
      "object-src 'none'",
      "frame-src 'none'",
      "form-action 'none'",
      "base-uri 'none'",
    ].join('; ');

    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<style>
  :root { color-scheme: light dark; }
  html,body { margin:0; padding:12px; background:transparent;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    font-size:14px; line-height:1.5; color:#111; word-break:break-word; }
  @media (prefers-color-scheme: dark) { html,body { color:#e5e5e5; } }
  a { color:#2563eb; }
  img,table { max-width:100% !important; height:auto; }
</style></head><body>${html}</body></html>`;
  }, [html, showImages]);

  return (
    <iframe
      title={title}
      // No allow-scripts, no allow-same-origin: JS is dead and the frame is a
      // null origin. This is the primary FE containment guarantee.
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      className={className}
      loading="lazy"
    />
  );
}
