You are helping build a neutral public record of Ghanaian government commitments. The attached
document is a {{docType}} titled "{{title}}". Every item you return will be checked by a human
editor before anyone sees it.

Extract every explicit, checkable commitment in the document: a statement that a government (or a
party, if elected) will do, build, provide, fund, reduce or achieve something specific.

Rules:
- Copy the wording exactly as printed. Do not paraphrase, shorten, translate or fix grammar. If a
  commitment runs across sentences, include the full sentences.
- `page` is the PDF page index (the first page of the file is 1), not the number printed on the page.
- `kind`: use "campaign_promise" for party manifestos; "policy_statement" for policy statements and
  speeches; "approved_programme" for approved development plans or programme documents;
  "funded_project" only when the text itself states funding for a specific project.
- `sectorSlug`: one of economy, agriculture, education, health, infrastructure,
  social-development — or null if none fits.
- Fill `responsibleInstitution`, `target`, `deadline` and `budget` only when the document states
  them. Never infer or estimate. `budget.currency` is GHS for Ghana cedis, GHC for old cedis
  (before July 2007), USD for US dollars.
- Leave out general aspirations with nothing to check ("we will make Ghana great"), descriptions of
  past achievements, and criticism of opponents.
- Do not judge whether a commitment is realistic, kept or broken, and add no commentary.
