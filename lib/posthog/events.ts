export type EventName =
  | 'quiz_started'
  | 'quiz_completed'
  | 'funnel_started'
  | 'funnel_step_answered'
  | 'funnel_step_back'
  | 'funnel_resolved'
  | 'advisor_viewed'
  | 'advisor_contacted'
  | 'lead_submitted'
  | 'advisor_response'
  | 'lead_outcome'
  | 'ai_referral'
  | 'community_thread_submitted'
  | 'community_post_submitted'

/** Which matching funnel a funnel_* event came from. */
export type FunnelName = 'get_matched' | 'quiz' | 'find_advisor'

export interface EventProps {
  quiz_started: {
    quiz_type: 'advisor_match' | 'diy_broker'
    source_page: string
  }
  quiz_completed: {
    quiz_type: 'advisor_match' | 'diy_broker'
    time_taken_seconds: number
    selected_advisor_type: string | null
    budget_range: string | null
    risk_profile: string | null
    top_match_slug: string | null
    match_count: number
    /**
     * Country Mode dimension — quiz answer key for investor_country
     * (e.g. "hong_kong", "uk", "saudi_arabia") or null when the user
     * stayed on the domestic / Australian-resident track. Set by both
     * the URL-prefill path (/quiz?country=) and by users who manually
     * pick a country at Q1. Lets analytics break quiz_completed by
     * inbound corridor without a separate event name.
     */
    country: string | null
  }
  /**
   * Mid-funnel events (§5.8): until these, only started/completed reached
   * PostHog, so per-step drop-off analysis on the matching funnels could not
   * run at all. Answer values are option keys / slugs (never free text or
   * contact details) and are truncated by the callers.
   */
  funnel_started: {
    funnel: FunnelName
    source_page: string
    mode: string | null
    prefilled: boolean
    resumed: boolean
  }
  funnel_step_answered: {
    funnel: FunnelName
    step_slug: string
    step_index: number
    total_steps: number
    answer: string
  }
  funnel_step_back: {
    funnel: FunnelName
    step_slug: string
    step_index: number
  }
  funnel_resolved: {
    funnel: FunnelName
    /** Result route/outcome kind (e.g. the get-matched ResultTemplate.route). */
    outcome: string
    advisor_type: string | null
    match_count: number
    step_count: number
    time_taken_seconds: number
  }
  advisor_viewed: {
    advisor_id: number
    advisor_name: string
    advisor_type: string
    firm: string | null
    city: string | null
  }
  advisor_contacted: {
    advisor_id: number
    contact_method: 'enquiry_form' | 'booking_link' | 'email' | 'phone'
    source_section: string
  }
  lead_submitted: {
    lead_source: string
    source_page: string | null
    advisor_match_count: number
    quiz_completed: boolean
    utm_source: string | null
    utm_campaign: string | null
  }
  advisor_response: {
    lead_id: number
    advisor_id: number
    response_time_minutes: number
    lead_source: string | null
  }
  lead_outcome: {
    lead_id: number
    advisor_id: number
    outcome: 'converted' | 'lost' | 'no_response'
    lead_source: string | null
  }
  /** A visit that arrived from a generative-AI assistant / answer engine. */
  ai_referral: {
    source: string
    label: string
    vendor: string
    kind: 'assistant' | 'answer_engine'
    landing_path: string
  }
  /** Forum thread submission, captured server-side with the publish-gate outcome. */
  community_thread_submitted: {
    category_slug: string
    thread_type: string
    gate_action: 'publish' | 'hold' | 'reject'
    risk_score: number
    gate_reasons: string
  }
  /** Forum reply submission, captured server-side with the publish-gate outcome. */
  community_post_submitted: {
    thread_id: number
    gate_action: 'publish' | 'hold' | 'reject'
    risk_score: number
    gate_reasons: string
    is_nested_reply: boolean
  }
}

export function trackEvent<T extends EventName>(name: T, props: EventProps[T]): void {
  if (typeof window === 'undefined') return
  const ph = (window as unknown as { posthog?: { capture: (n: string, p: unknown) => void } }).posthog
  if (ph) ph.capture(name, props)
}

export function getDistinctId(): string | null {
  if (typeof window === 'undefined') return null
  const ph = (window as unknown as { posthog?: { get_distinct_id?: () => string } }).posthog
  return ph?.get_distinct_id?.() ?? null
}
