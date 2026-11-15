import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AUTO_APPLY, STATUS_LABEL, isLive } from '@/lib/capabilities';
import { Container, Section } from './_shared';

/**
 * "Before you begin" - the ONE decision section on the public site.
 *
 * WHAT IT REPLACED, AND WHY. The page used to carry two sections that
 * answered the same questions in two shapes: `TrustAnswers` (eyebrow "Before
 * you sign up", six open answers, three of them on `/`) immediately followed
 * by `FaqSection` (seven native disclosures). Between them they said what
 * Aspirely does, who it is for, that nothing submits without permission, that
 * the free plan exists, and that you can leave - each of those at least twice,
 * in adjacent sections, in different voices. A reader who had already been
 * told "there is no automation setting until you choose one" was then asked to
 * open a disclosure to be told it again, which does not build trust; it reads
 * as a page arguing with itself. The two are one section now.
 *
 * SHAPE: a two-column decision surface, not a wall of cards. The left column
 * is the standing offer - what this is, that you stay in control, and the one
 * action - and it sticks on desktop so the CTA never scrolls away behind
 * twelve questions. The right column is the detail, collapsed, grouped by the
 * four things people actually weigh: is this for me, what does it do, who is
 * in control, and what does it cost me.
 *
 * NATIVE `<details>/<summary>`, NOT `ui/accordion`, for the same reason the
 * FAQ used it: `@radix-ui/react-accordion` is in no eager path and the landing
 * is the app's one eager route, so importing it here would grow the entry
 * chunk for every visitor in order to reproduce behaviour the platform gives
 * away. `<summary>` is focusable, Enter/Space-operable, exposes its expanded
 * state to assistive tech, and works with JavaScript off.
 *
 * EVERYTHING STARTS COLLAPSED. An open first item is worth having when the
 * first answer teaches you how to read the rest; here the four group headings
 * already do that job, and one pre-opened panel makes the other eleven look
 * like less important versions of it.
 *
 * EVIDENCE DISCIPLINE, inherited from `capabilities.ts` and kept: every answer
 * carries an `evidence` note naming what in the codebase makes it true. If you
 * cannot write the evidence line, you may not ship the answer. Three claims
 * are deliberately the WEAK version, and each is annotated at its own entry -
 * do not strengthen them without shipping the thing that would make them true.
 */

interface Answer {
  q: string;
  a: string;
  /** What in the code or the product makes this answer true. Not rendered. */
  evidence: string;
}

interface Group {
  id: string;
  title: string;
  answers: Answer[];
  /** Renders a capability's registry status beside the group title. */
  status?: typeof AUTO_APPLY.status;
}

