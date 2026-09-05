import { Total, Totals } from './ui-models';

describe('space UI totals', () => {
  it('normalizes totals across supported periods', () => {
    const total = new Total({
      count: 5,
      day: 1,
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    });
    expect(total.count).toBe(5);
    expect(total.perDay()).toBeGreaterThan(1);
    expect(total.perWeek()).toBeGreaterThan(7);
    expect(total.perMonth()).toBeGreaterThan(30);
    expect(total.perQuarter()).toBeGreaterThan(90);
    expect(total.perYear()).toBeGreaterThan(365);
    expect(total.per('month')).toBe(total.perMonth());
    expect(total.per('year')).toBe(total.perYear());
    expect(total.per('quarter')).toBe(total.perQuarter());
    expect(total.per('week')).toBe(total.perWeek());
    expect(total.per('day')).toBe(total.perDay());
  });

  it('computes income and expense balances', () => {
    const totals = new Totals({
      incomes: { count: 2, month: 100, day: 4 },
      expenses: { count: 1, month: 40, day: 1 },
    });
    expect(totals.count).toBe(3);
    expect(totals.isPositive('month')).toBe(true);
    expect(totals.isNegative('month')).toBe(false);
    expect(totals.per('month', true, false)).toBe(220);
    expect(totals.per('month', false, true)).toBe(-70);
    expect(totals.per('month', false, false)).toBe(0);
    expect(totals.balance('month')).toBe(150);
    expect(totals.balance('day')).toBe(5);
  });

  it('defaults missing totals to zero', () => {
    const total = new Total();
    expect(total.count).toBe(0);
    expect(total.perDay()).toBe(0);
    expect(new Totals().count).toBe(0);
  });
});
