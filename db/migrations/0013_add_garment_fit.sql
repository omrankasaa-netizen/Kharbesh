ALTER TABLE `blank_stock` ADD `fit` enum('regular','oversize') NOT NULL DEFAULT 'regular' AFTER `color`;--> statement-breakpoint
-- Consolidate existing tee blank stock into the internal size groups the
-- factory actually cuts: S+M merge into one "S/M" blank, L+XL into "L/XL"
-- (quantities summed, threshold = the stricter of the pair). XXL rows are
-- already 1:1 with the internal size, so they stay untouched. All existing
-- stock is the regular cut — oversize stock starts empty by design.
INSERT INTO `blank_stock` (`productType`,`color`,`fit`,`size`,`quantityOnHand`,`lowStockThreshold`,`createdAt`,`updatedAt`)
	SELECT `productType`,`color`,'regular','S/M',SUM(`quantityOnHand`),MAX(`lowStockThreshold`),NOW(),NOW()
	FROM `blank_stock`
	WHERE `productType`='tee' AND `size` IN ('S','M')
	GROUP BY `productType`,`color`;--> statement-breakpoint
INSERT INTO `blank_stock` (`productType`,`color`,`fit`,`size`,`quantityOnHand`,`lowStockThreshold`,`createdAt`,`updatedAt`)
	SELECT `productType`,`color`,'regular','L/XL',SUM(`quantityOnHand`),MAX(`lowStockThreshold`),NOW(),NOW()
	FROM `blank_stock`
	WHERE `productType`='tee' AND `size` IN ('L','XL')
	GROUP BY `productType`,`color`;--> statement-breakpoint
DELETE FROM `blank_stock` WHERE `productType`='tee' AND `size` IN ('S','M','L','XL');--> statement-breakpoint
ALTER TABLE `blank_stock` DROP INDEX `blank_stock_variant_idx`;--> statement-breakpoint
ALTER TABLE `blank_stock` ADD UNIQUE INDEX `blank_stock_variant_idx`(`productType`,`color`,`fit`,`size`);--> statement-breakpoint
ALTER TABLE `factory_order_items` ADD `fit` enum('regular','oversize') NOT NULL DEFAULT 'regular' AFTER `color`;--> statement-breakpoint
ALTER TABLE `factory_order_items` ADD `displaySize` varchar(20) AFTER `size`;