DELETE FROM chunks;--> statement-breakpoint
ALTER TABLE `chunks` ADD `page` integer NOT NULL DEFAULT 1;
