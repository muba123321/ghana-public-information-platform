CREATE TABLE "commitment_regions" (
	"commitment_slug" text NOT NULL,
	"region_slug" text NOT NULL,
	CONSTRAINT "commitment_regions_commitment_slug_region_slug_pk" PRIMARY KEY("commitment_slug","region_slug")
);
--> statement-breakpoint
ALTER TABLE "commitments" ADD COLUMN "nationwide" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "commitment_regions" ADD CONSTRAINT "commitment_regions_commitment_slug_commitments_slug_fk" FOREIGN KEY ("commitment_slug") REFERENCES "public"."commitments"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commitment_regions" ADD CONSTRAINT "commitment_regions_region_slug_regions_slug_fk" FOREIGN KEY ("region_slug") REFERENCES "public"."regions"("slug") ON DELETE no action ON UPDATE no action;