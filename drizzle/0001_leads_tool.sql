CREATE TABLE "leads_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"target_id" text NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads_drives" (
	"from_key" text NOT NULL,
	"target_id" text NOT NULL,
	"minutes" integer NOT NULL,
	"miles" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_drives_from_key_target_id_pk" PRIMARY KEY("from_key","target_id")
);
--> statement-breakpoint
CREATE TABLE "leads_events" (
	"id" text PRIMARY KEY NOT NULL,
	"market_id" text NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"venue" text DEFAULT '' NOT NULL,
	"address" text,
	"city" text DEFAULT '' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"geo_from_google_at" timestamp with time zone,
	"venue_place_id" text,
	"organizer" text DEFAULT '' NOT NULL,
	"organizer_url" text,
	"url" text,
	"guests" integer,
	"phone" text,
	"description" text,
	"found_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads_markets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"radius_miles" integer DEFAULT 75 NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"first_loaded_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads_places" (
	"id" text PRIMARY KEY NOT NULL,
	"market_id" text NOT NULL,
	"category" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"address" text,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"rating" double precision,
	"reviews" integer,
	"phone" text,
	"website" text,
	"types" jsonb,
	"details_at" timestamp with time zone,
	"closed" boolean DEFAULT false NOT NULL,
	"news" jsonb
);
--> statement-breakpoint
CREATE TABLE "leads_research" (
	"key" text PRIMARY KEY NOT NULL,
	"domain" text,
	"car_service" text,
	"car_service_note" text,
	"brief" text,
	"checked_at" timestamp with time zone,
	"contact" jsonb,
	"contact_checked_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "leads_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"market_id" text NOT NULL,
	"day" text NOT NULL,
	"trigger" text NOT NULL,
	"status" text DEFAULT 'RUNNING' NOT NULL,
	"cursor" jsonb DEFAULT '{"done":[]}'::jsonb NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"locked_until" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leads_saved" (
	"client_id" text NOT NULL,
	"target_id" text NOT NULL,
	"kind" text NOT NULL,
	"stage" text DEFAULT 'NEW' NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"remind_at" timestamp with time zone,
	"value_cents" integer,
	"per" text,
	"won_at" timestamp with time zone,
	"scripts" jsonb,
	"scripts_at" timestamp with time zone,
	"rewrites" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_saved_client_id_target_id_pk" PRIMARY KEY("client_id","target_id")
);
--> statement-breakpoint
CREATE TABLE "leads_settings" (
	"client_id" text PRIMARY KEY NOT NULL,
	"base_city" text NOT NULL,
	"base_lat" double precision NOT NULL,
	"base_lng" double precision NOT NULL,
	"radius" integer DEFAULT 50 NOT NULL,
	"categories" jsonb NOT NULL,
	"event_types" jsonb NOT NULL,
	"operator" jsonb NOT NULL,
	"market_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"market_id" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"source" text NOT NULL,
	"event_type" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_count" integer,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads_usage" (
	"day" text NOT NULL,
	"client_id" text DEFAULT '' NOT NULL,
	"market_id" text DEFAULT '' NOT NULL,
	"api" text NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "leads_usage_day_client_id_market_id_api_pk" PRIMARY KEY("day","client_id","market_id","api")
);
--> statement-breakpoint
CREATE TABLE "leads_venues" (
	"key" text PRIMARY KEY NOT NULL,
	"place_id" text,
	"last_looked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sent_notices" (
	"key" text PRIMARY KEY NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "leads_next_billing_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "leads_ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "leads_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "leads_activity" ADD CONSTRAINT "leads_activity_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_events" ADD CONSTRAINT "leads_events_market_id_leads_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."leads_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_places" ADD CONSTRAINT "leads_places_market_id_leads_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."leads_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_runs" ADD CONSTRAINT "leads_runs_market_id_leads_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."leads_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_saved" ADD CONSTRAINT "leads_saved_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_settings" ADD CONSTRAINT "leads_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_settings" ADD CONSTRAINT "leads_settings_market_id_leads_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."leads_markets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads_sources" ADD CONSTRAINT "leads_sources_market_id_leads_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."leads_markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_activity_lead_idx" ON "leads_activity" USING btree ("client_id","target_id");--> statement-breakpoint
CREATE INDEX "leads_events_market_idx" ON "leads_events" USING btree ("market_id","starts_at");--> statement-breakpoint
CREATE INDEX "leads_places_market_idx" ON "leads_places" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "leads_places_details_idx" ON "leads_places" USING btree ("details_at");--> statement-breakpoint
CREATE INDEX "leads_runs_market_idx" ON "leads_runs" USING btree ("market_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_runs_one_running_idx" ON "leads_runs" USING btree ("market_id") WHERE "leads_runs"."status" = 'RUNNING';--> statement-breakpoint
CREATE INDEX "leads_sources_market_idx" ON "leads_sources" USING btree ("market_id");--> statement-breakpoint
-- Full Platform clients already here start with the Leads Tool switched off,
-- until their market's first run is in. Switch them on in Admin → Leads Tool.
UPDATE "clients" SET "leads_enabled" = false WHERE "id" IN (SELECT "client_id" FROM "websites" WHERE "plan" = 'FULL_PLATFORM');--> statement-breakpoint
-- The first market, and the Phoenix-area calendars to start from. Test each
-- one in Admin → Leads Tool; turn off any that find nothing.
INSERT INTO "leads_markets" ("id", "name", "city", "state", "lat", "lng", "radius_miles") VALUES ('phoenix', 'Phoenix area', 'Phoenix', 'AZ', 33.4484, -112.074, 75) ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "leads_sources" ("id", "market_id", "label", "url", "source", "event_type") VALUES
  ('src_scottsdale_tourism', 'phoenix', 'Experience Scottsdale', 'https://www.experiencescottsdale.com/event/rss/', 'TOURISM', NULL),
  ('src_phoenix_tourism', 'phoenix', 'Visit Phoenix', 'https://www.visitphoenix.com/event/rss/', 'TOURISM', NULL),
  ('src_mesa_tourism', 'phoenix', 'Visit Mesa', 'https://www.visitmesa.com/event/rss/', 'TOURISM', NULL),
  ('src_phoenix_chamber', 'phoenix', 'Greater Phoenix Chamber', 'https://business.phoenixchamber.com/events/calendar/', 'CHAMBER', NULL),
  ('src_scottsdale_chamber', 'phoenix', 'Scottsdale Area Chamber', 'https://business.scottsdalechamber.com/events/calendar', 'CHAMBER', NULL),
  ('src_asu', 'phoenix', 'ASU Events', 'https://asuevents.asu.edu/', 'UNIVERSITY', NULL),
  ('src_phoenix_cc', 'phoenix', 'Phoenix Convention Center', 'https://www.phoenixconventioncenter.com/events', 'CONVENTION', 'CONFERENCE'),
  ('src_westworld', 'phoenix', 'WestWorld of Scottsdale', 'https://www.scottsdaleaz.gov/westworld/events', 'CONVENTION', NULL)
ON CONFLICT DO NOTHING;
