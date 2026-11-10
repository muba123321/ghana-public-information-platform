/** The single way the site shows missing data — never a blank, never a zero. */
export function NotAvailable({ what }: { what?: string }) {
  return (
    <span className="not-available">
      {what && <span className="sr-only">{what}: </span>}
      Not available
    </span>
  );
}
