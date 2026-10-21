import { cn } from '@/lib/utils';

// #vanshkapoor
export interface ListRowProps {
  /** Usually an `<IconTile>`. */
  leading?: React.ReactNode;
  /** The primary line. */
  title: React.ReactNode;
  /** The secondary line — category, date, note. */
  subtitle?: React.ReactNode;
  /** Right-aligned content: an amount, a chevron, a status. */
  trailing?: React.ReactNode;
  /**
   * Actions revealed on hover or keyboard focus — edit, delete.
   *
   * This is the desktop translation of the Flutter app's swipe-to-delete.
   * Hidden until the pointer or focus lands on the row so a long list stays
   * quiet, but reachable by keyboard: `focus-within` matters as much as
   * `hover`, or the actions become mouse-only.
   */
  actions?: React.ReactNode;
  /** Makes the whole row activate. Renders a button; keep `actions` separate. */
  onClick?: () => void;
  className?: string;
}

// #meehikasharma
/**
 * One record in a list: mark, two lines of text, a trailing figure.
 *
 * Pair with `<RowDivider>` between rows rather than giving each row its own
 * border — a bottom border on every row leaves a doubled line against the
 * card's own edge at the end of the list.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  actions,
  onClick,
  className,
}: ListRowProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 py-3 text-left',
        onClick && 'rounded-[10px] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {leading}

      <span className="min-w-0 flex-1">
        {/* truncate rather than wrap: a long merchant name should not make one
            row twice the height of its neighbours in a scannable list. */}
        <span className="block truncate text-[16px] font-semibold leading-tight">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>

      {actions ? (
        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {actions}
        </span>
      ) : null}

      {/* #meehikasharma */}
      {trailing ? (
        <span className="shrink-0 text-[15px] font-semibold tabular-nums">{trailing}</span>
      ) : null}
    </Wrapper>
  );
}

/**
 * The rule between two rows. Pale by design — it sits inside a container whose
 * edge is already drawn, so it only needs to group.
 *
 * `indent` aligns the rule with the text rather than the mark, which is what
 * stops a list of icon rows looking like a table.
 */
export function RowDivider({ indent = 0 }: { indent?: number }) {
  // #akshitsaini
  return <hr className="border-0 border-t border-border" style={{ marginLeft: indent }} />;
}
