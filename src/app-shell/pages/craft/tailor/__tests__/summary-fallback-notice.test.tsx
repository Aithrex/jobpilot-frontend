import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { ResumePreviewFrame } from '../ResumePreviewFrame';
import type { TailorPipelineResult, TailoredFullResume } from '../types';

vi.mock('framer-motion', () => ({
  motion: { div: (props: { children?: import('react').ReactNode }) => <div>{props.children}</div> },
  useReducedMotion: () => true,
}));

function resume(over: Partial<TailoredFullResume> = {}): TailoredFullResume {
  return {
    contact: {
      name: 'Alex',
      email: 'a@example.com',
      phone: '',
      linkedin: '',
      github: '',
    },
    summary: 'Backend engineer building Python APIs.',
    skills: { Languages: ['Python'] },
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    ...over,
  };
}

function result(resumeOver: Partial<TailoredFullResume> = {}): TailorPipelineResult {
  return {
    jd_analysis: {
      job_title: 'SDE',
      company: '',
      location: '',
      employment_type: '',
      required_skills: [],
      preferred_skills: [],
      responsibilities: [],
      qualifications: [],
      experience_years: '',
      industry: '',
      keywords: [],
    },
    tailored_resume: resume(resumeOver),
  };
}

const noop = () => {};

describe('summary fallback notice', () => {
  test('shows a non-blocking notice when the writer kept the base summary', () => {
    render(
      <ResumePreviewFrame
        result={result({
          summary_write: {
            writer_revision: '2026-09-05.1',
            role_label: 'Software engineer',
            source: 'base',
            attempts: 2,
            reasons: ['shape'],
          },
        })}
        baseResume={resume()}
        previousResume={null}
        regenView="tailored"
        onRegenViewChange={noop}
        versions={[]}
        onRestoreVersion={noop}
        onRevert={noop}
        phase={null}
        pct={null}
        elapsedSeconds={0}
        onCancel={noop}
      />,
    );
    expect(
      screen.getByText(/could not be rewritten for this job/i),
    ).toBeInTheDocument();
  });

  test('hides the notice when a tailored summary shipped', () => {
    render(
      <ResumePreviewFrame
        result={result({
          summary_write: {
            writer_revision: '2026-09-05.1',
            role_label: 'Software engineer',
            source: 'generated',
            attempts: 1,
            reasons: [],
          },
        })}
        baseResume={resume()}
        previousResume={null}
        regenView="tailored"
        onRegenViewChange={noop}
        versions={[]}
        onRestoreVersion={noop}
        onRevert={noop}
        phase={null}
        pct={null}
        elapsedSeconds={0}
        onCancel={noop}
      />,
    );
    expect(
      screen.queryByText(/could not be rewritten for this job/i),
    ).not.toBeInTheDocument();
  });
});
