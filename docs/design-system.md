# Design System — Working Rules

One-page reference for new code. The primitives live under `components/ui/`.

---

## 1. Canonical Primary CTA

**`bg-amber-500 text-slate-900`** is the brand primary button colour.

Use the `Button` primitive (`components/ui/Button.tsx`) with `variant="primary"` for all primary actions:

```tsx
import { Button } from "@/components/ui/Button";

<Button variant="primary" href="/get-matched">Get matched</Button>
<Button variant="primary" onClick={submit}>Submit</Button>
```

The primitive handles sizing (`size="sm|md|lg"`), loading spinner, icon slot, hover/active/disabled states, and dark-mode contrast. It renders as `<Link>` when `href` is supplied, `<button>` otherwise.

Secondary / ghost / danger variants (`variant="secondary|ghost|danger"`) follow the same API.

**Do not** scatter bespoke `bg-amber-500 text-slate-900 rounded-lg …` markup — use `<Button>`. The only legitimate exception is a narrow inline link inside prose where the `Button` height would break the line box; document why with a comment.

---

## 2. Primitives — when to use them

### `Button` — `components/ui/Button.tsx`
Use for every interactive CTA, form submit, and navigation action. Covers all interactive states and focus rings out of the box. Accept the `className` prop for one-off width/margin overrides.

### `Card` — `components/ui/Card.tsx`
Use for any visually grouped content block (feature cards, profile panels, metric tiles). Props:
- `variant`: `default` (white + `border-slate-200`) | `elevated` (shadow) | `bordered` (2 px border) | `flat` (slate-50 bg, no border)
- `padding`: `none | sm | md | lg`
- `as`: `div | article | section`

Avoid re-implementing the card frame with raw `bg-white border border-slate-200 rounded-2xl` when `<Card>` will do. Use `Card` + `padding="none"` when you need custom interior layout, and put the layout inside.

### `Badge` — `components/ui/Badge.tsx`
Use for status labels, tags, and pill indicators. Props:
- `variant`: `default | success | warning | error | info | gold`
- `size`: `sm | md`

Do not hand-roll coloured `<span>` chips — use `<Badge variant="success">Verified</Badge>` etc. The badge is intentionally `rounded-full`; if you need a square pill (e.g. price tag) use `Badge` with an extra `className="!rounded-md"`.

---

## 3. Never use inline `style={{}}` for colours

Inline `style={{}}` bypasses the `html.dark .<utility>` overrides in `app/globals.css`.
A hardcoded `style={{ color: "#0f172a" }}` will stay dark-on-dark in dark mode.

**Rule:** colours, borders, backgrounds, and spacing must use Tailwind utility classes.

| Instead of | Use |
|---|---|
| `style={{ background: "#fff", border: "1px solid #e5e7eb" }}` | `className="bg-white border border-slate-200"` |
| `style={{ color: "var(--color-teal-600, #0d9488)" }}` | `className="text-teal-600"` |
| `style={{ background: "#f0fdfa", border: "1px solid #99f6e4" }}` | `className="bg-teal-50 border border-teal-200"` |
| `style={{ color: "#7c3aed", background: "#f5f3ff" }}` | `className="text-violet-700 bg-violet-50"` |
| `style={{ fontSize: 13, lineHeight: 1.5, overflow: "hidden", WebkitLineClamp: 2 }}` | `className="text-[13px] leading-relaxed line-clamp-2"` |

**Permitted** inline styles: computed/data-driven values that have no static Tailwind equivalent — e.g. `style={{ width: \`${pct}%\` }}` or `style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}`. Add a comment explaining why.
