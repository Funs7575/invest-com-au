# Cross-border partner panel (FIN_NOTEBOOK #24 Phase B)

A config-driven affiliate panel on the `/foreign-investment/<country>` pages
that surfaces vetted **remittance/FX, non-resident-mortgage and FIRB-legal**
partners. Corridors spend on these services long before they convert to an
advisor lead, so the panel captures upstream referral commission.

## Status

- **Infrastructure: shipped.** Type (`CrossBorderPartner`), config field
  (`CountryConfig.crossBorderPartners`), renderer
  (`components/foreign-investment/CrossBorderPartnerPanel.tsx`) and template
  wiring (`CountryHubTemplate.tsx`, section id `cross-border-partners`).
- **Partners: none live.** The section is **opt-in** — it renders only when a
  country config sets `crossBorderPartners` with a non-empty `partners` array.
  No corridor populates it yet.

## Why no partners are listed

Listing a provider asserts a commercial referral relationship and publishes an
affiliate link on an AFSL-regulated page. That requires a **signed referral
agreement + a disclosure review** (a BD/legal step — Phase C in the notebook),
not a code change. Do **not** add a provider we haven't actually signed.

## How to activate a corridor (once a deal is signed)

Add a `crossBorderPartners` block to the country's config in
`lib/foreign-investment-country-data.ts`. Example for the UK:

```ts
crossBorderPartners: {
  eyebrow: "Cross-border partners",
  title: "Move money and settle property from the UK",
  sub: "Vetted partners for FX, non-resident mortgages and FIRB applications. Promoted placements — see disclosure below.",
  partners: [
    {
      slug: "<partner-slug>",      // also the data-partner click label
      name: "<Partner name>",
      category: "fx",               // "remittance" | "fx" | "mortgage" | "legal"
      tagline: "<one line>",
      benefit: "<corridor-specific reason>",
      ctaLabel: "Open an account",
      href: "<signed affiliate/referral URL>",
      note: "<optional fine-print>",
    },
  ],
},
```

Optionally add `{ id: "cross-border-partners", label: "Partners" }` to the
country's `toc` so it appears in the sticky in-page nav.

## Compliance (already enforced by the renderer)

- Every CTA carries `AFFILIATE_REL` (`noopener noreferrer nofollow sponsored`).
- The panel footer renders `ADVERTISER_DISCLOSURE_SHORT` from
  `lib/compliance.ts` — do not hardcode disclosure copy in a config.
- Cards are visually badged by category and never presented as an editorial
  ranking.
