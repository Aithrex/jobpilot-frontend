/**
 * Copy-section-to-clipboard button - shared across the Tailor flow.
 *
 * Extracted verbatim from the ResumeParser monolith so both the classic
 * workspace (`/app`) and the new app-shell render an identical copy button
 * from one source. The two inline SVGs are literal markup (not the named icon
 * components), so no icon library swap is needed here.
 */
import { useState } from "react";
import { toast } from "sonner";

export function CopySectionButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(getText());
        setCopied(true);
        toast.success("Section copied to clipboard");
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
        copied
          ? "text-emerald-500 bg-emerald-500/10"
          : "text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-500/10"
      }`}
      aria-label="Copy section to clipboard"
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}
