CREATE TYPE "public"."ai_invocation_status" AS ENUM('ok', 'error', 'blocked');--> statement-breakpoint
CREATE TABLE "ai_invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_chars" integer DEFAULT 0 NOT NULL,
	"completion_chars" integer DEFAULT 0 NOT NULL,
	"estimated_cost_micros" integer DEFAULT 0 NOT NULL,
	"status" "ai_invocation_status" DEFAULT 'ok' NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_invocations" ADD CONSTRAINT "ai_invocations_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_changes" ADD CONSTRAINT "sync_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_changes" ADD CONSTRAINT "sync_changes_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_invocations_user_idx" ON "ai_invocations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_invocations_space_idx" ON "ai_invocations" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "ai_invocations_created_idx" ON "ai_invocations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sync_changes_space_idx" ON "sync_changes" USING btree ("space_id","id");--> statement-breakpoint
CREATE INDEX "sync_changes_user_idx" ON "sync_changes" USING btree ("user_id");