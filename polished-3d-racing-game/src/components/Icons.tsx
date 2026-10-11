// Lightweight inline SVG icons (stroke = currentColor). No external deps.
type P = { className?: string };

export const IconPlay = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
);
export const IconPause = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);
export const IconRestart = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
export const IconHome = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
);
export const IconVolume = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 5 6 9H3v6h3l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
export const IconMute = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 5 6 9H3v6h3l5 4V5z" />
    <path d="m17 9 4 6" />
    <path d="m21 9-4 6" />
  </svg>
);
export const IconTrophy = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3" />
    <path d="M17 6h3v2a3 3 0 0 1-3 3" />
  </svg>
);
export const IconBolt = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
);
export const IconHeart = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 21s-7.5-4.7-9.3-9A5.4 5.4 0 0 1 12 6.6 5.4 5.4 0 0 1 21.3 12C19.5 16.3 12 21 12 21z" /></svg>
);
export const IconGauge = ({ className = "w-6 h-6" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    <path d="m13.4 10.6 3.6-3.6" />
    <path d="M4 18a9 9 0 1 1 16 0" />
  </svg>
);
