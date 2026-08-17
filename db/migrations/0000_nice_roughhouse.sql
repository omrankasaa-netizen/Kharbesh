CREATE TABLE `audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`actorUserId` bigint unsigned,
	`action` varchar(120) NOT NULL,
	`entity` varchar(60) NOT NULL,
	`entityId` varchar(60),
	`detail` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(160) NOT NULL,
	`nameAr` varchar(160),
	`slug` varchar(160) NOT NULL,
	`descriptionEn` text,
	`descriptionAr` text,
	`accent` varchar(20),
	`coverImage` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `custom_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned,
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40),
	`phrase` varchar(500) NOT NULL,
	`story` text,
	`language` varchar(60),
	`recipient` varchar(120),
	`occasion` varchar(200),
	`tone` enum('subtle','bold','sarcastic','clean','colorful') DEFAULT 'subtle',
	`garment` varchar(120),
	`color` varchar(80),
	`size` varchar(20),
	`quantity` int NOT NULL DEFAULT 1,
	`placement` varchar(120),
	`neededBy` varchar(40),
	`notes` text,
	`referenceFiles` json,
	`rightsConfirmed` boolean NOT NULL DEFAULT false,
	`status` enum('new_request','review','quote_sent','deposit_paid','designing','customer_review','revision','approved','balance_due','production','shipped','closed') NOT NULL DEFAULT 'new_request',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `custom_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `garment_colors` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(80) NOT NULL,
	`nameAr` varchar(80),
	`hex` varchar(9) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `garment_colors_id` PRIMARY KEY(`id`),
	CONSTRAINT `garment_colors_nameEn_unique` UNIQUE(`nameEn`)
);
--> statement-breakpoint
CREATE TABLE `garment_styles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(120) NOT NULL,
	`nameAr` varchar(120),
	`priceModifierCents` int NOT NULL DEFAULT 0,
	`sizes` json NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `garment_styles_id` PRIMARY KEY(`id`),
	CONSTRAINT `garment_styles_nameEn_unique` UNIQUE(`nameEn`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`userId` bigint unsigned,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`shippingAddress` varchar(255) NOT NULL,
	`city` varchar(120) NOT NULL,
	`country` varchar(120) NOT NULL,
	`notes` text,
	`items` json NOT NULL,
	`subtotalCents` int NOT NULL,
	`shippingCents` int NOT NULL DEFAULT 0,
	`totalCents` int NOT NULL,
	`status` enum('order_received','preorder_confirmed','in_production','being_printed','preparing_shipment','on_the_way','delivered','needs_attention') NOT NULL DEFAULT 'order_received',
	`internalStatus` varchar(60) NOT NULL DEFAULT 'payment_pending',
	`language` enum('en','ar') NOT NULL DEFAULT 'en',
	`isGuest` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(180) NOT NULL,
	`nameAr` varchar(180),
	`phraseAr` varchar(255),
	`phraseEn` varchar(255),
	`payoffEn` varchar(255),
	`descriptionEn` text,
	`descriptionAr` text,
	`collectionName` varchar(160),
	`mood` varchar(120),
	`productType` enum('tee','hoodie','accessory') NOT NULL,
	`garmentStyle` varchar(120),
	`fitEn` varchar(180),
	`careEn` text,
	`careAr` text,
	`measurementsEn` text,
	`approvedColors` json NOT NULL,
	`sizes` json NOT NULL,
	`placement` varchar(180),
	`priceCents` int NOT NULL,
	`compareAtPriceCents` int,
	`images` json NOT NULL,
	`status` enum('active','draft','archived') NOT NULL DEFAULT 'draft',
	`preorderType` enum('open_until','quantity_target','limited_quantity','always_on') NOT NULL DEFAULT 'always_on',
	`preorderCloseDate` varchar(10),
	`preorderCapacity` int,
	`unitsSold` int NOT NULL DEFAULT 0,
	`estimatedProductionDays` int NOT NULL DEFAULT 10,
	`estimatedDispatchWindow` varchar(120),
	`dropName` varchar(160),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`key` varchar(120) NOT NULL,
	`value` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`unionId` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`avatar` text,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignInAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_unionId_unique` UNIQUE(`unionId`)
);
--> statement-breakpoint
ALTER TABLE `custom_requests` ADD CONSTRAINT `custom_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `orders_email_idx` ON `orders` (`email`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_collection_idx` ON `products` (`collectionName`);