CREATE TYPE "public"."rag_source" AS ENUM('note', 'question');--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"source_type" "rag_source" NOT NULL,
	"source_id" uuid NOT NULL,
	"chunk_index" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"embedding" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_space_idx" ON "knowledge_chunks" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "chunks_source_idx" ON "knowledge_chunks" USING btree ("source_type","source_id");