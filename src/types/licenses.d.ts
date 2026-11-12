/**
 * Shape of src/components/legal/third-party-licenses.json, written by
 * scripts/generate-licenses.mjs. Declared ambiently so the import type-checks
 * without turning on `resolveJsonModule` for the whole app.
 */
declare module '*/third-party-licenses.json' {
  interface FontNotice {
    name: string;
    copyright: string;
    url: string;
    license: string;
    files: string[];
    text: string;
  }

  interface PackageNotice {
    name: string;
    version: string;
    license: string;
    repository: string | null;
    author: string | null;
    /** Indexes into `texts`. Empty when the package ships no license file. */
    textRefs: number[];
  }

  const notices: {
    note: string;
    fonts: FontNotice[];
    packages: PackageNotice[];
    texts: string[];
  };
  export default notices;
}
