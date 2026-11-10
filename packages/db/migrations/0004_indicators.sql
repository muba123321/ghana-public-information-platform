CREATE TYPE "public"."context_event_kind" AS ENUM('international', 'methodology', 'domestic', 'institutional');--> statement-breakpoint
CREATE TYPE "public"."estimate_type" AS ENUM('reported', 'modelled', 'projected');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('annual', 'quarterly', 'monthly');--> statement-breakpoint
CREATE TABLE "context_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"kind" "context_event_kind" NOT NULL,
	"source_id" uuid NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"indicators_checked" integer DEFAULT 0 NOT NULL,
	"vintages_written" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "indicators" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"definition" text NOT NULL,
	"unit" text NOT NULL,
	"frequency" "frequency" NOT NULL,
	"sector_slug" text NOT NULL,
	"source_key" text NOT NULL,
	"series_code" text NOT NULL,
	"estimate_type" "estimate_type" NOT NULL,
	"methodology" text,
	"source_id" uuid NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"indicator_code" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"geography" text DEFAULT 'GHA' NOT NULL,
	"value" double precision,
	"estimate_type" "estimate_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"vintage" date NOT NULL,
	CONSTRAINT "observations_natural_key" UNIQUE("indicator_code","period_start","period_end","geography","source_id","vintage"),
	CONSTRAINT "observations_period_ordered" CHECK ("observations"."period_end" > "observations"."period_start")
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"indicator_code" text NOT NULL,
	"administration_slug" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"value" double precision NOT NULL,
	"source_id" uuid NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "context_events" ADD CONSTRAINT "context_events_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_sector_slug_sectors_slug_fk" FOREIGN KEY ("sector_slug") REFERENCES "public"."sectors"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_indicator_code_indicators_code_fk" FOREIGN KEY ("indicator_code") REFERENCES "public"."indicators"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_indicator_code_indicators_code_fk" FOREIGN KEY ("indicator_code") REFERENCES "public"."indicators"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_administration_slug_administrations_slug_fk" FOREIGN KEY ("administration_slug") REFERENCES "public"."administrations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "observations_indicator_vintage_idx" ON "observations" USING btree ("indicator_code","vintage");