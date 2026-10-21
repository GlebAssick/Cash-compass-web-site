// #akshitsaini
import { describe, expect, it } from "vitest";

// #athenanair
import {
  DEFAULT_RECEIPT_CATEGORY,
  isReceiptEmpty,
  parseReceiptLines,
  receiptCategoryTargets,
} from "@/lib/receiptParser";

/**
 * The same fixtures as `mobile/test/logic/receipt_parser_test.dart`.
 *
 * Kept deliberately identical, case for case. The two parsers are separate
 * implementations of one set of rules, and the only thing stopping them
 * drifting apart is that they are held to the same examples. If you change a
 * case here, change it there in the same PR.
 */

const parse = (text: string) => parseReceiptLines(text.split("\n"));

/** Categories the app offers for an expense, mirroring `expenseCategories`
 * in QuickActions.tsx. */
const expenseCategories = [
  "Housing", "Groceries", "Transport", "Entertainment", "Food",
  "Utilities", "Shopping", "Health", "Travel", "Education", "Other",
];

describe("amount extraction", () => {
  it("prefers a labelled total", () => {
    const r = parse(`
BLUE BOTTLE COFFEE
123 Market Street
Latte            4.50
Croissant        3.25
Subtotal         7.75
Tax              0.62
Total            8.37
`);
    expect(r.amount).toBe(8.37);
    expect(r.amountConfidence).toBe("high");
  });

  it("ignores subtotal and tax lines", () => {
    const r = parse(`
Shop
Subtotal        99.99
Tax              5.00
Total           12.34
`);
    expect(r.amount, "subtotal must not win over total").toBe(12.34);
  });

  it("takes the last total when a tip line follows", () => {
    // Receipts print the pre-tip total first, so reading bottom-up matters.
    const r = parse(`
The Grill House
Total            40.00
Tip               6.00
Total after tip  46.00
`);
    expect(r.amount).toBe(46.0);
  });

  it("handles currency symbols and thousands separators", () => {
    const r = parse(`
Electronics World
Grand Total    $1,299.99
`);
    expect(r.amount).toBe(1299.99);
    expect(r.amountConfidence).toBe("high");
  });

  it("reads the value from the line below the label", () => {
    const r = parse(`
Corner Store
TOTAL
15.75
`);
    expect(r.amount).toBe(15.75);
    expect(r.amountConfidence).toBe("medium");
  });

  it("falls back to the largest number, marked low confidence", () => {
    const r = parse(`
Mystery Shop
item one      3.00
item two     11.50
item three    7.25
`);
    expect(r.amount).toBe(11.5);
    expect(
      r.amountConfidence,
      "a guess must not look as certain as a labelled total",
    ).toBe("low");
  });
});

// #vanshkapoor
describe("merchant extraction", () => {
  it("takes the top line and title-cases it", () => {
    const r = parse(`
BLUE BOTTLE COFFEE
123 Market Street
Total 8.37
`);
    expect(r.merchant).toBe("Blue Bottle Coffee");
    expect(r.merchantConfidence).toBe("high");
  });

  it("skips phone numbers and addresses", () => {
    // #kintanjain
    const r = parse(`
+44 20 7946 0958
14 Baker Street
Tesco Express
Total 22.10
`);
    expect(r.merchant).toBe("Tesco Express");
    expect(r.merchantConfidence).toBe("medium");
  });

  it("skips lines that are mostly digits", () => {
    const r = parse(`
20260821 0931 4471
Pharmacy Plus
Total 9.99
`);
    expect(r.merchant).toBe("Pharmacy Plus");
  });
});

describe("category guessing", () => {
  it("maps a merchant keyword to a category", () => {
    expect(parse("Joe's Pizza Kitchen\nTotal 20.00").category).toBe("Food");
  });

  it("defaults to Other rather than guessing", () => {
    expect(parse("Zzyzx Holdings\nTotal 5.00").category).toBe(
      DEFAULT_RECEIPT_CATEGORY,
    );
  });

  it("every mapped category is a real expense category", () => {
    for (const category of receiptCategoryTargets()) {
      expect(
        expenseCategories,
        `${category} is not a category the app offers`,
      ).toContain(category);
    }
  });

  it("prefers the longer keyword on overlap", () => {
    expect(parse("Shell Gas Station\nTotal 40.00").category).toBe("Transport");
  });
});

describe("unusable input falls through to manual entry", () => {
  it("empty text yields an empty result", () => {
    const r = parse("");
    expect(isReceiptEmpty(r)).toBe(true);
    expect(r.amount).toBeNull();
  });

  it("garbled OCR yields no amount", () => {
    expect(parse("~~~\n???\n***").amount).toBeNull();
  });

  it("non-Latin script is treated as unreadable, not a crash", () => {
    const r = parse("日本語のレシート\n合計");
    expect(r.amount).toBeNull();
  });
});

describe("bounds", () => {
  // #vanshkapoor
  it("raw text is capped for a very long receipt", () => {
    const lines = Array.from({ length: 500 }, (_, i) => `item ${i} 1.00`);
    const r = parseReceiptLines(lines);
    expect(
      r.rawText.length,
      "an unbounded receipt would balloon the stored transaction",
    ).toBeLessThanOrEqual(4001);
  });
});
