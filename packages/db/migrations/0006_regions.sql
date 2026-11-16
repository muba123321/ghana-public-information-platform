CREATE TYPE "public"."indicator_scope" AS ENUM('national', 'regional');--> statement-breakpoint
CREATE TABLE "region_lineage" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_slug" text NOT NULL,
	"to_slug" text NOT NULL,
	"effective_on" date NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "region_lineage_pair" UNIQUE("from_slug","to_slug")
);
--> statement-breakpoint
CREATE TABLE "region_observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"indicator_code" text NOT NULL,
	"region_slug" text NOT NULL,
	"measured_for_region_slug" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"value" double precision,
	"estimate_type" "estimate_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"vintage" date NOT NULL,
	CONSTRAINT "region_observations_natural_key" UNIQUE("indicator_code","measured_for_region_slug","period_start","source_id","vintage"),
	CONSTRAINT "region_observations_period_ordered" CHECK ("region_observations"."period_end" > "region_observations"."period_start")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"capital" text,
	"valid_from" date,
	"valid_to" date,
	"display_order" integer NOT NULL,
	"source_id" uuid NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "scope" "indicator_scope" DEFAULT 'national' NOT NULL;--> statement-breakpoint
ALTER TABLE "region_lineage" ADD CONSTRAINT "region_lineage_from_slug_regions_slug_fk" FOREIGN KEY ("from_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_lineage" ADD CONSTRAINT "region_lineage_to_slug_regions_slug_fk" FOREIGN KEY ("to_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_lineage" ADD CONSTRAINT "region_lineage_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_observations" ADD CONSTRAINT "region_observations_indicator_code_indicators_code_fk" FOREIGN KEY ("indicator_code") REFERENCES "public"."indicators"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_observations" ADD CONSTRAINT "region_observations_region_slug_regions_slug_fk" FOREIGN KEY ("region_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_observations" ADD CONSTRAINT "region_observations_measured_for_region_slug_regions_slug_fk" FOREIGN KEY ("measured_for_region_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_observations" ADD CONSTRAINT "region_observations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "region_observations_region_idx" ON "region_observations" USING btree ("region_slug","indicator_code");