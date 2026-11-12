/**
 * AiDisclosure: the one visible line that tells a person they are reading or
 * talking to AI output.
 *
 * Colorado (SB 24-205) and Utah (SB 149) expect a consumer to be told when
 * they are interacting with an AI system, and generated application material
 * should say plainly that a person needs to review it before it is sent. Keep
 * the wording here so every surface says the same thing.
 */
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AI_CHAT_DISCLOSURE = 'You are chatting with an AI assistant, not a person. It can make mistakes.';
export const AI_DRAFT_DISCLOSURE = 'Drafted by AI from your resume. Review before you send.';

interface AiDisclosureProps {
  /** `chat` for a conversational assistant, `draft` for generated text shown to edit or send. */
  kind?: 'chat' | 'draft';
  /** Override the sentence, e.g. when the draft is built from more than the resume. */
  text?: string;
  className?: string;
}

export function AiDisclosure({ kind = 'chat', text, className }: AiDisclosureProps) {
  return (
    <p
      className={cn('flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground', className)}
      data-testid="ai-disclosure"
    >
      <Bot className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{text ?? (kind === 'chat' ? AI_CHAT_DISCLOSURE : AI_DRAFT_DISCLOSURE)}</span>
    </p>
  );
}

export default AiDisclosure;
