/**
 * Ambient shim for the `three` package. three@0.182 ships no bundled types,
 * and `@types/three` is not a direct dependency of this repo — it exists only
 * as a transitive dep of drei inside the pnpm virtual store, where the
 * compiler cannot resolve it. This shorthand declaration keeps
 * `import * as THREE from 'three'` free of TS7016; the module is typed as
 * `any`, so hero3d code pairs it with narrow structural interfaces for the
 * few objects it actually mutates.
 *
 * Follow-up: add `@types/three` as a devDependency and delete this file.
 */
declare module 'three';
