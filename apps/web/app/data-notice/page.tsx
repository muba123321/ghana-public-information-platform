import type { Metadata } from 'next';
import { NotAvailable } from '../../components/NotAvailable';

export const metadata: Metadata = { title: 'Data notice & disclaimer' };

export default function DataNoticePage() {
  const contact = process.env.GPIP_CONTACT_EMAIL;
  return (
    <div className="container page prose">
      <h1 className="page-title">Data notice &amp; disclaimer</h1>
      <p className="page-lede">
        All information on this platform is compiled from publicly available sources. This page
        explains what that means and how to ask for a correction.
      </p>

      <h2>Sources and licences</h2>
      <p>
        Data comes from Ghanaian public institutions (such as the Ghana Statistical Service, Bank of
        Ghana and Ministry of Finance), political parties&apos; published documents, and
        international organisations (such as the World Bank and IMF). Every record shows its
        publisher, a link to the original, and the date we retrieved it. Each dataset remains under
        its publisher&apos;s licence. Archived copies are shared only where the licence allows.
      </p>

      <h2>No endorsement</h2>
      <p>
        GPIP is independent. It is not affiliated with, funded by or endorsed by the Government of
        Ghana or any political party, and including a source does not mean we endorse it.
      </p>

      <h2>Figures as published</h2>
      <p>
        Figures are reproduced as their publishers released them. Where sources disagree or revise
        their figures, we show the differences rather than choose silently. Errors in source data
        are the publisher&apos;s; we flag them where we know of them.
      </p>

      <h2>In office is not causation</h2>
      <p>
        When we show what happened while an administration was in office, we are recording timing,
        not claiming the administration caused it. Economic conditions, global events and decisions
        by earlier governments all play a part. We do not score or rank governments.
      </p>

      <h2>No warranty</h2>
      <p>
        Information is provided as-is, for general public information, without warranty of any kind.
        Check the original source before relying on a figure.
      </p>

      <h2>Corrections</h2>
      <p>
        If you believe something is wrong, tell us with a link to your evidence. Corrections are
        reviewed and, once accepted, recorded in a public change log.
      </p>

      <h2>Contact</h2>
      <p>
        {contact ? (
          <a href={`mailto:${contact}`}>{contact}</a>
        ) : (
          <NotAvailable what="Contact address" />
        )}
      </p>
    </div>
  );
}
