CREATE TYPE "public"."source_type" AS ENUM('manga', 'light_novel', 'original', 'game', 'visual_novel', 'novel', 'web_manga', 'web_novel', 'other', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."title_status" AS ENUM('ongoing', 'finished', 'upcoming');--> statement-breakpoint
CREATE TYPE "public"."title_type" AS ENUM('anime', 'manga', 'manhwa', 'donghua', 'light_novel', 'movie', 'ova', 'special', 'ona', 'music');--> statement-breakpoint
CREATE TABLE "mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" integer NOT NULL,
	"episode" numeric NOT NULL,
	"chapter" numeric,
	"is_filler" boolean DEFAULT false,
	"is_canon" boolean DEFAULT true,
	"source_type" "source_type" DEFAULT 'manga',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" integer PRIMARY KEY NOT NULL,
	"slug" varchar(500) NOT NULL,
	"name" varchar(500) NOT NULL,
	"name_japanese" varchar(500),
	"type" "title_type" NOT NULL,
	"image" varchar(1000),
	"status" "title_status" DEFAULT 'ongoing',
	"synopsis" varchar(5000),
	"episodes" integer,
	"score" varchar(10),
	"source" varchar(100),
	"related" jsonb,
	"top_rank" integer,
	"featured_updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "titles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "mappings" ADD CONSTRAINT "mappings_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE no action ON UPDATE no action;