# R2 Audit — Form validation UX

## Forms reviewed

| Form | File |
|------|------|
| Auth login (magic-link + password) | `app/auth/login/LoginClient.tsx` |
| Auth signup (password + magic-link) | `app/auth/signup/SignupClient.tsx` |
| Password reset | `app/auth/reset-password/ResetPasswordClient.tsx` |
| Advisor review | `components/AdvisorReviewForm.tsx` |
| Fund review | `components/FundReviewForm.tsx` |
| Business-finance enquiry | `app/business-finance/BusinessFinanceEnquiryForm.tsx` |
| Startup founder signup (3-step) | `app/startup-signup/page.tsx` |
| Hub lead capture | `components/leads/HubLeadForm.tsx` |
| Country lead form | `components/foreign-investment/CountryLeadForm.tsx` |
| Listing enquiry | `components/ListingEnquiryForm.tsx` |
| Full-service broker enquiry | `components/full-service-brokers/FullServiceBrokerEnquiryForm.tsx` |
| Newsletter subscribe (segment) | `app/newsletter/subscribe/SubscribeForm.tsx` |
| Hub newsletter capture | `components/HubNewsletterCapture.tsx` |
| Newsletter signup widget | `components/NewsletterSignup.tsx` |
| Rate-alert capture | `components/RateAlertCapture.tsx` |
| Question capture | `components/QuestionCaptureForm.tsx` |
| Get-matched wizard (QuestionCard) | `app/get-matched/_components/QuestionCard.tsx` |
| Quiz inline email capture | `app/quiz/_components/QuizInlineEmailCapture.tsx` |
| Advisor contact + OTP step | `app/quiz/_components/AdvisorContactStep.tsx` |
| Exit-intent modal | `components/ExitIntentModal.tsx` |
| Pillar exit-intent | `components/PillarExitIntent.tsx` |
| Lead magnet (fee audit) | `components/LeadMagnet.tsx` |

---

## Findings

| # | Severity | file:line | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | High | `components/ListingEnquiryForm.tsx:224` | Error paragraph has no `role="alert"` and no `aria-describedby` link from fields. Screen-reader users will not be notified when submission fails. | Add `role="alert"` to the error `<p>` and `aria-describedby` pointing to it on the name/email inputs. |
| 2 | High | `components/FundReviewForm.tsx:165–196` | No `autoComplete` attributes on any field (display name, email, review title). The email field is for verification and would benefit from `autoComplete="email"` to avoid password-manager interference; name from `autoComplete="name"`. | Add `autoComplete="name"` to display-name input and `autoComplete="email"` to email input. |
| 3 | High | `app/startup-signup/page.tsx:253–335` | Step 2 fields (company name, ABN, founded year, funding stage, team size) carry no `autoComplete` attributes. ABN is a text field that should at minimum get `autoComplete="off"` (to prevent browsers autofilling wrong values) and the `type="number"` year/team inputs lack `inputMode="numeric"`. | Add `autoComplete="organization"` to company name, `autoComplete="off"` to ABN, `inputMode="numeric"` to founded-year and team-size inputs. |
| 4 | High | `app/business-finance/BusinessFinanceEnquiryForm.tsx:102–213` | No `autoComplete` attributes on any field in this multi-field form (business name, contact name, email, phone). This is a high-intent enquiry form where autofill saves users significant friction. Phone field has `type="tel"` but no `autoComplete="tel"`. | Add `autoComplete="organization"`, `autoComplete="name"`, `autoComplete="email"`, `autoComplete="tel"` to the respective fields. |
| 5 | High | `components/ListingEnquiryForm.tsx:116–165` | Name, email, and phone inputs lack `autoComplete` attributes. Phone has `type="tel"` but no `autoComplete="tel"`. | Add `autoComplete="name"`, `autoComplete="email"`, `autoComplete="tel"`. |
| 6 | Medium | `components/HubNewsletterCapture.tsx:110–118` | Email input is missing `autoComplete="email"`. Unlike `SubscribeForm.tsx` which correctly sets it, this hub-specific variant skips it, causing inconsistent autofill UX across newsletter capture surfaces. | Add `autoComplete="email"` to the input. |
| 7 | Medium | `components/FundReviewForm.tsx:165–195` | No `aria-describedby` linkage from the email or name inputs to the submit-time error message (`errorMsg`). The error paragraph also has no `role="alert"` (`app/FundReviewForm.tsx:288`). | Add `role="alert"` to the error paragraph; add `aria-describedby` to inputs when `errorMsg` is set. |
| 8 | Medium | `components/AdvisorReviewForm.tsx:197–209` | Reviewer name and review-title inputs have no `autoComplete` attribute. For a public-facing review form, `autoComplete="name"` on the name field and `autoComplete="off"` on the title field (to prevent random autofills) would improve UX. | Add `autoComplete="name"` to the reviewer-name input; `autoComplete="off"` to the title input. |
| 9 | Medium | `app/business-finance/BusinessFinanceEnquiryForm.tsx:175–215` | Three `type="number"` inputs (loan amount, annual revenue, time in business) lack `inputMode="decimal"` or `inputMode="numeric"`. On iOS the default keyboard for `type="number"` shows a numpad missing the decimal point for decimals, and the spinner controls are present but unusable on mobile. | Add `inputMode="decimal"` to loan-amount and annual-revenue (accept decimals), `inputMode="numeric"` to time-in-business. |
| 10 | Medium | `app/startup-signup/page.tsx:77–95` | Step validation fires only on Next-button click (on-submit timing). There is no on-blur feedback on step 1 email or password fields. A user can type a bad email, tab away, see no feedback, and only learn on clicking Continue. | Add `onBlur` validation for email and password length on step 1 to match the pattern used in `advisor-signup/page.tsx`. |
| 11 | Medium | `components/CountryLeadForm.tsx:84–89` | Email validation on submit uses `!email.trim()` only — no format check. An input like `"foo"` passes the guard and reaches the API. The API will reject it, but the user gets a raw API error rather than a friendly client-side message. | Add the same `EMAIL_RE.test()` check used in `QuestionCaptureForm.tsx` or `HubLeadForm.tsx` before the fetch call. |
| 12 | Medium | `components/NewsletterSignup.tsx:43` | Email validation is `!email.includes("@")` — accepts single-character strings like `"a@b"`. The full-variant form (with name + cadence) sends a raw API error string to the user on HTTP failures rather than friendly copy. | Tighten to a proper regex (pattern already available in multiple sibling files). In the error handler, map common API errors to friendly messages using the `friendlyError()` pattern from `SubscribeForm.tsx`. |
| 13 | Low | `components/ExitIntentModal.tsx:162–168` | Exit-intent modal email input lacks a visible `<label>`. It uses only `placeholder` text. Screen-reader users and users who clear the placeholder value lose context. No `aria-label` present either. | Add `aria-label="Email address"` to match the pattern used in `HubNewsletterCapture.tsx`. |
| 14 | Low | `components/PillarExitIntent.tsx:232–241` | Lead-capture email input in the exit drawer uses `aria-label="Email address"` but has no `autoComplete="email"`. This is the only email capture in the codebase where `autoComplete` is missing on a styled exit-intent that also sets `autoFocus`. | Add `autoComplete="email"`. |
| 15 | Low | `app/auth/signup/SignupClient.tsx:225–237` | Signup email field (password tab) has no `autoFocus` while the equivalent login form correctly sets `autoFocus` on the email input. This breaks the "tab to the page, start typing" flow on the signup form. | Add `autoFocus` to `signup-email` input when `tab === "password"` to match login behaviour. |
| 16 | Low | `components/FundReviewForm.tsx:287–290` | Submit-time validation messages are collapsed into a single generic error: `"Please fill in all required fields."` (line 38–41). Users cannot tell which specific field is missing, and no `aria-invalid` is set on individual fields. | Validate per-field, set `aria-invalid` on failing inputs, and show inline errors below each field as `AdvisorReviewForm.tsx` does for star ratings and body length. |
| 17 | Low | `app/get-matched/_components/QuestionCard.tsx:201–216` | `TextInput` and `NumberInput` sub-components have no `<label>`, `aria-label`, or `id`. The inputs are rendered as standalone children with no accessible name — screen readers announce only the input type. | Add `aria-label` derived from the parent `question.prompt`, or thread an `id` + visible label from the parent `QuestionCard`. |
| 18 | Low | `components/HubNewsletterCapture.tsx:31–33` | Email validation is `!email.trim() || !email.includes("@")`. Uses the weak `includes("@")` check instead of the `EMAIL_RE` regex used in `HubLeadForm.tsx`. Matches issue #12. | Use a shared `isValidEmailClient()` helper from `lib/validate-email.ts` (already imported in `HubLeadForm.tsx`). |

