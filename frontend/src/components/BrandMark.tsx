export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <div className="brand-mark-wrapper">
      <svg
        className="brand-mark-svg"
        viewBox="0 0 32 32"
        width={size}
        height={size}
        fill="none"
        aria-hidden="true"
      >
        <rect x="1.5" y="1.5" width="29" height="29" rx="6" className="brand-svg-frame" />
        <line x1="16" y1="4" x2="16" y2="28" className="brand-svg-grid" />
        <line x1="4" y1="16" x2="28" y2="16" className="brand-svg-grid" />
        <circle cx="9" cy="9" r="4.5" className="brand-svg-node" />
        <circle cx="9" cy="9" r="2" className="brand-svg-node-core" />
        <circle cx="23" cy="23" r="4.5" className="brand-svg-node" />
        <circle cx="23" cy="23" r="2" className="brand-svg-node-core" />
        <line x1="12" y1="12" x2="20" y2="20" className="brand-svg-clash" />
        <path d="M 9 15 C 9 21, 15 23, 19 23" className="brand-svg-vector" />
        <polygon points="17,21 21,23 17,25" className="brand-svg-arrow" />
      </svg>
      <div className="brand-text">
        <span className="brand-title">Pairwise Clause Conflict Map</span>
        <span className="brand-subtitle">GenLayer semantic conflict mapping</span>
      </div>
    </div>
  );
}
