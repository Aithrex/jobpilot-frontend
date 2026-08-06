/**
 * Generates the landing hero's POSTER, in Black Cherry.
 *
 *   public/media/aspirely-hero-poster.webp
 *
 * Run: node scripts/generate-aspirely-hero-loop.mjs
 *
 * WHAT THIS DOES AND DOES NOT PRODUCE
 * -----------------------------------
 * It produces the poster ONLY. The moving hero background is a 3D film
 * generated externally in Gemini and dropped into `public/media/` as
 * `aspirely-hero-loop.webm` + `.mp4`; this script deliberately does not
 * synthesise a stand-in for it, because a hand-drawn canvas loop pretending to
 * be that film is exactly the substitution the brief rules out.
 *
 * It DOES still produce the poster, because the poster is not optional: it is
 * the `poster` attribute (so the first paint is never an empty rectangle), the
 * `prefers-reduced-motion` fallback, and the state the page sits in until the
 * Gemini assets land. It has to be on-palette, and no external tool is going
 * to hand us one that matches `src/index.css` to the token.
 *
 * The earlier revision of this file also encoded a 12s webm via canvas
 * `captureStream()` into a `MediaRecorder` (there is no ffmpeg in this
 * toolchain). That path was removed with the interim asset. If you ever need
 * it back, it is in the git history for this file.
 *
 * THE COMPOSITION RULES, which are the whole point of this file:
 *
 *  1 IT IS DRAWN AS A FRAME OF A LOOP, not as a still. Everything is a function
 *    of `t` in [0,1), and the poster is rendered at t = 0.5 - mid-settle, so
 *    the opportunity cards read as ordered rather than scattered. A poster
 *    showing the scattered state would advertise the problem, not the product.
 *
 *  2 QUIET AT CENTRE-LEFT. The headline and both CTAs live in the left ~55% of
 *    the hero. Everything with movement or contrast is placed beyond
 *    `QUIET_EDGE`, and the left third gets an explicit canvas-coloured wash on
 *    top. If you add an element, put it right of QUIET_EDGE or it will fight
 *    the headline.
 *
 *  3 BRIGHT. The base is the light-theme canvas, not a dark stage. It sits
 *    under a hero overlay that already tints it, so anything dim here
 *    compounds into mud.
 *
 *  4 NO TEXT, no logos, no faces, no particles. The shapes read as opportunity
 *    cards, resume blocks, a career path and its milestones - abstractly. They
 *    are deliberately not legible as real content, because a hero background
 *    that appears to show real jobs is making a claim.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const outputPoster = resolve('public/media/aspirely-hero-poster.webp');

await mkdir(dirname(outputPoster), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const asset = await page.evaluate(async () => {
  const width = 1920;
  const height = 1080;

  /* ── Black Cherry on the LUMEN canvas ─────────────────────────────────
     Mirrors `.surface-lumen` in src/index.css, which is the surface the
     public landing paints in - not `:root`. The two differ only in their
     NEUTRAL ramp (the app canvas carries a cherry undertone for long reading
     sessions; the public canvas is a cool fog), and the poster sits under a
     wash drawn from `--background`, so a poster mixed on the app canvas
     leaves a faint warm patch in the middle of a cool page. The accent, sage
     and amber are shared and unchanged.

     If the palette moves, these move with it - and RE-RUN THIS SCRIPT. The
     media does not inherit tokens, so it is the one thing in the system that
     goes stale silently. */
  const CANVAS = '#F7F7FA'; // --background on .surface-lumen
  const CARD = '#FCFCFE'; // --card on .surface-lumen
  const INK = '36, 33, 38'; // --foreground on .surface-lumen
  const CHERRY = '168, 66, 91'; // --primary
  const AMBER = '154, 101, 29'; // --warning
  const SAGE = '62, 123, 105'; // --success

  /** Nothing with movement or contrast belongs left of this. */
  const QUIET_EDGE = 660;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable');
  // The composition below is authored on a 1280x720 grid; render it at 1080p
  // so the poster is sharp on a retina hero without re-tuning every coordinate.
  ctx.scale(width / 1280, height / 720);

  const twoPi = Math.PI * 2;
  const rgba = (c, a) => `rgba(${c}, ${a})`;
  /** Ease that starts and ends at 0 - safe to use anywhere in a loop. */
  const breathe = (t, phase = 0) => Math.sin(t * twoPi + phase);

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  /**
   * An opportunity card. `settle` in [0,1] moves it from scattered to ordered
   * and back over the loop, which is the "job search becoming organized" beat.
   */
  function drawCard(x, y, w, h, t, phase, scatter) {
    const settle = (1 - Math.cos(t * twoPi + phase)) / 2; // 0 -> 1 -> 0
    const dx = scatter.x * (1 - settle);
    const dy = scatter.y * (1 - settle) + breathe(t, phase) * 3;
    const rot = scatter.r * (1 - settle);

    ctx.save();
    ctx.translate(x + w / 2 + dx, y + h / 2 + dy);
    ctx.rotate(rot);
    ctx.translate(-w / 2, -h / 2);

    ctx.fillStyle = 'rgba(255, 252, 253, 0.82)';
    ctx.strokeStyle = rgba(CHERRY, 0.16);
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(43, 32, 36, 0.10)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 9;
    roundedRect(0, 0, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    // Resume-like information blocks. Abstract: bars, never glyphs.
    ctx.fillStyle = rgba(CHERRY, 0.62);
    roundedRect(18, 18, 46, 8, 4);
    ctx.fill();
    ctx.fillStyle = rgba(INK, 0.34);
    roundedRect(18, 42, w * 0.62, 6, 3);
    ctx.fill();
    roundedRect(18, 58, w * 0.78, 6, 3);
    ctx.fill();
    roundedRect(18, 74, w * 0.44, 6, 3);
    ctx.fill();

    // A confirmation chip that fills in as the card settles - sage only ever
    // means "verified", so it arrives with the order, not before it.
    ctx.fillStyle = rgba(SAGE, 0.28 + settle * 0.5);
    roundedRect(18, h - 28, 34 + settle * 22, 9, 5);
    ctx.fill();
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(0, 0, 1280, 720);
    ctx.fillStyle = CANVAS;
    ctx.fillRect(0, 0, 1280, 720);

    // Two slow blooms, both anchored right of the quiet edge.
    const bloomA = ctx.createRadialGradient(
      1060, 180 + breathe(t) * 22, 10, 1060, 180, 520,
    );
    bloomA.addColorStop(0, rgba(CHERRY, 0.2));
    bloomA.addColorStop(0.45, rgba(AMBER, 0.09));
    bloomA.addColorStop(1, 'rgba(251, 246, 247, 0)');
    ctx.fillStyle = bloomA;
    ctx.fillRect(0, 0, 1280, 720);

    const bloomB = ctx.createRadialGradient(
      940, 620 + breathe(t, Math.PI) * 18, 8, 940, 620, 440,
    );
    bloomB.addColorStop(0, rgba(AMBER, 0.12));
    bloomB.addColorStop(0.55, rgba(CHERRY, 0.07));
    bloomB.addColorStop(1, 'rgba(251, 246, 247, 0)');
    ctx.fillStyle = bloomB;
    ctx.fillRect(0, 0, 1280, 720);

    // Ledger rule lines - the "operating system" texture. Right side only.
    ctx.strokeStyle = rgba(CHERRY, 0.05);
    ctx.lineWidth = 1;
    for (let x = QUIET_EDGE; x < 1280; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
    for (let y = 40; y < 720; y += 72) {
      ctx.beginPath();
      ctx.moveTo(QUIET_EDGE - 40, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }

    // The career path. Drawn as a dash that travels the whole curve and
    // returns, so the loop closes.
    const path = new Path2D();
    path.moveTo(620, 600);
    path.bezierCurveTo(780, 566, 770, 404, 900, 436);
    path.bezierCurveTo(1030, 468, 1046, 214, 1210, 232);
    ctx.save();
    ctx.strokeStyle = rgba(CHERRY, 0.26);
    ctx.lineWidth = 2;
    ctx.stroke(path);
    ctx.strokeStyle = rgba(CHERRY, 0.75);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.setLineDash([150, 1400]);
    ctx.lineDashOffset = -t * 1550;
    ctx.stroke(path);
    ctx.restore();

    // Milestones. Brass is the emphasis, and it lands last.
    const nodes = [
      [900, 436, 0.0, CHERRY],
      [1046, 330, 2.1, SAGE],
      [1210, 232, 4.2, AMBER],
    ];
    nodes.forEach(([x, y, phase, color], i) => {
      const pulse = (1 - Math.cos(t * twoPi + phase)) / 2;
      const r = 8 + pulse * 3;
      ctx.fillStyle = rgba(color, 0.14 * pulse);
      ctx.beginPath();
      ctx.arc(x, y, r + 16 * pulse, 0, twoPi);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 252, 253, 0.94)';
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, twoPi);
      ctx.fill();
      ctx.fillStyle = rgba(color, 0.55 + pulse * 0.4);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, twoPi);
      ctx.fill();
      void i;
    });

    drawCard(792, 96, 240, 138, t, 0.3, { x: -34, y: -22, r: -0.05 });
    drawCard(1024, 268, 206, 124, t, 1.9, { x: 30, y: 18, r: 0.06 });
    drawCard(760, 432, 268, 142, t, 3.5, { x: -22, y: 30, r: 0.04 });

    // THE QUIET WASH. Everything above is allowed to be busy; this guarantees
    // the headline column stays calm regardless.
    const quiet = ctx.createLinearGradient(0, 0, 1280, 0);
    quiet.addColorStop(0, 'rgba(251, 246, 247, 1)');
    quiet.addColorStop(0.34, 'rgba(251, 246, 247, 0.94)');
    quiet.addColorStop(0.58, 'rgba(251, 246, 247, 0.42)');
    quiet.addColorStop(1, 'rgba(251, 246, 247, 0)');
    ctx.fillStyle = quiet;
    ctx.fillRect(0, 0, 1280, 720);

    // A whisper of the card colour along the very top, so the fixed header
    // never sits on a hard edge.
    const topFade = ctx.createLinearGradient(0, 0, 0, 120);
    topFade.addColorStop(0, 'rgba(255, 252, 253, 0.5)');
    topFade.addColorStop(1, 'rgba(255, 252, 253, 0)');
    ctx.fillStyle = topFade;
    ctx.fillRect(0, 0, 1280, 120);
    void CARD;
  }

  // Mid-settle: cards ordered, path partway along, milestones lit.
  draw(0.5);
  const poster = canvas.toDataURL('image/webp', 0.92).split(',')[1];
  return { poster };
});

await writeFile(outputPoster, Buffer.from(asset.poster, 'base64'));
await browser.close();

console.log(`Created ${outputPoster}`);
console.log('Motion asset: drop the Gemini 3D film in as');
console.log('  public/media/aspirely-hero-loop.webm  (preferred)');
console.log('  public/media/aspirely-hero-loop.mp4   (fallback)');
