CREATE TABLE "audit_searches" (
	"key" text PRIMARY KEY NOT NULL,
	"location" text NOT NULL,
	"searches" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"input" text NOT NULL,
	"url" text,
	"domain" text,
	"business" text,
	"city" text,
	"state" text,
	"place_id" text,
	"listing" jsonb,
	"no_listing" text,
	"candidates" jsonb,
	"steps" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"searches" jsonb,
	"rivals" jsonb,
	"facts" jsonb,
	"phone_shot" text,
	"score" integer,
	"rules" integer DEFAULT 1 NOT NULL,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	"error" text,
	"name" text,
	"email" text,
	"unlocked_at" timestamp with time zone,
	"emails_sent" integer DEFAULT 0 NOT NULL,
	"follow_up" text DEFAULT 'NEW' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"ran_by" text,
	"reused_from" text,
	"google_cleared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_ran_by_users_id_fk" FOREIGN KEY ("ran_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audits_created_idx" ON "audits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audits_domain_idx" ON "audits" USING btree ("domain","created_at");--> statement-breakpoint
CREATE INDEX "audits_place_idx" ON "audits" USING btree ("place_id","created_at");