// Empty stand-in for React's `server-only` marker package during Vitest runs.
//
// `server-only`'s default export throws unconditionally (it exists only to make
// bundlers fail a Client Component import), and it is not linked into the app's
// node_modules. Next.js neutralizes it via the `react-server` export condition,
// which points at an empty module. Vitest has no such condition, so we alias the
// bare `server-only` specifier to this empty module instead. Test-environment
// only — production builds still import the real package.
export {};
