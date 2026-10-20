CREATE TYPE "public"."question_kind" AS ENUM('short_answer', 'single_choice');--> statement-breakpoint
CREATE TABLE "question_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"answer" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"course_id" uuid,
	"prompt" text NOT NULL,
	"answer" text NOT NULL,
	"explanation" text,
	"kind" "question_kind" DEFAULT 'short_answer' NOT NULL,
	"options" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"question_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"ease" integer DEFAULT 250 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_items_question_id_user_id_pk" PRIMARY KEY("question_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_question_idx" ON "question_attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_user_idx" ON "question_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "questions_space_idx" ON "questions" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "questions_course_idx" ON "questions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "review_due_idx" ON "review_items" USING btree ("due_at");