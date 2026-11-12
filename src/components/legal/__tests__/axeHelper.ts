/**
 * axe-core in jsdom, for the legal and privacy surfaces.
 *
 * `color-contrast` is disabled here because jsdom does no layout or painting,
 * so axe can only report it as "incomplete". Contrast is a token property,
 * measured on the design tokens themselves (see docs/design), not per page.
 * Every other WCAG A and AA rule axe ships runs.
 */
import axe from 'axe-core';

export async function axeViolations(node: Element): Promise<string[]> {
  const results = await axe.run(node, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.help} [${v.nodes.map((n) => n.target.join(' ')).join(' | ')}]`,
  );
}
