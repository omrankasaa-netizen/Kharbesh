-- Hoodie blanks now come in two types: a lighter Autumn hoodie and a
-- fleeced Winter hoodie. Both join the garment-style catalog so staff can
-- assign them to hoodie products (and customers can pick them in 3a Zaw2ak
-- custom requests). INSERT IGNORE keeps this idempotent — safe to replay
-- and safe if a style was already added by hand from the admin panel.
-- priceModifierCents stays 0 until the owner keys in the real modifier.
INSERT IGNORE INTO `garment_styles` (`nameEn`, `nameAr`, `priceModifierCents`, `sizes`, `sortOrder`) VALUES
  ('Autumn Hoodie', 'هودي خريفي', 0, '["S","M","L","XL","XXL"]', 4);--> statement-breakpoint
INSERT IGNORE INTO `garment_styles` (`nameEn`, `nameAr`, `priceModifierCents`, `sizes`, `sortOrder`) VALUES
  ('Fleeced Winter Hoodie', 'هودي شتوي مبطّن', 0, '["S","M","L","XL","XXL"]', 5);
