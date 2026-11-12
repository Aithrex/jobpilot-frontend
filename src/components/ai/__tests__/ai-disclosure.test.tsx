/**
 * AI disclosure: conversational AI surfaces say they are AI (Colorado and Utah
 * AI-interaction rules), and AI drafts tell the person to review before sending.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AI_CHAT_DISCLOSURE, AI_DRAFT_DISCLOSURE, AiDisclosure } from '@/components/ai/AiDisclosure';

vi.mock('@/hooks/useHub', () => ({
  useMentor: () => ({ messages: [], pending: false, send: vi.fn() }),
}));

describe('AiDisclosure', () => {
  it('says a chat is an AI assistant, not a person', () => {
    render(<AiDisclosure />);
    expect(screen.getByTestId('ai-disclosure')).toHaveTextContent(AI_CHAT_DISCLOSURE);
    expect(AI_CHAT_DISCLOSURE).toMatch(/AI assistant, not a person/);
  });

  it('labels a draft as AI-written and asks for review', () => {
    render(<AiDisclosure kind="draft" />);
    expect(screen.getByTestId('ai-disclosure')).toHaveTextContent(
      'Drafted by AI from your resume. Review before you send.',
    );
    expect(AI_DRAFT_DISCLOSURE).toBe('Drafted by AI from your resume. Review before you send.');
  });

  it('is visible in the mentor chat before any message is sent', async () => {
    // jsdom has no Element.scrollTo; the chat scrolls to the newest message.
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
    const { default: MentorChat } = await import('@/components/hub/MentorChat');
    render(<MentorChat />);
    expect(screen.getByTestId('ai-disclosure')).toHaveTextContent(AI_CHAT_DISCLOSURE);
    expect(screen.getByRole('textbox', { name: /message the ai mentor/i })).toBeInTheDocument();
  });
});
