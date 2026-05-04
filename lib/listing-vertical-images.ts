/**
 * Curated Unsplash hero images per investment-listing vertical.
 * Used as a fallback when the DB `images` column is empty so cards
 * never render with just an emoji placeholder.
 *
 * The pool per vertical is intentionally small (4–6) so images repeat
 * predictably; the choice is deterministic on the listing id so a given
 * listing always shows the same image.
 *
 * Mirrors the pattern in `lib/property-images.ts`.
 */

/**
 * Sub-category / commodity overrides for verticals where the parent
 * pool is too generic. Looked up first via `(vertical, subCategory)`;
 * falls back to the parent vertical pool if no override exists.
 *
 * Keys are normalised to lowercase + underscores so callers can pass
 * either listing.sub_category, listing.key_metrics.commodity, or a
 * URL slug ("oil-gas" → "oil_gas") interchangeably.
 */
const VERTICAL_SUBCATEGORY_IMAGES: Record<
  string,
  Record<string, ReadonlyArray<string>>
> = {
  energy: {
    hydrogen: [
      "https://images.unsplash.com/photo-1623227866882-c005c26dfe41?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1592833167001-55b39c8e9e2c?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
    solar: [
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1559302995-f1d7e5c2bba3?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
    wind: [
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
    oil_gas: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1495615080073-6b89c9839ce0?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
  },
  mining: {
    lithium: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606613923022-ee4ce15a6d85?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518930259200-3e5b1f0d6b89?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
    uranium: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606613923022-ee4ce15a6d85?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
    gold: [
      "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1605792657660-596af9009e82?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
    iron_ore: [
      "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606613923022-ee4ce15a6d85?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
    copper: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=675&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1606613923022-ee4ce15a6d85?w=1200&h=675&q=80&auto=format&fit=crop",
    ],
  },
};

function normaliseSubKey(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

const VERTICAL_IMAGES: Record<string, ReadonlyArray<string>> = {
  business: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  commercial_property: [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1554435493-93422e8220c8?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1577415124269-fc1140a69e91?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  energy: [
    "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559302995-f1d7e5c2bba3?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  farmland: [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516570161787-2fd917215a3d?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  franchise: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1572202060038-ad048a23b32a?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  fund: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1554260570-9140fd3b7614?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1611324586631-67dd2a36c8c8?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  mining: [
    "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1606613923022-ee4ce15a6d85?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518930259200-3e5b1f0d6b89?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  startup: [
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
  pre_ipo: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1200&h=675&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=1200&h=675&q=80&auto=format&fit=crop",
  ],
};

const GENERIC_FALLBACK_POOL: ReadonlyArray<string> = [
  "https://images.unsplash.com/photo-1554260570-9140fd3b7614?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=675&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=1200&h=675&q=80&auto=format&fit=crop",
];

/**
 * Pick a deterministic seed image for a listing whose `images` array is empty.
 * Returns the live DB image when present.
 *
 * Resolution order: dbImages → (vertical, subCategory) → vertical → generic.
 * `subCategory` accepts listing.sub_category, key_metrics.commodity, or the
 * URL slug — they're normalised to a common shape before lookup.
 */
export function getListingHeroImage(
  vertical: string | null | undefined,
  listingId: number | string,
  dbImages: ReadonlyArray<string> | null | undefined,
  subCategory?: string | null,
): string {
  if (dbImages && dbImages.length > 0 && dbImages[0]) return dbImages[0];

  const idNum = typeof listingId === "number" ? listingId : Number(listingId);
  const safeIdx = Number.isFinite(idNum) && idNum >= 0 ? idNum : 0;

  const subKey = normaliseSubKey(subCategory);
  const subPool = vertical && subKey
    ? VERTICAL_SUBCATEGORY_IMAGES[vertical]?.[subKey]
    : undefined;
  const verticalPool = vertical ? VERTICAL_IMAGES[vertical] : undefined;
  const pool = subPool || verticalPool || GENERIC_FALLBACK_POOL;

  const fallback = pool[safeIdx % pool.length] ?? GENERIC_FALLBACK_POOL[0]!;
  return fallback;
}

/**
 * Pick a deterministic seed image keyed on a sector slug (e.g. "hydrogen",
 * "lithium") and a stable string id (e.g. an ASX ticker). Used for the
 * commodity-sector ticker / ETF cards which don't have a DB images column.
 */
export function getSectorThumbImage(
  sectorSlug: string | null | undefined,
  stableId: string,
): string {
  // Hash the stableId so different tickers in the same sector get
  // different images deterministically.
  let hash = 0;
  for (let i = 0; i < stableId.length; i += 1) {
    hash = ((hash << 5) - hash + stableId.charCodeAt(i)) | 0;
  }
  const safeIdx = Math.abs(hash);

  const subKey = normaliseSubKey(sectorSlug);
  // Sectors map onto either an "energy" or "mining" parent pool.
  const energyMatch = subKey && VERTICAL_SUBCATEGORY_IMAGES.energy?.[subKey];
  const miningMatch = subKey && VERTICAL_SUBCATEGORY_IMAGES.mining?.[subKey];
  const pool =
    energyMatch ||
    miningMatch ||
    VERTICAL_IMAGES.energy ||
    GENERIC_FALLBACK_POOL;

  return pool[safeIdx % pool.length] ?? GENERIC_FALLBACK_POOL[0]!;
}
