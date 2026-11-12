# 3D on the web: a Blender-render look, within a performance and accessibility budget

Date: 2026-11-11. Author: research track. Status: input for the redesign agent (landing, auth,
pricing and legal shells). Stack in this repo: `three` ^0.182.0, `@react-three/fiber` ^8.17.0,
`@react-three/drei` ^9.114.0 (`package.json`). Latest on npm today: three 0.187.0, fiber v8 line
8.18.0, drei v9 line 9.122.0 (the latest majors are fiber 9 / drei 10, which need React 19; this
repo is React 18, so stay on fiber 8 / drei 9).

Every claim cites the official doc it came from, or says it was measured here.

---

## 1. Recommendation in one screen

- **One hero object, not a 3D page.** A single, slowly turning product object (for example a
  resume sheet becoming a set of matched job cards) on a neutral studio floor, rendered with PBR
  materials, AgX tone mapping, light from Lightformers and one baked contact shadow.
- **The poster is the page; the canvas is an enhancement.** A static `<img>` poster rendered from
  the same scene (or from Blender) is the LCP element. The canvas loads after the page has loaded
  and the browser is idle, only if WebGL is available, the device is not low power, and the user
  has not asked for reduced motion. Otherwise the poster stays, and nothing is lost.
- **Zero runtime CDN fetches.** drei's `Environment preset` and `useGLTF`'s default Draco decoder
  both fetch from third-party CDNs; the site CSP (`connect-src 'self' ...` in `index.html`) blocks
  them in production. Build the environment from Lightformers (zero bytes) or self-host the HDR;
  compress models with meshopt (decoder ships inside three, no fetch).
- **Render on demand.** `frameloop="demand"` (or pause when offscreen or the tab is hidden), DPR
  clamped to `[1, 1.75]`, `PerformanceMonitor` drops to DPR 1 when frames fall behind.
- **Budget:** 3D JavaScript is a separate lazy chunk, at most **280 KB gzip** (measured floor for
  three r182 + fiber 8 + its reconciler is about 236 KB gzip, section 6.2); 3D assets at most
  **600 KB** total; LCP at most 2.5 s and CLS at most 0.1 at the 75th percentile (web.dev).
- **Accessibility:** the canvas is decorative (`aria-hidden` wrapper, never focusable), every
  message it shows also exists as DOM text, motion stops under `prefers-reduced-motion`, and a
  visible pause control exists if it moves for more than five seconds (WCAG 2.2 SC 2.2.2).

---

## 2. What is in the repo today

- `src/components/job-search/ScoutOrb.tsx` is the only R3F scene: a wireframe icosahedron with
  `meshStandardMaterial` in hard-coded violet hex (`#8b5cf6`, `#6366f1`, `#a78bfa`), point lights,
  `dpr={[1, 2]}`, `frameloop={reduce ? 'demand' : 'always'}`. It is lazy-loaded from
  `SavedJobsPanel.tsx`. Good pattern to keep: lazy import and the reduced-motion demand loop. To
  change for the redesign: colors from tokens, not hex; a DPR cap below 2; pause when offscreen.
- `src/types/three-shim.d.ts` declares `three` as `any` because `@types/three` is not a direct
  dependency. A 3D redesign should add `@types/three` (matching r182) as a devDependency so
  material props are type-checked (the build does not run `tsc`, so this is for editors).
- `index.html` CSP: `connect-src 'self' http://localhost:5000 https://*.browser-intake-datadoghq.com`.
  three's loaders use `fetch`, so any `.hdr`, `.glb`, Draco or Basis file must be same-origin
  (under `public/`).

---

## 3. The Blender-render look in real time

### 3.1 Color pipeline: match Blender's view transform

