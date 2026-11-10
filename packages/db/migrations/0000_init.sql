CREATE TYPE "public"."administration_kind" AS ENUM('civilian', 'military', 'transitional');--> statement-breakpoint
CREATE TYPE "public"."leader_role" AS ENUM('head_of_state', 'head_of_government', 'vice_president');--> statement-breakpoint
CREATE TYPE "public"."lineage_kind" AS ENUM('renamed', 'merged_into', 'split_from', 'replaced_by', 'absorbed_functions_of');--> statement-breakpoint
CREATE TYPE "public"."provenance" AS ENUM('api', 'table_import', 'ai_extracted', 'manual');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'in_review', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('official_website', 'statute', 'gazette', 'report', 'dataset', 'manifesto', 'budget_statement', 'development_plan', 'reference_work');--> statement-breakpoint
CREATE TABLE "change_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_table" text NOT NULL,
	"entity_key" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_lineage" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_slug" text NOT NULL,
	"to_slug" text NOT NULL,
	"kind" "lineage_kind" NOT NULL,
	"effective_on" date NOT NULL,
	"source_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"institution_slug" text NOT NULL,
	"name" text NOT NULL,
	"mandate" text,
	"parent_slug" text,
	"sector_slug" text,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"source_id" uuid NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "versions_dates_ordered" CHECK ("institution_versions"."valid_to" is null or "institution_versions"."valid_to" > "institution_versions"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"slug" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "administration_leaders" (
	"id" serial PRIMARY KEY NOT NULL,
	"administration_slug" text NOT NULL,
	"person_slug" text NOT NULL,
	"role" "leader_role" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"label" text,
	"source_id" uuid NOT NULL,
	CONSTRAINT "leaders_dates_ordered" CHECK ("administration_leaders"."end_date" is null or "administration_leaders"."end_date" > "administration_leaders"."start_date")
);
--> statement-breakpoint
CREATE TABLE "administrations" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" "administration_kind" NOT NULL,
	"party_slug" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"source_id" uuid NOT NULL,
	"notes" text,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "administrations_dates_ordered" CHECK ("administrations"."end_date" is null or "administrations"."end_date" > "administrations"."start_date")
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"slug" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"source_type" "source_type" NOT NULL,
	"published_on" date,
	"retrieved_on" date NOT NULL,
	"licence" text,
	"archive_key" text,
	"sha256" text,
	CONSTRAINT "sources_url_title_unique" UNIQUE("url","title")
);
--> statement-breakpoint
ALTER TABLE "institution_lineage" ADD CONSTRAINT "institution_lineage_from_slug_institutions_slug_fk" FOREIGN KEY ("from_slug") REFERENCES "public"."institutions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_lineage" ADD CONSTRAINT "institution_lineage_to_slug_institutions_slug_fk" FOREIGN KEY ("to_slug") REFERENCES "public"."institutions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_lineage" ADD CONSTRAINT "institution_lineage_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_versions" ADD CONSTRAINT "institution_versions_institution_slug_institutions_slug_fk" FOREIGN KEY ("institution_slug") REFERENCES "public"."institutions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_versions" ADD CONSTRAINT "institution_versions_parent_slug_institutions_slug_fk" FOREIGN KEY ("parent_slug") REFERENCES "public"."institutions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_versions" ADD CONSTRAINT "institution_versions_sector_slug_sectors_slug_fk" FOREIGN KEY ("sector_slug") REFERENCES "public"."sectors"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_versions" ADD CONSTRAINT "institution_versions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administration_leaders" ADD CONSTRAINT "administration_leaders_administration_slug_administrations_slug_fk" FOREIGN KEY ("administration_slug") REFERENCES "public"."administrations"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administration_leaders" ADD CONSTRAINT "administration_leaders_person_slug_persons_slug_fk" FOREIGN KEY ("person_slug") REFERENCES "public"."persons"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administration_leaders" ADD CONSTRAINT "administration_leaders_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administrations" ADD CONSTRAINT "administrations_party_slug_parties_slug_fk" FOREIGN KEY ("party_slug") REFERENCES "public"."parties"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administrations" ADD CONSTRAINT "administrations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "versions_institution_idx" ON "institution_versions" USING btree ("institution_slug");--> statement-breakpoint
CREATE INDEX "leaders_admin_idx" ON "administration_leaders" USING btree ("administration_slug");--> statement-breakpoint
CREATE INDEX "leaders_person_idx" ON "administration_leaders" USING btree ("person_slug");--> statement-breakpoint
CREATE INDEX "administrations_start_idx" ON "administrations" USING btree ("start_date");