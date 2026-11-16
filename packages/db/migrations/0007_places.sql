CREATE TABLE "places" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"animal" text,
	"region_slug" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"about" text NOT NULL,
	"unesco" integer DEFAULT 0 NOT NULL,
	"source_id" uuid NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "region_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_slug" text NOT NULL,
	"product" text NOT NULL,
	"kind" text NOT NULL,
	"rank" text NOT NULL,
	"source_id" uuid NOT NULL,
	"review_status" "review_status" DEFAULT 'draft' NOT NULL,
	"provenance" "provenance" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "region_products_natural_key" UNIQUE("region_slug","product")
);
--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_region_slug_regions_slug_fk" FOREIGN KEY ("region_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_products" ADD CONSTRAINT "region_products_region_slug_regions_slug_fk" FOREIGN KEY ("region_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "region_products" ADD CONSTRAINT "region_products_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;