const GROUPS: Group[] = [
  {
    id: 'who',
    title: 'Who Aspirely is for',
    answers: [
      {
        q: 'Is Aspirely only for technology jobs?',
        a: 'No. Aspirely works from what your resume actually says, in any field. How much it finds depends on which employers publish roles where you are looking, so it is deeper in some fields and cities than others. Upload a resume and see what comes back before you rely on it.',
        evidence:
          'Matching runs off the parsed resume and the search you set; there is no field allowlist anywhere in the matching path.',
      },
      {
        q: 'Can students and recent graduates use it?',
        a: 'Yes, and they are who it was built around. Aspirely works with internships, coursework, projects and part-time work the same way it works with full-time roles. What it will not do, on any plan, is add experience you do not have.',
        evidence:
          'IntegrityGuard blocks fabricated experience in tailoring; the guest flow accepts a resume with no full-time history.',
      },
      {
        q: 'Does it support candidates in the US and India?',
        a: 'You set your own target locations and both countries are in scope, including the work-authorization questions handled per country. Coverage still comes from employers publishing roles for that location, so check what you get for yours.',
        evidence:
          'Visa and work-authorization settings are per country under /app/settings/visa. Depth per market is not measured, so this claims scope, not results.',
      },
    ],
  },
  {
    id: 'what',
    title: 'What Aspirely helps with',
    answers: [
      {
        q: 'Is Aspirely only a job-search tool?',
        a: 'No. Searching is where it starts. Aspirely also prepares the application, keeps every role you are talking to in one pipeline, practices the interview with you, and shows the skills your applications keep asking for.',
        evidence:
          'Shipped destinations: /app/jobs, /app/resume, /app/apply, /app/grow (interview, learning, copilot).',
      },
      {
        q: 'Does it help after I apply?',
        a: 'Yes. Every application is tracked with its status and what happens next. If you connect Gmail, Aspirely reads job-application mail so the tracker moves when something moves, instead of waiting for you to remember.',
        evidence:
          'Tracker and pipeline under /app/apply; the Gmail integration is read-oriented and explicitly opt-in.',
      },
      {
        q: 'Can it help me grow while I search?',
        a: 'That is the part most tools leave out. Interview preparation, the skill gaps your applications reveal, and a weekly read on where your search is actually going all sit alongside the search rather than after it.',
        evidence: 'Interview, learning and copilot surfaces are live under /app/grow.',
      },
    ],
  },
  {
    id: 'control',
    title: 'Control and automation',
    status: AUTO_APPLY.status,
    answers: [
      {
        q: 'Will Aspirely apply without my permission?',
        a: 'No. Assisted applying has no setting at all until you choose one, and the part that submits refuses to run while it is unset. When you do choose, you choose the ceiling: prepare only, prepare and wait for your approval, or submit inside a daily limit. Sensitive or unclear fields stop and ask you in every mode.',
        evidence:
          'auto_apply_service mode decision returns refuse when mode is null; apply_match_sweep skips mode_unset; AutoApplyTab hard-blocks on needsMode.',
      },
      {
        q: 'Can I review and change tailored material?',
        a: 'Yes. Signed in, every tailored resume opens in an editor before you download it, with a view of what changed and the version history behind it. The free guest preview is download-only.',
        evidence:
          'ResumeEditor mounted from app-shell/pages/craft/TailorPage; GuestCompletedState has no editor affordance.',
      },
      {
        q: 'Can I pause or change how Aspirely helps?',
        a: 'Turn assisted applying off, or move it back to prepare-only, in your settings. Aspirely only works unattended in the mode you picked, so changing the mode stops it. Anything already waiting on your approval keeps waiting, and stopping never sends it.',
        evidence:
          'auto_submit_enabled master switch plus per-row cancel within the undo window. There is no run-level kill switch, so this answer does not claim one.',
      },
    ],
  },
  {
    id: 'plans',
    title: 'Plans, privacy, and flexibility',
    answers: [
      {
        q: 'Can I start for free?',
        a: 'Yes, and free is the only plan you can sign up for today. It covers matching with the reason for each match, resume tailoring with a daily limit, the tracker and the daily briefing. It does not expire and it never asks for a card.',
        evidence:
          'pricing.ts PRICING_PUBLISHED is false and only the Free plan carries a CTA. The daily limits live in pricing.ts and render in the plans section, deliberately not repeated here, so there is one place to change them.',
      },
      {
        q: 'What happens to my resume and data?',
        a: 'Aspirely uses the resume you upload and what you tell it about the search you want. If you connect Gmail it reads job-application mail so it can tell you when something moved, and it never sends mail as you. We do not sell your information. Deleting your account removes your resumes and generated files, your tailoring history, your tracked applications and saved jobs, and the stored tokens for anything you connected.',
        evidence:
          'DELETE /api/auth/account is real and thorough server-side but has NO frontend caller yet, and Privacy.tsx routes deletion through contacting us. Do NOT strengthen this to "delete your data at any time" until the settings control ships.',
      },
      {
        q: 'Can I cancel or change my plan?',
        a: 'There is nothing to cancel. Paid plans are not on sale yet, so Free is the only plan, and it never asked for a card. If you want to leave entirely, deleting your account removes your data with it.',
        evidence: 'POST /api/billing/upgrade is a documented stub; pricing.ts PRICING_PUBLISHED is false.',
      },
    ],
  },
];

const pick = (q: string): Answer => {
  const found = GROUPS.flatMap((g) => g.answers).find((a) => a.q === q);
  if (!found) throw new Error(`BeforeYouBegin: no answer for "${q}"`);
  return found;
};

/** The automation answer carries the registry status wherever it is shown. */
const AUTOMATION_Q = 'Will Aspirely apply without my permission?';

/**
 * THE SIX THE HOME PAGE ASKS. Twelve questions is a document; a buyer has
 * about six real objections, and three of them were not in the twelve at all
 * (where the sponsorship data comes from, whether an experienced person
 * belongs here, how this differs from a job board). The full set stays on
 * `/trust`, one link away.
 *
 * The same evidence rule applies: no answer without a line saying what in the
 * product makes it true.
 */
const HOME_ANSWERS: readonly Answer[] = [
  pick('Can I start for free?'),
  {
    q: 'Where does the sponsorship data come from?',
    a: 'From public H-1B filing records and from the posting itself. Filing counts are shown with the year the data covers, and a posting that rules sponsorship out is flagged in its own words. Aspirely reports this evidence. It never predicts your chances.',
    evidence:
      'JobVisaSignals.tsx renders Approvals, LCA filings and Data vintage; "Posting says no sponsorship" comes from the posting text; lib/sponsorshipSignal.ts drops every score and band.',
  },
  {
    q: 'I am not a student. Is this for me?',
    a: 'Yes. Matching works from what your resume says, in any field and at any level, and the level is read from each posting so a senior resume is set against senior roles. If you need no visa, leave that question blank and nothing is filtered.',
    evidence:
      'No field allowlist in the matching path; level is read from the posting (jd_profile level statements, ExperienceLevelPicker); WorkAuthorizationQuestion: "Nothing is filtered when it is blank."',
  },
  {
    q: 'How is this different from a job board?',
    a: "A job board shows what was posted to it, reposts included. Aspirely reads employers' own career pages, folds the duplicates, tells you why a role fits your resume and what is missing, then tailors your resume for it and tracks the application.",
    evidence:
      'Direct-employer ingestion with aggregator reposts excluded; repost folding on the board; fit reason and gaps on each card; tailoring and tracker are shipped destinations.',
  },
  pick(AUTOMATION_Q),
  pick('What happens to my resume and data?'),
];

