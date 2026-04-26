declare module '@sentry/nextjs';
declare module 'stripe';

// Used by scripts/collect-quality-metrics.ts. js-yaml ships untyped;
// CI installs it via `npm install --no-save tsx js-yaml ...`. We only
// touch yaml.load(), so an ambient declaration is sufficient — avoids
// adding @types/js-yaml to package.json for a single CI script.
declare module 'js-yaml' {
  export function load(input: string): unknown;
}
