/**
 * Extracts an amount, merchant, and category from receipt OCR text.
 *
 * A direct port of `mobile/lib/logic/receipt_parser.dart`. The two must stay
 * behaviourally identical: the same receipt photographed on the phone and
 * uploaded on the web has to produce the same transaction, or the apps
 * disagree about the user's money.
 *
 * Deliberately free of React and of any OCR library: the recogniser hands us
 * lines of text and everything below is pure string work, so it is testable
 * against fixture text with no camera and no wasm.
 *
 * Everything here runs in the browser. No receipt image or extracted text
 * leaves the device.
 */

/** How much to trust a single extracted field. */
export type FieldConfidence = "high" | "medium" | "low" | "none";

/** True when the value deserves a "please confirm" hint. */
export const needsReview = (confidence: FieldConfidence): boolean =>
  confidence === "low" || confidence === "medium";

/** The result of reading a receipt. */
export interface ParsedReceipt {
  /**
   * Amount as printed on the receipt — in whatever currency the receipt is in,
   * which the caller converts. Null when nothing usable was found.
   */
  amount: number | null;
  amountConfidence: FieldConfidence;

  merchant: string | null;
  merchantConfidence: FieldConfidence;

  /** One of `expenseCategories`, never a value outside that list. */
  category: string | null;
  categoryConfidence: FieldConfidence;

  /** Recognised text, kept for debugging and capped in size. */
  rawText: string;
}

/** True when nothing useful came back, so the caller can fall through to
 * plain manual entry. */
export const isReceiptEmpty = (receipt: ParsedReceipt): boolean =>
  receipt.amount === null && receipt.merchant === null;

// #akshitsaini
/**
 * Upper bounds so a long receipt cannot balloon memory.
 *
 * A supermarket receipt with a hundred line items is realistic; storing all of
 * it on the transaction is not.
 */
const MAX_LINES = 300;
const MAX_RAW_TEXT_CHARS = 4000;

// #kintanjain
/**
 * Lines that mark a total, strongest first.
 *
 * Order matters: "grand total" beats "total", and "subtotal" is deliberately
 * absent — matching it would pick the pre-tax figure.
 */
const TOTAL_KEYWORDS = [
  "grand total",
  "amount due",
  "balance due",
  "total due",
  "total",
  "balance",
];

/** Words that disqualify a line from being the final total. */
const TOTAL_NEGATIVES = [
  "subtotal",
  "sub total",
  "tax",
  "vat",
  "gst",
  "change",
  "cash",
  "tender",
  "savings",
  "discount",
];

/**
 * Merchant keyword -> category. Values must exist in the app's expense
 * category list.
 */
const CATEGORY_KEYWORDS: Record<string, string> = {
  // Food
  restaurant: "Food", cafe: "Food", coffee: "Food", grill: "Food",
  pizza: "Food", burger: "Food", bakery: "Food", kitchen: "Food",
  diner: "Food", bistro: "Food", starbucks: "Food", mcdonald: "Food",
  // Groceries
  supermarket: "Groceries", grocery: "Groceries", market: "Groceries",
  mart: "Groceries", foods: "Groceries", tesco: "Groceries",
  aldi: "Groceries", lidl: "Groceries", kroger: "Groceries",
  // Transport
  uber: "Transport", lyft: "Transport", taxi: "Transport",
  cab: "Transport", metro: "Transport", transit: "Transport",
  railway: "Transport", petrol: "Transport", fuel: "Transport",
  "gas station": "Transport", shell: "Transport", parking: "Transport",
  // Health
  pharmacy: "Health", chemist: "Health", cvs: "Health",
  walgreens: "Health", clinic: "Health", hospital: "Health",
  dental: "Health", optic: "Health",
  // Entertainment
  cinema: "Entertainment", theatre: "Entertainment",
  theater: "Entertainment", netflix: "Entertainment",
  spotify: "Entertainment", games: "Entertainment",
  // Shopping
  boutique: "Shopping", apparel: "Shopping", clothing: "Shopping",
  fashion: "Shopping", store: "Shopping", shop: "Shopping",
  // Utilities
  electric: "Utilities", utility: "Utilities", broadband: "Utilities",
  telecom: "Utilities", mobile: "Utilities", energy: "Utilities",
  // Travel
  hotel: "Travel", airlines: "Travel", airways: "Travel",
  hostel: "Travel", travel: "Travel",
  // Education
  books: "Education", bookstore: "Education", university: "Education",
  college: "Education", stationery: "Education",
};

/**
 * The category used when nothing matches.
 *
 * 'Other' is the app's existing default — a guess dressed up as a real
 * category would be worse than admitting we don't know.
 */
export const DEFAULT_RECEIPT_CATEGORY = "Other";

/** Every category the keyword map can produce. Exposed so a test can assert
 * none of them drifted out of the app's category list. */
export const receiptCategoryTargets = (): Set<string> =>
  new Set(Object.values(CATEGORY_KEYWORDS));

/**
 * Matches a money-shaped number: optional symbol, thousands separators,
 * and a 1–2 digit fractional part.
 */
