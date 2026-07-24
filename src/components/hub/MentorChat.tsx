import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMentor } from "@/hooks/useHub";
import type { HubPathParams } from "@/types/hub";
import { cn } from "@/lib/utils";

interface MentorChatProps {
  dayKey?: string;
  params?: HubPathParams;
}

const SUGGESTIONS = ["How should I start?", "I'm getting a 401 — ideas?", "Review my approach"];

export default function MentorChat({ dayKey, params }: MentorChatProps) {
  const { messages, pending, send } = useMentor(dayKey, params);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const submit = () => {
    const q = draft.trim();
    if (!q || pending) return;
    setDraft("");
    void send(q);
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <Bot className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">AI Mentor</p>
          <p className="text-[11px] text-muted-foreground">Senior engineer · hints, not full solutions</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-64 min-h-[7rem] space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !pending ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              I&apos;m your staff engineer on this ticket. I&apos;ll nudge you toward the answer — ask me anything.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                m.role === "user"
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-muted text-foreground",
              )}
            >
              {m.content}
              {m.role === "mentor" && m.followups && m.followups.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.followups.map((f) => (
                    <button
                      key={f}
                      onClick={() => void send(f)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:text-primary"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      {f}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {pending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask your mentor…"
          rows={1}
          className="max-h-24 min-h-[38px] resize-none text-sm"
        />
        <Button size="icon" onClick={submit} disabled={pending || !draft.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
