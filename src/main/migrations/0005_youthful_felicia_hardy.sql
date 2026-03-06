PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chunks` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`text` text NOT NULL,
	`chunk_index` integer DEFAULT 0 NOT NULL,
	`embedding` BIT_BLOB(1024) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `chunks`;--> statement-breakpoint
ALTER TABLE `__new_chunks` RENAME TO `chunks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_vectors` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`embedding` blob NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_vectors`("id", "text", "embedding") SELECT "id", "text", "embedding" FROM `vectors`;--> statement-breakpoint
DROP TABLE `vectors`;--> statement-breakpoint
ALTER TABLE `__new_vectors` RENAME TO `vectors`;