import Link from 'next/link';

export default function Home() {
  return (
    <>
      <h1>Ghana Public Information Platform</h1>
      <p className="lede">
        What Ghana&apos;s governments promised, funded and delivered — and how the country changed —
        from independence in 1957 to today. Every figure links to its source.
      </p>
      <p>
        <Link href="/history">Government Performance &amp; History →</Link>
      </p>
    </>
  );
}
