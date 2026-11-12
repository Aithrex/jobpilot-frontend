import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to KNOW the project's custom font sizes (the `fontSize`
 * scale in tailwind.config.ts). Without this it reads `text-caption-sm` as a
 * text COLOUR, and when a real colour follows it - `cn('text-caption-sm',
 * 'text-muted-foreground')` - it drops the size as a "duplicate", so the text
 * silently falls back to the inherited 16px. That is how chips, labels and
 * badges across the app rendered a size larger than intended. Keep this list
 * in sync with `theme.extend.fontSize`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-lg',
            'display-sm',
            'headline-lg',
            'headline-md',
            'headline-sm',
            'title-lg',
            'title-md',
            'title-sm',
            'body-lg',
            'body-md',
            'body-sm',
            'label',
            'label-lg',
            'label-md',
            'caption-sm',
            'display',
            'title',
            'h1',
            'h2',
            'h3',
            'body',
            'caption',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
