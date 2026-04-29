export type EventName =
  | 'quiz_started'
  | 'quiz_completed'
  | 'advisor_viewed'
  | 'advisor_contacted'
  | 'lead_submitted'
  | 'advisor_selected'
  | 'checkout_started'
  | 'subscription_active'
  | 'advisor_apply_submitted'
  | 'lead_responded_to'
  | 'dispute_opened'

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
    advisor_match_count: number
    quiz_completed: boolean
    utm_source: string | null
    utm_campaign: string | null
  }
  advisor_selected: {
    advisor_id: number
    advisor_name: string
    selection_source: 'quiz_results' | 'search' | 'shortlist' | 'profile_page' | 'recommendation'
    rank_position: number | null
  }
  checkout_started: {
    product_type: 'advisor_subscription' | 'advisor_credits' | 'listing' | 'sponsored_booking' | 'course'
    plan_id: string | null
    amount_cents: number | null
    source: string
  }
  subscription_active: {
    plan_id: string
    plan_name: string
    amount_cents: number
    interval: 'month' | 'year'
    advisor_id: number | null
  }
  advisor_apply_submitted: {
    application_type: 'new' | 'resubmit'
    firm: string | null
    city: string | null
    specialisations: string[]
  }
  lead_responded_to: {
    lead_id: string
    response_time_hours: number | null
    advisor_id: number
    outcome: 'accepted' | 'declined' | 'no_outcome_set'
  }
  dispute_opened: {
    dispute_type: 'review' | 'lead' | 'billing' | 'other'
    subject_id: string
    reason: string | null
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