export interface BeforeYouBeginProps {
  /** `h1` on the standalone `/trust` route, `h2` everywhere it is a section. */
  headingLevel?: 'h1' | 'h2';
  /** 'short' is the six on the home page; 'full' is every answer, grouped. */
  variant?: 'short' | 'full';
  className?: string;
}

function Disclosure({ item, showStatus = false }: { item: Answer; showStatus?: boolean }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <h4 className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">
          {item.q}
          {showStatus && item.q === AUTOMATION_Q && !isLive(AUTO_APPLY.status) && (
            <span className="pub-chip">{STATUS_LABEL[AUTO_APPLY.status]}</span>
          )}
        </h4>
        <span aria-hidden className="pub-faq-icon text-muted-foreground" />
      </summary>
      {/* `motion-safe:` rather than a hand-rolled reduced-motion check: the
          entrance simply does not exist for a visitor who asked for no
          motion. */}
      <p className="motion-safe:animate-fade-up max-w-[62ch] pb-6 pr-8 text-pretty text-[1rem] leading-relaxed text-ink-muted">
        {item.a}
      </p>
    </details>
  );
}

export function BeforeYouBegin({
  headingLevel = 'h2',
  variant = 'full',
  className,
}: BeforeYouBeginProps) {
  const short = variant === 'short';
  const Heading = headingLevel;
  const { isAuthenticated, isLoading } = useAuth();
  const authed = !isLoading && isAuthenticated;

  return (
    <Section id="before-you-begin" labelledBy="before-you-begin-heading" className={className}>
      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* THE STANDING OFFER. Sticky on desktop only: on a phone the column
              is simply the first thing you read, and a sticky block on a small
              viewport eats the screen the answers need. */}
          <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
            <Heading id="before-you-begin-heading" className="pub-h2">
              {short ? 'Fair questions.' : 'Everything you need to know before you begin.'}
            </Heading>

            {/* The one summary that does not get collapsed, on the page that
                is all answers. On the home page the six questions say it. */}
            {!short && (
              <p className="mt-8 max-w-[40ch] border-l-2 border-primary pl-5 text-pretty text-[1.0625rem] font-medium leading-relaxed text-foreground">
                You stay in control of your information, your applications, and every important
                decision.
              </p>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              {authed ? (
                <Link to="/app/home" className="focus-ring-visible pub-btn pub-btn-primary">
                  Open my workspace
                </Link>
              ) : (
                <>
                  <Link to="/register" className="focus-ring-visible pub-btn pub-btn-primary">
                    Create free account
                  </Link>
                  <Link
                    to="/login"
                    className="focus-ring-visible rounded-control text-[0.9375rem] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Already have an account? Sign in
                  </Link>
                </>
              )}
            </div>

            <p className="mt-7 max-w-md text-[0.875rem] leading-relaxed text-muted-foreground">
              Full detail is in our{' '}
              <Link
                to="/privacy"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link
                to="/terms"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Terms
              </Link>
              .
            </p>
          </div>

          {/* THE DETAIL. All closed on arrival. */}
          <div className="min-w-0 lg:col-span-7">
            {short ? (
              <>
                <div className="pub-faq divide-y divide-border border-y border-border">
                  {HOME_ANSWERS.map((item) => (
                    <Disclosure key={item.q} item={item} showStatus />
                  ))}
                </div>
                <p className="mt-6 text-[0.9375rem] text-ink-muted">
                  <Link
                    to="/trust"
                    className="focus-ring-visible rounded-sm font-semibold text-primary underline underline-offset-4 hover:decoration-2"
                  >
                    Every question, and how your data is handled
                  </Link>
                </p>
              </>
            ) : (
              GROUPS.map((group, gi) => (
                <div key={group.id} className={cn(gi > 0 && 'mt-12')}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-[0.9375rem] font-semibold tracking-normal text-muted-foreground">
                      {group.title}
                    </h3>
                    {group.status && <span className="pub-chip">{STATUS_LABEL[group.status]}</span>}
                  </div>
                  <div className="pub-faq mt-3 divide-y divide-border border-y border-border">
                    {group.answers.map((item) => (
                      <Disclosure key={item.q} item={item} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
