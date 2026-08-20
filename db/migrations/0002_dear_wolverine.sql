CREATE TABLE `campaigns` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`titleEn` varchar(200) NOT NULL,
	`titleAr` varchar(200),
	`subtitleEn` varchar(300),
	`subtitleAr` varchar(300),
	`ctaLabelEn` varchar(80),
	`ctaLabelAr` varchar(80),
	`linkUrl` varchar(255),
	`promoCodeId` bigint unsigned,
	`discountId` bigint unsigned,
	`active` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp,
	`expiresAt` timestamp,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(160) NOT NULL,
	`nameAr` varchar(160),
	`type` enum('percent','fixed') NOT NULL,
	`value` int NOT NULL,
	`appliesTo` enum('all','product_type','collection') NOT NULL DEFAULT 'all',
	`appliesValue` varchar(160),
	`active` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_color_images` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`productId` bigint unsigned NOT NULL,
	`colorName` varchar(80) NOT NULL,
	`images` json NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_color_images_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_color_images_variant_idx` UNIQUE(`productId`,`colorName`)
);
--> statement-breakpoint
CREATE TABLE `promo_codes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`type` enum('percent','fixed') NOT NULL,
	`value` int NOT NULL,
	`minOrderCents` int,
	`maxUses` int,
	`usesCount` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp,
	`expiresAt` timestamp,
	`createdByUserId` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promo_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `promo_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `discountCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `promoCode` varchar(40);--> statement-breakpoint
ALTER TABLE `orders` ADD `appliedDiscounts` json;--> statement-breakpoint
ALTER TABLE `products` ADD `costPriceCents` int;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_promoCodeId_promo_codes_id_fk` FOREIGN KEY (`promoCodeId`) REFERENCES `promo_codes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_discountId_discounts_id_fk` FOREIGN KEY (`discountId`) REFERENCES `discounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_color_images` ADD CONSTRAINT `product_color_images_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_color_images_product_idx` ON `product_color_images` (`productId`);