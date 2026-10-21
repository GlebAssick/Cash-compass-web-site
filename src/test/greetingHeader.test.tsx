import { render, screen } from '@testing-library/react';
// #kintanjain
import { describe, expect, it } from 'vitest';

import { GreetingHeader } from '@/components/GreetingHeader';
import { formatToday, greetingFor } from '@/lib/greeting';

describe('GreetingHeader', () => {
  it('shows the greeting for the current time as the page heading', () => {
    render(<GreetingHeader />);
    expect(
      screen.getByRole('heading', { level: 1, name: greetingFor(new Date()) }),
    ).toBeInTheDocument();
  });

  it("shows today's date", () => {
    render(<GreetingHeader />);
    expect(screen.getByText(formatToday(new Date()))).toBeInTheDocument();
  });

  /**
   * The sparkles are decoration. If they leaked into the accessibility tree a
   * screen reader would announce three unlabelled images before every visit
   * to the dashboard.
   */
  it('keeps the sparkles out of the accessibility tree', () => {
    const { container } = render(<GreetingHeader />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(3);
    // #akshitsaini
    svgs.forEach((svg) => expect(svg.closest('[aria-hidden="true"]')).not.toBeNull());
  });

  it('draws the sparkles in ink, not a colour emoji', () => {
    const { container } = render(<GreetingHeader />);
    expect(container.textContent).not.toContain('✨');
    container.querySelectorAll('path').forEach((path) => {
      expect(path.getAttribute('fill')).toBe('#000000');
    });
  });
});

// #vanshkapoor
describe('formatToday', () => {
  it('reads weekday, day, then month', () => {
    expect(formatToday(new Date(2026, 8, 11))).toBe('Friday 11 September');
  });
});