- Blender 4.0 release notes (https://developer.blender.org/docs/release_notes/4.0/color_management/):
  "The AgX view transform has been added, and replaces Filmic as the default in new files." Why:
  "This view transform provides better color handling in over-exposed areas compared to Filmic. In
  particular bright colors go towards white, similar to real cameras."
- three.js added `AgXToneMapping` in **r160** (release notes, 22 Dec 2023: "Add support for `AgX`
  Tone Mapping", #27366, #27403, #27409) and fixed its gamut mapping in **r161** (#27413). r162
  added Khronos PBR Neutral (`NeutralToneMapping`, #27668). All are in our r182.
- R3F's default is not AgX. The Canvas docs (https://r3f.docs.pmnd.rs/api/canvas): the default
  renderer sets "`outputColorSpace = THREE.SRGBColorSpace` and `toneMapping =
  THREE.ACESFilmicToneMapping`"; `flat` switches to `NoToneMapping`.
- So: set AgX explicitly and verify at runtime.

  ```tsx
  import * as THREE from 'three';
  <Canvas
    gl={{ antialias: true, alpha: true, powerPreference: 'default',
          toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1 }}
    dpr={[1, 1.75]}
    frameloop="demand"
  />
  ```

  Then confirm in the browser that `useThree((s) => s.gl.toneMapping) === THREE.AgXToneMapping`.
  If fiber re-applies its default on a Canvas re-render, set it in `onCreated` and again in a
  `useLayoutEffect` inside the scene. Brand colors used on 3D materials must be authored in linear
  space or converted (three's `ColorManagement` is on by default per the R3F docs); a token hex
  will look darker or lighter after tone mapping, so judge the 3D accent by eye against the DOM
  accent, and use `toneMapped={false}` only on flat UI elements drawn in the scene.

### 3.2 Materials

`MeshPhysicalMaterial` (https://threejs.org/docs/pages/MeshPhysicalMaterial.html) is "An extension
of the MeshStandardMaterial, providing more advanced physically-based rendering properties":

| Property | Docs | Use in our scene |
|---|---|---|
| `clearcoat`, `clearcoatRoughness` | "a clear, reflective layer on top of another layer"; 0 to 1 | Lacquered card edges, a glossy app icon |
| `transmission`, `thickness`, `ior` | "Physically-based transparency ... for thin, transparent surfaces like glass"; "When transmission is non-zero, `opacity` should be set to `1`"; ior "from `1.0` to `2.333`", default 1.5 | At most ONE glass element (cost below) |
| `sheen`, `sheenColor`, `sheenRoughness` | "representing cloth and fabric materials" | Soft paper or fabric feel for the resume sheet |
| `iridescence`, `anisotropy`, `dispersion` | soap film, brushed metal, chromatic dispersion (transmissive only) | Avoid; expensive and off-brand |

- Cost, from the same page: "`MeshPhysicalMaterial` has a higher performance cost, per pixel, than
  other three.js materials. Most effects are disabled by default, and add cost as they are enabled.
  For best results, always specify an environment map when using this material."
- Transmission costs a second pass. The vetted `threejs-performance` skill (section 8) notes that
  "while any MeshPhysicalMaterial with `transmission` above 0 is in view, every opaque object is
  drawn a second time into the transmission buffer." Hence the one-glass-element rule.
- Default everything else to `MeshStandardMaterial` (roughness 0.35 to 0.6, metalness 0 for paper
  and plastic). Share one material instance across meshes (R3F "Scaling performance": "Each
  geometry and material means additional overhead for the GPU").

Starting recipes (tune by eye under AgX):

```tsx
// paper sheet
<meshPhysicalMaterial color="#F4F4F7" roughness={0.55} sheen={0.4} sheenRoughness={0.8} sheenColor="#ffffff" />
// glossy accent card (accent color from the chosen token, converted by three's color management)
<meshPhysicalMaterial color={accentHex} roughness={0.25} clearcoat={1} clearcoatRoughness={0.08} />
// the one glass panel
<meshPhysicalMaterial color="#ffffff" roughness={0.08} transmission={1} thickness={0.4} ior={1.5} />
```

### 3.3 Lighting without runtime fetches

- **Verified: drei presets download from a CDN.** drei v9.122.0 source,
  `src/core/useEnvironment.tsx`: `const CUBEMAP_ROOT =
  'https://raw.githack.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/'`, and
  `if (preset) { ... files = presetsObj[preset]; path = CUBEMAP_ROOT }`. The drei docs
  (https://drei.docs.pmnd.rs/staging/environment) agree: "The `preset` property is not meant to be
  used in production environments and may fail as it relies on CDNs." Under our CSP the request is
  blocked and the scene renders black.
- **Option 1, preferred: Lightformers (zero bytes).** drei docs
  (https://drei.docs.pmnd.rs/staging/lightformer): "This component draws flat rectangles, circles or
  rings, mimicking the look of a light-former", "act like a real light without the expense, you can
  have as many as you want." Children of `<Environment>` are rendered into the environment cube map
  (the cube camera defaults `near=1, far=1000, resolution=256` per the Environment docs) and only
  re-render if you set `frames`.

  ```tsx
  <Environment resolution={256}>
    {/* key softbox above and in front */}
    <Lightformer form="rect" intensity={2} position={[0, 4, 3]} scale={[8, 2, 1]} target={[0, 0, 0]} />
    {/* two rim strips */}
    <Lightformer form="rect" intensity={1.2} position={[-5, 1, -2]} scale={[1, 6, 1]} target={[0, 0, 0]} />
    <Lightformer form="rect" intensity={1.2} position={[5, 1, -2]} scale={[1, 6, 1]} target={[0, 0, 0]} />
    {/* ring for a round specular highlight */}
    <Lightformer form="ring" intensity={0.8} position={[0, 2, -6]} scale={3} />
  </Environment>
  ```

  This is the classic Blender product-shot setup (key, two rims, a highlight ring) and gives the
  soft reflections PBR needs.
- **Option 2: a self-hosted HDR.** The drei `studio` preset is `studio_small_03_1k.hdr` (from
  `src/helpers/environment-assets.ts`), a Poly Haven asset. Poly Haven: "Our assets are all licensed
  as CC0", "You do not need to give credit", commercial use allowed. Download the 1k HDR once, put
  it in `public/env/`, and use `<Environment files="/env/studio_small_03_1k.hdr" />` (same origin,
  passes CSP). Expect a 1k `.hdr` to be on the order of 1 to 2 MB, which is why option 1 is
  preferred for the landing page.
- Never add realtime shadow-casting lights to the hero; see 3.4.

### 3.4 Shadows

- **ContactShadows** (https://drei.docs.pmnd.rs/staging/contact-shadows): "A contact shadow
  implementation, facing upwards (positive Y) by default." "Since this is a rather expensive effect
  you can limit the amount of frames it renders when your objects are static", for example
  `<ContactShadows frames={1} />`. Use `frames={1}` for a static floor shadow; if the object rotates
  in place, its contact shadow barely changes, so still bake it once.
- **AccumulativeShadows** (https://drei.docs.pmnd.rs/staging/accumulative-shadows): "A planar, Y-up
  oriented shadow-catcher that can accumulate into soft shadows" with "zero performance impact after
  all frames have accumulated"; with `RandomizedLight` it gives "realistic raycast-like shadows and
  ambient occlusion". `temporal` accumulates over time ("more performant"), `frames` defaults to 40.
  This is the closest thing to a Cycles render; use it when the object is static after its intro.
- Avoid realtime shadow maps: the `threejs-performance` skill notes `PCFSoftShadowMap` "is
  deprecated in r182 and falls back to PCF with a console warning", and each shadow-casting light
  redraws its casters every frame.

### 3.5 Post-processing (optional, measure first)

- pmndrs `postprocessing` (https://pmndrs.github.io/postprocessing/public/docs/): its `EffectPass`
  "automatically organizes and merges any given combination of effects", which "minimizes the amount
  of render operations"; full-screen work uses "a single triangle that fills the screen". It still
  adds full-screen fragment work per frame on top of the scene.
- The docs do not publish per-effect costs for Bloom, SMAA or depth of field, so none are claimed
  here. Defaults for our hero: **no post-processing**; antialiasing from the renderer's MSAA
  (`antialias: true`, the R3F default) at DPR up to 1.75. Add a subtle Bloom (high threshold,
  emissive-only) only if a measured trace shows headroom on a mid-range phone. Skip depth of field:
  it blurs the one thing we want read, and the Blender look comes from lighting and materials, not
  from DOF.
- No flashing glow: WCAG 2.3.1 defines the limit as "no more than three general flashes and / or no
  more than three red flashes within any one-second period" (from the 2.2.2 Understanding doc's
  definitions).

### 3.6 Assets: Blender to glTF to the page

1. Model in Blender, export glTF 2.0 (`.glb`), Y-up. Apply transforms, keep one material per
   distinct look, bake fine detail into normal maps instead of geometry.
2. Compress with glTF-Transform (https://gltf-transform.dev/cli). Commands listed in its docs:
   `meshopt` ("Compress geometry and animation with Meshopt"), `draco`, `webp` ("WebP texture
   compression"), `etc1s` and `uastc` (KTX + Basis), `resize`, `dedup`, `prune`, `simplify`, and
   `optimize` (example given: `gltf-transform optimize input.glb output.glb --compress draco
   --texture-compress webp`; run `optimize -h` for its switches).
   Recommended pipeline: `dedup`, `prune`, `resize` (textures to 1024 at most), `webp`, then
   `meshopt`. Run the CLI on a designer machine or in CI, pinned to a version, never from a skill.
3. **Prefer meshopt over Draco here.** three's `MeshoptDecoder`
   (`three/examples/jsm/libs/meshopt_decoder.module.js`, r182) embeds its WASM as a string and makes
   no network request (checked: no `fetch` or `XMLHttpRequest` in the file). drei's `useGLTF`
   defaults the Draco decoder to a CDN: drei v9.122.0 `src/core/Gltf.tsx` sets
   `decoderPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/'`. If Draco is ever used,
   copy the decoder from `three/examples/jsm/libs/draco/` into `public/draco/` and call
   `useGLTF(url, '/draco/')`; otherwise call `useGLTF(url, false)` so no decoder is configured.
   KTX2 has the same issue (its Basis transcoder is fetched from a path you set), so self-host it
   or use WebP.
4. Generate a typed component with gltfjsx (https://github.com/pmndrs/gltfjsx): `--types` adds
   TypeScript definitions; `--transform` "creates a binary-packed, draco-compressed, texture-resized
   (1024x1024), webp compressed, deduped, instanced and pruned *.glb" (Draco, so see step 3);
   `--instance` instances repeated geometry; the README says this "can reduce the size of an asset by
   70%-90%."
5. Bake the poster from the same camera: render a 2x poster in Blender (Cycles, AgX) or capture the
   first canvas frame, export AVIF and WebP, and size it to the exact aspect ratio of the canvas
   box.

---

## 4. The Blender editor visual language, and what to borrow

From the Blender manual (source files at projects.blender.org/blender/blender-manual, current
`main`, which documents Blender 5.3) and the default theme source
(`release/datafiles/userdef/userdef_default_theme.c` in the Blender repo):

- **Window system:** "Blender's interface is separated into three main parts": the Topbar ("the
  main menu"), Areas ("the main workspace") and the Status Bar ("shortcut suggestions and relevant
  statistics"). Areas hold editors; editors have regions (header, toolbar, sidebar).
- **Properties editor:** "displays settings for the active scene, object, material, and other data
  types"; "Properties are grouped into tabs, shown as a vertical list of icons in the Navigation
  Bar".
- **Navigation gizmo:** "found in the top right of the editor"; "The Orbit gizmo at the top shows the
  current orientation of the view. Dragging it ... will orbit the view. Clicking any of the axis
  labels will align the view to that axis"; four buttons below it zoom, pan, toggle the camera view
  and toggle perspective.
- **Viewport overlays:** Grid ("Show grid in orthographic side view"), Floor ("Show the ground plane
  in perspective view"), Axes ("Show the X, Y and/or Z axis lines"), Scale, Subdivisions.
- **Node editor:** "All nodes in Blender are based on a similar construction": a title (with a
  collapse toggle), sockets "displayed as small colored shapes along its left and right edges", and
  "Each socket has a shape and color that indicate the type of data it handles", for example Shader
  (bright green), Color (yellow), Float (light gray), Vector (dark blue), Integer (lime green),
  String (light blue), Geometry (sea green). Links connect an output socket to a compatible input.
- **Default theme colors (hex from the theme source):** panel and viewport background `#3d3d3d`
  with a gradient to `#303030`; headers `#303030`; widget fill `#545454`; dark fields `#1d1d1d` and
  `#181818`; text `#e6e6e6`, dim text `#989898`; selection blue `#4772b3`; grid `#545454` at 50%
  alpha; node editor background `#1a1a1a`; axis colors X `#ff3352`, Y `#8bdc00`, Z `#2890ff`;
  selected object `#ed5700`, active object `#ffa028`.
- Measured contrast of those pairs (same math as the type and color doc): text on panel 8.70:1,
  text on widget 6.07:1, dim text on dark field 5.84:1, white on selection blue 4.85:1, X axis on the
  viewport 3.02:1, grid line on the viewport 1.43:1 (decorative).

What translates well to a marketing site:

| Blender element | How to use it on Aspirely | Notes |
|---|---|---|
| Dark gray editor chrome around the viewport | The "product window" that frames the 3D hero on the dark landing theme, and the static app screenshots | Use our dark neutral tokens (`--surface`, `--surface-muted`), not Blender's `#3d3d3d` |
| Viewport floor grid with fading lines | A subtle floor under the 3D object (drawn in the scene, decorative) | Keep the grid well below 3:1; it is decoration, and it must never carry meaning |
| Navigation gizmo | A small decorative orientation cue in the hero corner, `aria-hidden`; or, if the hero is interactive, real labeled buttons ("Front", "Top", "Reset view") | No drag-only controls: WCAG 2.5.7 Dragging Movements (AA), "All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging" |
| Properties panel (label on the left, value on the right, grouped sections) | The feature explainer: "Tailor settings", "Match filters" shown as a properties panel in DOM | Real text, 16px, AA; works without the canvas |
| Node wires and sockets | Explaining the pipeline: Resume to Skills to Matches to Tailored resume to Application, as an inline SVG node graph | SVG, not WebGL: cheap, crisp, accessible with a text list beside or behind it |
| Socket color coding | Avoid as a palette | It is a many-hue categorical scheme and would break the one-accent rule; use the accent for the active path only |
| Status bar with shortcut hints | Optional footer strip on the product window | Not needed for marketing |

What does not translate: dense icon toolbars, 11px UI text, shortcut-only interactions, orange
selection as a second accent (it would compete with the CTA), and Blender's low-contrast gray on
gray for anything a visitor must read.

---

## 5. Loading, pausing and fallbacks

### 5.1 Keep LCP on the poster

- web.dev (https://web.dev/articles/lcp) lists the element types considered for LCP: `<img>`,
  `<image>` inside SVG, `<video>` (poster or first frame), elements with a `url()` background image,
  and block-level text. `<canvas>` is not in the list, so the 3D canvas cannot be the LCP element;
  the H1 text or the poster image is.
- Poster: `<img src="/media/hero-poster.avif" width="1600" height="1000" fetchpriority="high"
  decoding="async" alt="">` inside `<picture>` with WebP fallback, at most 120 KB. Empty `alt`
  because the hero copy beside it carries the message; if the poster shows product UI that matters,
  give it a real alt and the same information in text.
- Fonts are already self-hosted and preloaded (`index.html`, `src/fonts.css`), which protects text
  LCP.

### 5.2 No layout shift

- web.dev CLS guide (https://web.dev/articles/optimize-cls): reserve space with "`min-height`" or
  "the `aspect-ratio` CSS property", and "Always include `width` and `height` size attributes on your
  images". Also: "Composited animations using `translate` can't impact other elements, and so don't
  count toward CLS."
- The poster and the canvas share one box with a fixed `aspect-ratio`; the canvas is absolutely
  positioned over the poster and fades in with `opacity` only after its first frame. Nothing around
  the box moves.

### 5.3 When to load the canvas

Load the 3D chunk only if all of these are true:

1. `window` has fired `load`, then `requestIdleCallback` (with a `setTimeout` fallback) has run.
2. The hero box is in the viewport (`IntersectionObserver`).
3. `matchMedia('(prefers-reduced-motion: reduce)').matches` is false. MDN
   (https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion): the setting
   means the user "prefers an interface that removes, reduces, or replaces motion-based animations."
4. A WebGL context can be created without a major performance caveat. MDN
   (https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext):
   `failIfMajorPerformanceCaveat` "indicates if a context will be created if the system performance
   is low or if no hardware GPU is available." Probe once with
   `canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })`; `null` means keep the
   poster. (MDN documents `null` for an unsupported context type; treat any falsy result or thrown
   error as "no".)
5. Optional low-power hints (Chromium-only, so they can only remove 3D, never require it):
   `navigator.connection?.saveData`, `navigator.deviceMemory <= 4`,
   `navigator.hardwareConcurrency <= 4`. These were not verified against MDN in this session; treat
   them as heuristics.

R3F's own escape hatch: the Canvas `fallback` prop takes "optional DOM JSX elements or regular
components in case GL is not supported"; pass the poster so even a late WebGL failure shows it.

### 5.4 While it runs

- **On-demand rendering** (R3F "Scaling performance", https://r3f.docs.pmnd.rs/advanced/scaling-performance):
  `frameloop="demand"` renders only when props change, and for imperative changes "Calling
  `invalidate()` will not render immediately, it merely requests a new frame". The default is a game
  loop that "executes 60 times a second". For a slow idle rotation, either keep `demand` and call
  `invalidate()` from a throttled animation, or switch `frameloop` between `'always'` and `'never'`
  from the `IntersectionObserver` and `document.visibilityState`.
- **DPR clamp:** R3F's default is `dpr={[1, 2]}`; use `[1, 1.75]`. Fill cost grows with the square
  of the ratio (the `threejs-performance` skill: "a 3x display shades 9x the pixels of 1x").
- **Adaptive quality:** drei `PerformanceMonitor` (https://drei.docs.pmnd.rs/performances/performance-monitor)
  "will collect the average fps (frames per second) over time"; defaults `ms 250`, `iterations 10`,
  `threshold 0.75`, bounds `[50, 60]` (or `[50, 90]` above 90 Hz), `flipflops Infinity`. Wire
  `onDecline={() => setDpr(1)}`, `onIncline={() => setDpr([1, 1.75])}`, `flipflops={3}`,
  `onFallback={() => setDpr(1)}` through React state (the R3F skill warns not to combine this with
  `AdaptiveDpr`).
- **Power:** MDN `powerPreference`: `"low-power"` "Prioritizes power saving over rendering
  performance". R3F defaults to `"high-performance"`. A decorative hero should pass `"default"` or
  `"low-power"`.
- **Shader stalls:** compile before the first visible frame (`renderer.compileAsync` or drei
  `<Preload all />` inside the Suspense boundary) so the fade-in does not hitch, and keep INP at or
  below 200 ms (web.dev Core Web Vitals) by not doing 3D setup inside an input handler.

### 5.5 Reduced motion

Under `prefers-reduced-motion: reduce`: do not load the canvas at all on the landing page; the
poster is the experience. If a 3D view is ever essential (it should not be), render one static frame
(`frameloop="demand"`, no auto-rotate, no scroll-linked camera, no parallax), which is what
`ScoutOrb.tsx` already does. MDN notes that "scaling or panning large objects can be vestibular
motion triggers".

---

## 6. Budgets

### 6.1 Targets

| Budget | Target | Source or reason |
|---|---|---|
| LCP | at most 2.5 s, p75, mobile and desktop | web.dev Core Web Vitals: "LCP should occur within 2.5 seconds"; "the 75th percentile of page loads, segmented across mobile and desktop" |
| CLS | at most 0.1 | web.dev: "pages should maintain a CLS of 0.1. or less" |
| INP | at most 200 ms | web.dev: "pages should have a INP of 200 milliseconds or less" |
| 3D JS (lazy chunk, gzip) | at most 280 KB; nothing 3D in the landing's initial chunk | measured floor in 6.2 |
| Poster image | at most 120 KB (AVIF), exact aspect ratio | LCP element |
| glTF (meshopt + WebP) | at most 300 KB | gltfjsx: transform "can reduce the size of an asset by 70%-90%" |
| Textures | at most 1024 px, at most 4 maps | GPU memory: the performance skill computes a 2048 color map at "about 22 MB of VRAM" |
| Environment | 0 KB (Lightformers) or one self-hosted 1k HDR | section 3.3 |
| Total 3D bytes (JS + assets) | at most 600 KB after the page has loaded | keeps mobile data cost reasonable |
| Draw calls | at most 50 | R3F: "no more than 1000 as the very maximum"; a hero needs far fewer |
| Triangles | at most 100k | mid-range phone headroom |
| Frame time | 16.7 ms at 60 Hz on a mid-range phone with 4x CPU throttling in DevTools | smooth idle rotation |
| Transmissive materials | at most 1 | transmission redraws opaque objects |
| Realtime shadow maps | 0 | baked contact or accumulative shadows only |

### 6.2 Measured floor for the JS budget

Measured today with `gzip -9` on the published builds:

| Package | Raw | gzip |
|---|---|---|
| three 0.182.0 `build/three.core.min.js` | 380,922 B | 100,406 B |
| three 0.182.0 `build/three.module.min.js` (imports the core) | 355,116 B | 84,199 B |
| @react-three/fiber 8.18.0 `dist/events-776716bd.esm.js` (the main code) | 86,489 B | 23,301 B |
| react-reconciler 0.27.0 production build (fiber 8 dependency) | 92,683 B | 28,309 B |
| **Sum** | **915,210 B** | **236,215 B** |

Why the whole of three: fiber 8's Canvas does `React.useMemo(() => extend(THREE), [])` with the
source comment "This will include the entire THREE namespace by default" (verified in
`react-three-fiber.esm.js`), so tree-shaking cannot drop unused three classes. drei helpers,
zustand and the scene code come on top, hence the 280 KB ceiling. If the budget binds, the
alternative is a vanilla three hero with named imports (no fiber), which tree-shakes; measure both
with `vite build` and a bundle visualiser before deciding.

---

## 7. Accessibility of the canvas

- MDN (https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_usage): the
  `<canvas>` element "must be made accessible by providing fallback text"; a canvas with no
  fallback should be `role="presentation"` "only if the canvas is purely presentational."
- Our hero is decorative: wrap it in a `div` with `aria-hidden="true"`, give the canvas
  `role="presentation"` and `tabIndex={-1}`, and put the real message (H1, sub-copy, CTA) in DOM
  text next to it. Nothing a visitor needs (prices, plan limits, the CTA, legal text) may exist only
  inside the 3D scene.
- If the scene is interactive (orbit or camera presets), the controls are real `<button>` elements
  with labels, keyboard operable, at least 24 by 24 CSS px; never drag-only; disable wheel zoom
  (`OrbitControls enableZoom={false}`) so the page scroll is never hijacked.
- WCAG 2.2.2 (Level A): moving content that starts automatically, "lasts more than five seconds",
  and runs "in parallel with other content" needs "a mechanism for the user to pause, stop, or hide
  it". An idle rotation qualifies, so add a visible Pause button over the hero (or stop the motion
  after five seconds).
- Do not draw UI text inside the canvas (drei `Text` and `Html` are fine for decoration only); it is
  invisible to screen readers and to translation.

---

## 8. Skills to use while building

Installed and vetted today (see `2026-11-11-skills-installed.md`): `threejs-react-three-fiber`,
`threejs-materials`, `threejs-performance` (CloudAI-X/threejs-skills) and `web-interface-guidelines`
(Vercel). The three.js skills target three r186 and fiber 9 / drei 10; check each API exists in r182
and fiber 8 before using it. They also show `Environment preset` and default `useGLTF` Draco in
examples: in this repo those violate the CSP rule in section 3.3.

---

## 9. Implementation sketch

```tsx
// src/components/landing/Hero3D.tsx (sketch; the redesign agent owns the real file)
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const HeroScene = lazy(() => import('./HeroScene')); // the only module that imports three / fiber / drei

function canUse3D(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return false;
  if ((nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4) return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    return !!gl;
  } catch {
    return false;
  }
}

export function Hero3D() {
  const box = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canUse3D() || !box.current) return;
    let cancelled = false;
    const start = () => {
      const idle = (cb: () => void) =>
        'requestIdleCallback' in window ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 200);
      idle(() => !cancelled && setMount(true));
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start, { once: true });
      }
    });
    io.observe(box.current);
    return () => { cancelled = true; io.disconnect(); };
  }, []);

  return (
    <div ref={box} className="relative aspect-[16/10] w-full" aria-hidden="true">
      <picture>
        <source srcSet="/media/hero-poster.avif" type="image/avif" />
        {/* lowercase passes straight to the DOM; check whether React 18.3 knows camelCase fetchPriority before switching */}
        <img src="/media/hero-poster.webp" width={1600} height={1000}
             {...({ fetchpriority: 'high' } as Record<string, string>)}
             decoding="async" alt="" className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      {mount && (
        <Suspense fallback={null}>
          <div className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
            <HeroScene onFirstFrame={() => setReady(true)} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
```

`HeroScene` holds the `<Canvas>` with the props from 3.1, `frameloop` switched off when the box
leaves the viewport or the tab is hidden, `PerformanceMonitor` per 5.4, the Lightformer environment
per 3.3, `ContactShadows frames={1}`, the meshopt `.glb` loaded with `useGLTF(url, false)`, and a
first-frame callback (for example a one-shot `useFrame` that calls `onFirstFrame` after the first
render). The visible Pause control (section 7) lives in the DOM next to the hero, outside the
`aria-hidden` wrapper.

---

## 10. Verification checklist

1. Production build, DevTools console on `/`: no CSP violations, no requests to `raw.githack.com`,
   `gstatic.com` or any non-origin host from the 3D code.
2. Lighthouse mobile: LCP element is the H1 or the poster, LCP at most 2.5 s, CLS at most 0.1,
   accessibility 100.
3. Performance trace with 4x CPU throttling: no long task over 50 ms from 3D init; steady frames
   while visible; zero frames while scrolled away or in a background tab.
4. `renderer.info.render.calls` and `.triangles` within budget (log once in development).
5. Rendering tab, emulate `prefers-reduced-motion: reduce`: no canvas requested, poster shown.
6. Disable WebGL (Chrome flag or a browser without it): poster shown, no console errors.
7. Bundle visualiser: three, fiber and drei appear only in the lazy chunk, at most 280 KB gzip.
8. Keyboard: Tab never lands inside the hero except on its labeled controls; the Pause button works.
