CREATE TABLE `factory_payments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`amountCents` int NOT NULL,
	`paymentDate` varchar(10) NOT NULL,
	`note` varchar(500),
	`createdByUserId` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `factory_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profit_split_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shares` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profit_split_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `courierName` varchar(120);--> statement-breakpoint
ALTER TABLE `orders` ADD `handedToCourierAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `cashCollectedAt` timestamp;--> statement-breakpoint
CREATE INDEX `factory_payments_date_idx` ON `factory_payments` (`paymentDate`);
