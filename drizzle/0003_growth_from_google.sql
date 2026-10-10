CREATE TABLE "review_days" (
	"client_id" text NOT NULL,
	"day" date NOT NULL,
	"rating" double precision,
	"reviews" integer DEFAULT 0 NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"address" text,
	CONSTRAINT "review_days_client_id_day_pk" PRIMARY KEY("client_id","day")
);
--> statement-breakpoint
CREATE TABLE "traffic_days" (
	"client_id" text NOT NULL,
	"day" date NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "traffic_days_client_id_day_pk" PRIMARY KEY("client_id","day")
);
--> statement-breakpoint
CREATE TABLE "traffic_queries" (
	"client_id" text NOT NULL,
	"day" date NOT NULL,
	"query" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "traffic_queries_client_id_day_query_pk" PRIMARY KEY("client_id","day","query")
);
--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "search_console_site" text;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "google_place_id" text;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "growth_sync" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "review_days" ADD CONSTRAINT "review_days_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_days" ADD CONSTRAINT "traffic_days_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_queries" ADD CONSTRAINT "traffic_queries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;