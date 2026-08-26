CREATE TABLE `loyalty_accounts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`tier` enum('new_kharboush','kharboush_khebra','kharboush_aslee') NOT NULL DEFAULT 'new_kharboush',
	`lifetimeSpentCents` int NOT NULL DEFAULT 0,
	`freeShippingCredits` int NOT NULL DEFAULT 1,
	`tierLockedByAdmin` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyalty_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `loyaltyTierAtOrder` enum('new_kharboush','kharboush_khebra','kharboush_aslee');--> statement-breakpoint
ALTER TABLE `orders` ADD `loyaltyDiscountCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `freeShippingFromLoyalty` boolean DEFAULT false NOT NULL;