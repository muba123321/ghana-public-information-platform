-- Integrity constraints drizzle-kit cannot express: no two administrations (or two versions of the
-- same institution) may be in force on the same day. Ranges are half-open [start, end).
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "administrations" ADD CONSTRAINT "administrations_no_overlap"
  EXCLUDE USING gist (daterange("start_date", coalesce("end_date", 'infinity'::date), '[)') WITH &&);
--> statement-breakpoint
ALTER TABLE "institution_versions" ADD CONSTRAINT "institution_versions_no_overlap"
  EXCLUDE USING gist ("institution_slug" WITH =, daterange("valid_from", coalesce("valid_to", 'infinity'::date), '[)') WITH &&);
