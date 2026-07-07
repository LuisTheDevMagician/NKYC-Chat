ALTER TABLE `users` ADD `public_key` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `wrapped_private_key` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `wrap_iv` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `key_salt` text NOT NULL;