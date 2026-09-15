-- 3a Zaw2ak custom requests: customers can ask for the regular or oversize
-- cut when the garment is a tee. Nullable so legacy requests stay untouched
-- (treat absent as "regular", matching the storefront default).
ALTER TABLE `custom_requests` ADD `fit` enum('regular','oversize') AFTER `garment`;
