/**
 * Simplified Sankofa ("go back and fetch it") Adinkra symbol — learning from the past.
 * Drawn for GPIP; inherits colour from the surrounding text.
 */
/** Decorative: always paired with visible text, so hidden from assistive technology. */
export function SankofaMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M32 57C19 47 7 37 7 22.5 7 13.5 13.5 8 21 8c5 0 8.6 2.8 11 7 2.4-4.2 6-7 11-7 7.5 0 14 5.5 14 14.5C57 37 45 47 32 57Z" />
      <path d="M32 15c-1.8 6.5-6.5 10.5-11.5 9.5-4-.8-5.2-5.6-2.2-7.7 2.4-1.7 5.2.2 4.6 2.7" />
      <path d="M32 15c1.8 6.5 6.5 10.5 11.5 9.5 4-.8 5.2-5.6 2.2-7.7-2.4-1.7-5.2.2-4.6 2.7" />
      <path d="M24 40c3.5 2 6 5.5 8 9 2-3.5 4.5-7 8-9" />
    </svg>
  );
}
