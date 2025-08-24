CREATE TABLE `chunks` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`embedding` F1BIT_BLOB(1024) NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `document` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`extension` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_table_email_unique` ON `users_table` (`email`);--> statement-breakpoint
CREATE TABLE `vectors` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`embedding` F1BIT_BLOB(1024) NOT NULL
);
