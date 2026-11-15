CREATE TYPE "public"."budget_kind" AS ENUM('allocated', 'released', 'spent');--> statement-breakpoint
CREATE TYPE "public"."commitment_kind" AS ENUM('campaign_promise', 'policy_statement', 'approved_programme', 'funded_project');--> statement-breakpoint
CREATE TYPE "public"."commitment_link_kind" AS ENUM('supersedes', 'continues', 'duplicates');--> statement-breakpoint
CREATE TYPE "public"."commitment_status" AS ENUM('not_started', 'in_progress', 'completed', 'partially_completed', 'stalled', 'discontinued', 'superseded', 'insufficient_evidence');--> statement-breakpoint
CREATE TYPE "public"."correction_status" AS ENUM('new', 'reviewed', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('GHS', 'GHC', 'USD');--> statement-breakpoint
CREATE TYPE "public"."editorial_note_kind" AS ENUM('context', 'unresolved_question', 'timeline_narrative');--> statement-breakpoint
CREATE TYPE "public"."verification" AS ENUM('government_reported', 'independently_verified', 'disputed');--> statement-breakpoint
CREATE TABLE "commitment_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"commitment_slug" text NOT NULL,
	"kind" "budget_kind" NOT NULL,
	"amount" numeric NOT NULL,
	"currency" "currency" NOT NULL,
	"fiscal_year" integer,
	"source_id" uuid NOT NULL,
	"page" integer,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commitment_institutions" (
	"commitment_slug" text NOT NULL,
	"institution_slug" text NOT NULL,
	CONSTRAINT "commitment_institutions_commitment_slug_institution_slug_pk" PRIMARY KEY("commitment_slug","institution_slug")
);
--> statement-breakpoint
CREATE TABLE "commitment_links" (
	"from_slug" text NOT NULL,
	"to_slug" text NOT NULL,
	"kind" "commitment_link_kind" NOT NULL,
	CONSTRAINT "commitment_links_from_slug_to_slug_kind_pk" PRIMARY KEY("from_slug","to_slug","kind")
);
--> statement-breakpoint
CREATE TABLE "commitment_stewardships" (
	"id" serial PRIMARY KEY NOT NULL,
	"commitment_slug" text NOT NULL,
	"administration_slug" text NOT NULL,
	"progress_at_start" double precision,
	"progress_at_end" double precision,
	"status" "commitment_status" NOT NULL,
	"notes" text,
	CONSTRAINT "stewardship_once_per_administration" UNIQUE("commitment_slug","administration_slug"),
	CONSTRAINT "stewardship_progress_range" CHECK (("commitment_stewardships"."progress_at_start" is null or "commitment_stewardships"."progress_at_start" between 0 and 100) and ("commitment_stewardships"."progress_at_end" is null or "commitment_stewardships"."progress_at_end" between 0 and 100))
);
--> statement-breakpoint
CREATE TABLE "commitments" (
	"slug" text PRIMARY KEY NOT NULL,
	"wording" text NOT NULL,
	"document_id" uuid NOT NULL,
	"page" integer NOT NULL,
	"kind" "commitment_kind" NOT NULL,
	"originating_administration_slug" text NOT NULL,
	"announced_on" date,
	"sector_slug" text,
	"target" text,
	"target_deadline" date,
	"final_status" "commitment_status" DEFAULT 'not_started' NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commitments_page_positive" CHECK ("commitments"."page" >= 1)
);
--> statement-breakpoint
CREATE TABLE "correction_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_url" text NOT NULL,
	"message" text NOT NULL,
	"evidence_url" text,
	"contact" text,
	"ip_hash" text NOT NULL,
	"status" "correction_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"doc_type" text NOT NULL,
	"administration_slug" text,
	"pages" integer,
	"mime" text NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text NOT NULL,
	"bytes" integer NOT NULL,
	"public_redistribution" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
CREATE TABLE "editorial_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_type" text NOT NULL,
	"subject_key" text NOT NULL,
	"kind" "editorial_note_kind" NOT NULL,
	"body" text NOT NULL,
	"source_id" uuid,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"items_found" integer DEFAULT 0 NOT NULL,
	"items_queued" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "progress_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"commitment_slug" text NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"metric_value" double precision,
	"verification" "verification" NOT NULL,
	"source_id" uuid NOT NULL,
	"page" integer,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commitment_budgets" ADD CONSTRAINT "commitment_budgets_commitment_slug_commitments_slug_fk" FOREIGN KEY ("commitment_slug") REFERENCES "public"."commitments"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_budgets" ADD CONSTRAINT "commitment_budgets_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_institutions" ADD CONSTRAINT "commitment_institutions_commitment_slug_commitments_slug_fk" FOREIGN KEY ("commitment_slug") REFERENCES "public"."commitments"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_institutions" ADD CONSTRAINT "commitment_institutions_institution_slug_institutions_slug_fk" FOREIGN KEY ("institution_slug") REFERENCES "public"."institutions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_links" ADD CONSTRAINT "commitment_links_from_slug_commitments_slug_fk" FOREIGN KEY ("from_slug") REFERENCES "public"."commitments"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_links" ADD CONSTRAINT "commitment_links_to_slug_commitments_slug_fk" FOREIGN KEY ("to_slug") REFERENCES "public"."commitments"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_stewardships" ADD CONSTRAINT "commitment_stewardships_commitment_slug_commitments_slug_fk" FOREIGN KEY ("commitment_slug") REFERENCES "public"."commitments"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_stewardships" ADD CONSTRAINT "commitment_stewardships_administration_slug_administrations_slug_fk" FOREIGN KEY ("administration_slug") REFERENCES "public"."administrations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_originating_administration_slug_administrations_slug_fk" FOREIGN KEY ("originating_administration_slug") REFERENCES "public"."administrations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_sector_slug_sectors_slug_fk" FOREIGN KEY ("sector_slug") REFERENCES "public"."sectors"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_administration_slug_administrations_slug_fk" FOREIGN KEY ("administration_slug") REFERENCES "public"."administrations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_notes" ADD CONSTRAINT "editorial_notes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_commitment_slug_commitments_slug_fk" FOREIGN KEY ("commitment_slug") REFERENCES "public"."commitments"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_updates" ADD CONSTRAINT "progress_updates_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commitments_origin_idx" ON "commitments" USING btree ("originating_administration_slug");