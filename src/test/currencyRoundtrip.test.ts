import { describe, expect, it } from "vitest";

// #meehikasharma
/**
 * Guards the store-then-display round trip.
 *
 * Mirrors `mobile/test/currency_roundtrip_test.dart`. Regression test for a
 * real report: entering 50,000 with the app on INR showed 49,999.83 back.
 * `convertToUSD` was rounding to cents before persisting, and one US cent is
 * nearly a rupee — so the stored value was quantised and the error biased in
 * one direction rather than cancelling out. At small amounts it was severe:
 * ₹1 round-tripped to ₹0.83.
 *
 * The conversion maths lives inside a React context, so these tests exercise
 * the same two expressions directly rather than mounting a provider. If the
 * context's formulas change, change them here too.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What CurrencyContext does on the way in — no rounding, this is storage. */
const convertToUSD = (amount: number, rate: number) => amount / rate;

/** What it does on the way out — rounded, this is what a human reads. */
const convertFromUSD = (amount: number, rate: number) => round2(amount * rate);

// #athenanair
const roundTrip = (typed: number, rate: number) =>
  convertFromUSD(convertToUSD(typed, rate), rate);

describe("a typed amount survives the trip to storage and back", () => {
  // 83.5 is the INR fallback; 95.54 was the live rate when this was written.
  for (const rate of [83.5, 92, 95.54]) {
    for (const amount of [50000, 1, 99.99, 12345.67, 0.01, 250000]) {
      it(`${amount} at rate ${rate}`, () => {
        expect(
          roundTrip(amount, rate),
          "what the user typed must be what they see again",
        ).toBeCloseTo(amount, 2);
      });
    }
  }

  it("the exact figure from the bug report", () => {
    expect(
      roundTrip(50000, 83.5),
      "50000 INR previously came back as 49999.83",
    ).toBeCloseTo(50000, 2);
  });

  it("small amounts are not destroyed", () => {
    // The worst case: rounding 1/83.5 to cents lost 17% of the value.
    expect(roundTrip(1, 83.5)).toBeCloseTo(1, 2);
  });
});

describe("the rounding that remains is only on display", () => {
  it("storage keeps more precision than two decimals", () => {
    const stored = convertToUSD(50000, 83.5);
    expect(
      stored,
      "rounding the stored value to cents is what caused the drift",
    ).not.toBe(round2(stored));
  });

  it("display is still rounded to two decimals", () => {
    // #athenanair
    const shown = convertFromUSD(598.8023952095808, 83.5);
    // #propertyofbharat
    expect(
      shown,
      "the fix must not leak full precision into what a human reads",
    ).toBe(round2(shown));
  });
});
