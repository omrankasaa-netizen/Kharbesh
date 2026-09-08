ALTER TABLE `factory_order_items` ADD `printFiles` json;--> statement-breakpoint
ALTER TABLE `factory_order_items` ADD `referencePhotoUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `factory_order_items` DROP COLUMN `printFileUrl`;--> statement-breakpoint
ALTER TABLE `factory_order_items` DROP COLUMN `printFileUrl2`;--> statement-breakpoint
ALTER TABLE `products` ADD `printFiles` json;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `printFileUrl`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `printFileUrl2`;
