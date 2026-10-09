ALTER TABLE "leads_events" ADD COLUMN "venue_rating" double precision;--> statement-breakpoint
ALTER TABLE "leads_events" ADD COLUMN "venue_reviews" integer;--> statement-breakpoint
ALTER TABLE "leads_events" ADD COLUMN "venue_phone" text;--> statement-breakpoint
ALTER TABLE "leads_events" ADD COLUMN "venue_photos" integer;--> statement-breakpoint
ALTER TABLE "leads_events" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "leads_events" ADD COLUMN "price_min_cents" integer;--> statement-breakpoint
ALTER TABLE "leads_events" ADD COLUMN "price_max_cents" integer;--> statement-breakpoint
ALTER TABLE "leads_places" ADD COLUMN "photo_count" integer;--> statement-breakpoint
ALTER TABLE "leads_research" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "leads_research" ADD COLUMN "image_checked_at" timestamp with time zone;