CREATE TYPE "public"."calendar_recurrence" AS ENUM('none', 'daily', 'weekly');--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'Asia/Shanghai' NOT NULL,
	"quiet_start_hour" integer DEFAULT 22 NOT NULL,
	"quiet_end_hour" integer DEFAULT 8 NOT NULL,
	"digest_hour" integer DEFAULT 20 NOT NULL,
	"digest_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "recurrence" "calendar_recurrence" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "recurrence_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "reminder_minutes" integer;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;