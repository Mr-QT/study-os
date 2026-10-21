CREATE TYPE "public"."import_item_status" AS ENUM('pending', 'created', 'skipped', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_kind" AS ENUM('tasks', 'questions');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('previewed', 'committed', 'rolled_back');--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "import_kind" NOT NULL,
	"filename" text NOT NULL,
	"status" "import_status" DEFAULT 'previewed' NOT NULL,
	"raw_csv" text NOT NULL,
	"sha256" text NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone,
	"rolled_back_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"status" "import_item_status" DEFAULT 'pending' NOT NULL,
	"entity_id" uuid,
	"payload" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batches_space_idx" ON "import_batches" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "import_items_batch_idx" ON "import_items" USING btree ("batch_id");