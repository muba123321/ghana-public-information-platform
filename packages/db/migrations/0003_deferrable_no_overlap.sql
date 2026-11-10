-- Check the no-overlap rules at commit time, so a correction that moves two neighbouring
-- tenures in one transaction (e.g. shifting a handover date later) is valid.
ALTER TABLE "administrations" DROP CONSTRAINT "administrations_no_overlap";
--> statement-breakpoint
ALTER TABLE "administrations" ADD CONSTRAINT "administrations_no_overlap"
  EXCLUDE USING gist (daterange("start_date", coalesce("end_date", 'infinity'::date), '[)') WITH &&)
  DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "institution_versions" DROP CONSTRAINT "institution_versions_no_overlap";
--> statement-breakpoint
ALTER TABLE "institution_versions" ADD CONSTRAINT "institution_versions_no_overlap"
  EXCLUDE USING gist ("institution_slug" WITH =, daterange("valid_from", coalesce("valid_to", 'infinity'::date), '[)') WITH &&)
  DEFERRABLE INITIALLY DEFERRED;
