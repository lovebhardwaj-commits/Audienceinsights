// The fastrr Ads wordmark. The bracket mark stays brand-purple in both themes;
// the "fastrr Ads" text uses currentColor so it inherits text-ink / text-white
// from whatever wraps it, following the theme.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 437 238.119" className={className} aria-label="fastrr Ads">
      <g transform="translate(106 -2058)">
        <g transform="translate(-106 2127.454)">
          <path
            d="M69.336,62.6l-64.3-.142C1.5,62.455-.1,57.357,0,54.935c.1-2.346,1.951-7.2,5.237-7.193l66.952.173c3.688.009,5.649,5.4,5.19,7.912A7.757,7.757,0,0,1,69.336,62.6"
            transform="translate(0 -20.059)"
            fill="#6037d7"
          />
          <path
            d="M71.255,38.944l-38.042.168a7.434,7.434,0,0,1-7.844-6.92c-.239-3.17,2.467-7.8,6.75-7.822l38.009-.212a7.979,7.979,0,0,1,7.54,5.974c.6,2.94-1.7,8.791-6.413,8.812"
            transform="translate(4.405 -24.157)"
            fill="#6037d7"
          />
        </g>
        <text
          transform="translate(-15 2185)"
          fontSize="121"
          fontFamily="var(--font-poppins), sans-serif"
          fontWeight="700"
          fontStyle="italic"
          fill="currentColor"
        >
          <tspan x="0" y="0">fastrr</tspan>
        </text>
        <text
          transform="translate(-15 2271.119)"
          fontSize="70"
          fontFamily="var(--font-poppins), sans-serif"
          fontWeight="500"
          letterSpacing="0.009em"
          fill="currentColor"
        >
          <tspan x="0.005" y="0">Ads</tspan>
        </text>
      </g>
    </svg>
  );
}

// Icon-only bracket mark, for the collapsed sidebar rail where the full wordmark
// doesn't fit. Same paths/transforms as Logo, just a viewBox cropped to the icon
// group's bounding box instead of the full wordmark canvas.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-3 66 90 49" className={className} aria-label="fastrr">
      <g transform="translate(106 -2058)">
        <g transform="translate(-106 2127.454)">
          <path
            d="M69.336,62.6l-64.3-.142C1.5,62.455-.1,57.357,0,54.935c.1-2.346,1.951-7.2,5.237-7.193l66.952.173c3.688.009,5.649,5.4,5.19,7.912A7.757,7.757,0,0,1,69.336,62.6"
            transform="translate(0 -20.059)"
            fill="#6037d7"
          />
          <path
            d="M71.255,38.944l-38.042.168a7.434,7.434,0,0,1-7.844-6.92c-.239-3.17,2.467-7.8,6.75-7.822l38.009-.212a7.979,7.979,0,0,1,7.54,5.974c.6,2.94-1.7,8.791-6.413,8.812"
            transform="translate(4.405 -24.157)"
            fill="#6037d7"
          />
        </g>
      </g>
    </svg>
  );
}