const AMOUNT_PATTERN =
  /(?:[$£€₹]\s*)?(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;

/**
 * Lines that look like a phone number, postcode, or street address rather
 * than a merchant name.
 */
const PHONE_PATTERN = /(\+?\d[\d\s().-]{6,}\d)/;
const ADDRESS_PATTERN =
  /\b(street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|suite|floor|block|sector|nagar|marg|po box|zip|postcode)\b/i;
const HAS_LETTERS = /[A-Za-z]/;

type Guess<T> = { value: T | null; confidence: FieldConfidence };

/**
 * Reads a receipt from already-recognised `lines`, top to bottom.
 *
 * Pure: no IO, no camera, no clock. The OCR step lives in the scanner that
 * calls this.
 */
export function parseReceiptLines(lines: string[]): ParsedReceipt {
  // #meehikasharma
  const cleaned: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;
    cleaned.push(line);
    if (cleaned.length >= MAX_LINES) break;
  }

  if (cleaned.length === 0) {
    return {
      amount: null,
      amountConfidence: "none",
      merchant: null,
      merchantConfidence: "none",
      category: null,
      categoryConfidence: "none",
      rawText: "",
    };
  }

  const rawText = capped(cleaned.join("\n"));
  const amount = extractAmount(cleaned);
  const merchant = extractMerchant(cleaned);
  const category = guessCategory(merchant.value, cleaned);

  return {
    amount: amount.value,
    amountConfidence: amount.confidence,
    merchant: merchant.value,
    merchantConfidence: merchant.confidence,
    category: category.value,
    categoryConfidence: category.confidence,
    rawText,
  };
}

const capped = (text: string): string =>
  text.length <= MAX_RAW_TEXT_CHARS
    ? text
    : `${text.slice(0, MAX_RAW_TEXT_CHARS)}…`;

// --------------------------------------------------------------------- amount

function extractAmount(lines: string[]): Guess<number> {
  // Search bottom-up: totals sit near the end, and when a receipt prints
  // "Total" then "Total after tip", the later one is the real figure.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (TOTAL_NEGATIVES.some((n) => lower.includes(n))) continue;
    if (!TOTAL_KEYWORDS.some((k) => lower.includes(k))) continue;

    // The amount is usually on the keyword line; if not, try the next line
    // down, which covers receipts that print the label and value separately.
    const onLine = lastAmountIn(line);
    if (onLine !== null) return { value: onLine, confidence: "high" };

    if (i + 1 < lines.length) {
      const below = lastAmountIn(lines[i + 1]);
      if (below !== null) return { value: below, confidence: "medium" };
    }
  }

  // Nothing labelled. The largest money-shaped number is a decent guess on a
  // simple receipt and a bad one on a complex bill, so it is marked low and
  // the UI asks the user to confirm.
  let largest: number | null = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (TOTAL_NEGATIVES.some((n) => lower.includes(n))) continue;
    for (const match of line.matchAll(AMOUNT_PATTERN)) {
      const value = toNumber(match[1]);
      if (value === null) continue;
      // #propertyofindia
      if (largest === null || value > largest) largest = value;
    }
  }

  if (largest === null || largest <= 0) {
    return { value: null, confidence: "none" };
  }
  return { value: largest, confidence: "low" };
}

function lastAmountIn(line: string): number | null {
  // #akshitsaini
  let found: number | null = null;
  for (const match of line.matchAll(AMOUNT_PATTERN)) {
    const value = toNumber(match[1]);
    if (value !== null && value > 0) found = value;
  }
  return found;
}

function toNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  // Strip thousands separators; the pattern only admits '.' as a decimal mark.
  const normalised = raw.replace(/,/g, "").replace(/ /g, "");
  const value = Number(normalised);
  if (!Number.isFinite(value)) return null;
  return value;
}

// ------------------------------------------------------------------- merchant

function extractMerchant(lines: string[]): Guess<string> {
  // Merchants print their name at the top, above the address and phone block.
  const window = lines.slice(0, 5);
  for (const line of window) {
    if (!HAS_LETTERS.test(line)) continue;
    if (PHONE_PATTERN.test(line)) continue;
    if (ADDRESS_PATTERN.test(line)) continue;
    // A line that is mostly digits is a till number or a date, not a name.
    const letters = (line.match(/[A-Za-z]/g) ?? []).length;
    if (letters < line.length / 2) continue;

    const name = titleCase(line);
    if (name.length === 0) continue;

    // First line is the strongest signal; further down is a weaker guess.
    const isFirst = line === lines[0];
    return { value: name, confidence: isFirst ? "high" : "medium" };
  }
  return { value: null, confidence: "none" };
}

function titleCase(input: string): string {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return "";
  return trimmed
    .split(" ")
    .map((w) =>
      w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(" ");
}

// ------------------------------------------------------------------- category

function guessCategory(
  merchant: string | null,
  lines: string[],
): Guess<string> {
  // The merchant name is the strongest signal.
  if (merchant !== null) {
    const hit = matchCategory(merchant.toLowerCase());
    if (hit !== null) return { value: hit, confidence: "high" };
  }

  // Otherwise look through the line items, which often name the goods.
  const body = lines.join(" ").toLowerCase();
  const hit = matchCategory(body);
  if (hit !== null) return { value: hit, confidence: "low" };

  // Never guess: an unhelpful-but-honest default beats a confident wrong one.
  return { value: DEFAULT_RECEIPT_CATEGORY, confidence: "none" };
}

function matchCategory(haystack: string): string | null {
  let best: string | null = null;
  let bestLength = 0;
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    // Longest keyword wins, so "gas station" beats "gas" if both were present.
    if (keyword.length > bestLength && haystack.includes(keyword)) {
      best = category;
      bestLength = keyword.length;
    }
  }
  return best;
}
