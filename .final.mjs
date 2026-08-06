import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
async function probe(label, opts) {
  const c = await b.newContext(opts);
  const p = await c.newPage();
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  const r = await p.evaluate(() => {
    const s = document.getElementById('how-it-works');
    const sticky = [...s.querySelectorAll('*')].filter(
      (e) => getComputedStyle(e).position === 'sticky').length;
    return {
      section: Math.round(s.getBoundingClientRect().height),
      page: Math.round(document.documentElement.scrollHeight),
      stickyEls: sticky,
      headings: s.querySelectorAll('h3').length,
      frames: [...s.querySelectorAll('*')].filter((e) =>
        /Your search profile|Prepared for you|Ready for your approval/.test(
          e.childNodes[0]?.textContent || '')).length,
      caption: /an example of the aspirely workflow/i.test(s.textContent),
    };
  });
  console.log(label.padEnd(34), JSON.stringify(r));
  await c.close();
}
await probe('desktop 1440 (cinematic)', { viewport: { width: 1440, height: 900 } });
await probe('mobile 390 (narrative)', { viewport: { width: 390, height: 844 } });
await probe('1440 + reduced motion', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await b.close();
