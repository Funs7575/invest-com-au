/**
 * Advisor-portal dashboard load-state helpers (ADV-003).
 *
 * The portal fetches several endpoints in parallel. Previously a single broad
 * `catch { /* ignore *\/ }` swallowed every failure, leaving advisors staring at
 * a blank dashboard with no indication anything went wrong. These helpers make
 * the success/failure of each settled fetch explicit so the page can surface a
 * recoverable error banner.
 */

/**
 * Returns true when a settled `fetch` promise did NOT yield a usable (2xx)
 * response — i.e. the network call rejected, or the server returned a non-OK
 * status. Either case means we couldn't load that slice of the dashboard.
 */
export function isFetchFailure(
  result: PromiseSettledResult<Response>,
): boolean {
  if (result.status === "rejected") return true;
  return !result.value.ok;
}

/**
 * Aggregates several settled fetches into a single "did anything fail?" flag.
 * Used to decide whether to show the dashboard load-error banner.
 */
export function anyFetchFailed(
  results: ReadonlyArray<PromiseSettledResult<Response>>,
): boolean {
  return results.some(isFetchFailure);
}
