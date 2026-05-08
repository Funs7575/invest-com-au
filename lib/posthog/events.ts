export type EventName =
  | 'quiz_started'
  | 'quiz_completed'
  | 'advisor_viewed'
  | 'advisor_contacted'
  | 'lead_submitted'
  | 'advisor_response'
  | 'lead_outcome'

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
