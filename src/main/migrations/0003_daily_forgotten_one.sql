CREATE TABLE `sync_state` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`last_sync` text,
	`device_id` text NOT NULL,
	`remote_path` text DEFAULT 'bookeeper' NOT NULL,
	`sync_version` integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE `document` ADD COLUMN `created_at` text;--> statement-breakpoint
ALTER TABLE `document` ADD COLUMN `updated_at` text;--> statement-breakpoint
ALTER TABLE `document` ADD COLUMN `device_id` text;--> statement-breakpoint
ALTER TABLE `document` ADD COLUMN `sync_version` integer;