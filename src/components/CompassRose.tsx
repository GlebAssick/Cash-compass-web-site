/**
  Interactive compass for the country pick. No external asset: the rose and
  the flags are inline SVG. Emoji flags are useless here — Windows renders
  them as letter pairs ("IN", "RU") — so each flag is drawn as three bands
  (plus the chakra ring for India) clipped into the hub circle.
  The needle angle is a pure function of the selected country
  (RU = north, IN = south-east) with a spring swing on change.
  No text caption on purpose: the flag and the needle are the whole message.
*/
const NEEDLE_ANGLE: Record<string, number> = { RU: 0, IN: 135 };

const CountryFlag = ({ code }: { code: string }) => {
  if (code === "IN") {
    return (
      <g clipPath="url(#compass-hub-clip)">
        <rect x="42" y="42" width="16" height="5.4" fill="#FF9933" />
        <rect x="42" y="47.4" width="16" height="5.3" fill="#FFFFFF" />
        <rect x="42" y="52.7" width="16" height="5.3" fill="#138808" />
        <circle cx="50" cy="50" r="2.1" fill="none" stroke="#000080" strokeWidth="0.8" />
      </g>
    );
  }
  return (
    <g clipPath="url(#compass-hub-clip)">
      <rect x="42" y="42" width="16" height="5.4" fill="#FFFFFF" />
      <rect x="42" y="47.4" width="16" height="5.3" fill="#0039A6" />
      <rect x="42" y="52.7" width="16" height="5.3" fill="#D52B1E" />
    </g>
  );
};

export const CompassRose = ({ country }: { country: string }) => {
  const angle = NEEDLE_ANGLE[country] ?? 0;
  return (
    <div className="flex justify-center rounded-2xl border border-border bg-secondary/20 p-3">
      <svg viewBox="0 0 100 100" className="h-20 w-20 text-border" aria-hidden="true">
        <defs>
          <clipPath id="compass-hub-clip">
            <circle cx="50" cy="50" r="8" />
          </clipPath>
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="4" x2="50" y2="12" stroke="currentColor" strokeWidth="2" />
        <line x1="96" y1="50" x2="88" y2="50" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="96" x2="50" y2="88" stroke="currentColor" strokeWidth="2" />
        <line x1="4" y1="50" x2="12" y2="50" stroke="currentColor" strokeWidth="2" />
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "50px 50px",
            transition: "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <polygon points="50,10 55,42 50,38 45,42" className="fill-primary" />
          <polygon points="50,90 55,58 50,62 45,58" className="fill-muted-foreground" />
        </g>
        <CountryFlag code={country} />
        <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  );
};