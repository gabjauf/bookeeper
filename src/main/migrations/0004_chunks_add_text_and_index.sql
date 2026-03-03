DROP TABLE IF EXISTS `chunks`;
--> statement-breakpoint
CREATE TABLE `chunks` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`text` text NOT NULL,
	`chunk_index` integer NOT NULL DEFAULT 0,
	`embedding` BLOB NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE no action
);
