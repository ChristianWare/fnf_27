CREATE TABLE "prospect_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"prospect_id" text NOT NULL,
	"kind" text NOT NULL,
	"outcome" text,
	"text" text DEFAULT '' NOT NULL,
	"by" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" text PRIMARY KEY NOT NULL,
	"business" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"phone_digits" text,
	"email" text,
	"website" text,
	"domain" text,
	"maps_url" text,
	"city" text,
	"state" text,
	"list" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"rating" double precision,
	"reviews" integer,
	"stage" text DEFAULT 'NEW' NOT NULL,
	"tries" integer DEFAULT 0 NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone,
	"last_called_at" timestamp with time zone,
	"last_outcome" text,
	"client_id" text,
	"audit_id" text,
	"invite_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audits" ADD COLUMN "semrush" jsonb;--> statement-breakpoint
ALTER TABLE "prospect_activity" ADD CONSTRAINT "prospect_activity_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_activity" ADD CONSTRAINT "prospect_activity_by_users_id_fk" FOREIGN KEY ("by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prospect_activity_idx" ON "prospect_activity" USING btree ("prospect_id","at");--> statement-breakpoint
CREATE INDEX "prospect_activity_at_idx" ON "prospect_activity" USING btree ("at");--> statement-breakpoint
CREATE INDEX "prospects_stage_idx" ON "prospects" USING btree ("stage","next_at");--> statement-breakpoint
CREATE INDEX "prospects_phone_idx" ON "prospects" USING btree ("phone_digits");--> statement-breakpoint
CREATE INDEX "prospects_domain_idx" ON "prospects" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "prospects_client_idx" ON "prospects" USING btree ("client_id");--> statement-breakpoint
-- Airports and private aviation is a new kind of account: on for everyone
-- who already has their categories set.
UPDATE "leads_settings" SET "categories" = "categories" || '["AIRPORT"]'::jsonb WHERE jsonb_typeof("categories") = 'array' AND NOT "categories" ? 'AIRPORT';
