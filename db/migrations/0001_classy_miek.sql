CREATE TABLE `blank_stock` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`productType` enum('tee','hoodie','accessory') NOT NULL,
	`color` varchar(80) NOT NULL,
	`size` varchar(20) NOT NULL,
	`quantityOnHand` int NOT NULL DEFAULT 0,
	`lowStockThreshold` int NOT NULL DEFAULT 2,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blank_stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `blank_stock_variant_idx` UNIQUE(`productType`,`color`,`size`)
);
--> statement-breakpoint
CREATE TABLE `factory_order_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`factoryOrderId` bigint unsigned NOT NULL,
	`sourceOrderId` bigint unsigned,
	`sourceOrderNumber` varchar(32),
	`productId` bigint unsigned,
	`designNameEn` varchar(180),
	`phraseEn` varchar(255),
	`productType` enum('tee','hoodie','accessory') NOT NULL,
	`color` varchar(80) NOT NULL,
	`size` varchar(20) NOT NULL,
	`quantity` int NOT NULL,
	`placement` varchar(180),
	`notes` varchar(500),
	CONSTRAINT `factory_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `factory_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`type` enum('print_job','restock') NOT NULL,
	`status` enum('draft','sent','fulfilled','cancelled') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdByUserId` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`fulfilledAt` timestamp,
	CONSTRAINT `factory_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `overhead_expenses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`category` varchar(120) NOT NULL,
	`description` varchar(500),
	`amountCents` int NOT NULL,
	`expenseDate` varchar(10) NOT NULL,
	`createdByUserId` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `overhead_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_roles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(160),
	`role` enum('staff','admin','super_admin') NOT NULL,
	`addedByUserId` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_roles_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`stockId` bigint unsigned NOT NULL,
	`type` enum('restock','consumed','adjustment') NOT NULL,
	`quantityDelta` int NOT NULL,
	`note` varchar(500),
	`actorUserId` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unit_cost_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`blankTeeCostCents` int NOT NULL DEFAULT 0,
	`printFeeCents` int NOT NULL DEFAULT 0,
	`packagingCostCents` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unit_cost_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','staff','admin','super_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `factory_order_items` ADD CONSTRAINT `factory_order_items_factoryOrderId_factory_orders_id_fk` FOREIGN KEY (`factoryOrderId`) REFERENCES `factory_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_stockId_blank_stock_id_fk` FOREIGN KEY (`stockId`) REFERENCES `blank_stock`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `factory_order_items_order_idx` ON `factory_order_items` (`factoryOrderId`);--> statement-breakpoint
CREATE INDEX `overhead_expenses_date_idx` ON `overhead_expenses` (`expenseDate`);--> statement-breakpoint
CREATE INDEX `stock_movements_stock_idx` ON `stock_movements` (`stockId`);