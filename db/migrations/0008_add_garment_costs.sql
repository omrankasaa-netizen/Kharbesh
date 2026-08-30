CREATE TABLE `garment_costs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`productType` varchar(40) NOT NULL,
	`label` varchar(80),
	`costCents` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `garment_costs_id` PRIMARY KEY(`id`),
	CONSTRAINT `garment_costs_type_idx` UNIQUE(`productType`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `status` enum('order_received','preorder_confirmed','in_production','being_printed','preparing_shipment','on_the_way','delivered','needs_attention','cancelled') NOT NULL DEFAULT 'order_received';