---

## Quick wins

1. **HubNewsletterCapture `autoComplete="email"`** — one-line fix, affects every hub-page newsletter block (`components/HubNewsletterCapture.tsx:110`).
2. **PillarExitIntent `autoComplete="email"`** — one-line fix on the exit drawer email input (`components/PillarExitIntent.tsx:235`).
3. **ExitIntentModal `aria-label`** — add `aria-label="Email address"` to the modal input (`components/ExitIntentModal.tsx:165`) — makes screen readers announce the field.
4. **CountryLeadForm email regex** — replace `!email.trim()` with an EMAIL_RE test (`components/foreign-investment/CountryLeadForm.tsx:84`).
5. **NewsletterSignup error messages** — switch `setError(err.message)` to the `friendlyError()` mapping already written in `SubscribeForm.tsx` (`components/NewsletterSignup.tsx:58–59`).
6. **SignupClient `autoFocus`** — add to the email field in the password tab (`app/auth/signup/SignupClient.tsx:228`).

---

## Notable

- **Auth forms are the strongest in the codebase.** `LoginClient.tsx` and `SignupClient.tsx` have `autoComplete`, `aria-required`, `aria-describedby`, `role="alert"`, `noValidate`, password-strength indicator, show/hide toggle, and correct `autoFocus`. These should serve as the internal template for all other forms.
- **Advisor-signup (`app/advisor-signup/page.tsx`)** is the only non-auth form with per-field on-blur validation, `aria-invalid`, and `aria-describedby` wired together — a good secondary reference pattern.
- **No form in this audit uses the browser's built-in `required` validation bubble as the *primary* error surface.** All critical forms pass `noValidate` and handle errors in React state with `role="alert"` — this is correct and consistent.
- **Double-submit prevention is broadly well-handled.** `ListingEnquiryForm`, `FullServiceBrokerEnquiryForm`, and `CountryLeadForm` all guard via `if (loading) return` / `if (status === "submitting") return` before the async call. The `AdvisorContactStep` disables the submit button and shows a spinner via the shared `Button` component.
- **`inputMode` gaps are concentrated in business/financial number inputs** where iOS UX is most critical (loan amounts, revenue figures). The rate-alert and calculator number inputs are correctly annotated; the enquiry forms are not.
