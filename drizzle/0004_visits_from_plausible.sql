CREATE TABLE "visit_channels" (
	"client_id" text NOT NULL,
	"day" date NOT NULL,
	"channel" text NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "visit_channels_client_id_day_channel_pk" PRIMARY KEY("client_id","day","channel")
);
--> statement-breakpoint
CREATE TABLE "visit_days" (
	"client_id" text NOT NULL,
	"day" date NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "visit_days_client_id_day_pk" PRIMARY KEY("client_id","day")
);
--> statement-breakpoint
CREATE TABLE "visit_pages" (
	"client_id" text NOT NULL,
	"day" date NOT NULL,
	"page" text NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "visit_pages_client_id_day_page_pk" PRIMARY KEY("client_id","day","page")
);
--> statement-breakpoint
CREATE TABLE "visit_sources" (
	"client_id" text NOT NULL,
	"day" date NOT NULL,
	"source" text NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "visit_sources_client_id_day_source_pk" PRIMARY KEY("client_id","day","source")
);
--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "plausible_site" text;--> statement-breakpoint
ALTER TABLE "visit_channels" ADD CONSTRAINT "visit_channels_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_days" ADD CONSTRAINT "visit_days_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_pages" ADD CONSTRAINT "visit_pages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sources" ADD CONSTRAINT "visit_sources_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;