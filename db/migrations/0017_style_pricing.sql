ALTER TABLE `garment_styles` ADD `fixedPriceCents` int;--> statement-breakpoint
ALTER TABLE `garment_styles` ADD `factoryCostCents` int;--> statement-breakpoint
-- Cross-garment pricing (owner-set): buying any design on an Autumn Hoodie
-- costs $38 (factory cost $16); on a Fleeced Winter Hoodie $45 (cost $20).
UPDATE `garment_styles` SET `fixedPriceCents` = 3800, `factoryCostCents` = 1600 WHERE `nameEn` LIKE '%Autumn%';--> statement-breakpoint
UPDATE `garment_styles` SET `fixedPriceCents` = 4500, `factoryCostCents` = 2000 WHERE `nameEn` LIKE '%Fleeced%' OR `nameEn` LIKE '%Fleece%';
