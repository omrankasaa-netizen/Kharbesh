CREATE TABLE `contact_messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`message` text NOT NULL,
	`status` enum('new','read','archived') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `factory_order_items` ADD `customerName` varchar(160);--> statement-breakpoint
ALTER TABLE `factory_order_items` ADD `customerPhone` varchar(40);--> statement-breakpoint
ALTER TABLE `factory_order_items` ADD `customerAddress` varchar(255);--> statement-breakpoint
ALTER TABLE `factory_order_items` ADD `printFileUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `products` ADD `printFileUrl` varchar(500);