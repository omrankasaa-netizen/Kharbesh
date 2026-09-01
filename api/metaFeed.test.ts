import { describe, expect, it } from "vitest";
import { buildMetaFeedCsv } from "./metaFeed";
import type { MetaFeedRow } from "./queries/catalog";

function row(overrides: Partial<MetaFeedRow> = {}): MetaFeedRow {
  return {
    id: "1-white",
    title: "Bala 7ob Bala Batikh — White",
    description: "A tee about giving up on love and watermelon at the same time.",
    availability: "in stock",
    condition: "new",
    price: "25.00 USD",
    sale_price: null,
    link: "https://kharbesh961.com/product/1",
    image_link: "https://img.kharbesh961.com/products/a.webp",
    additional_image_link: null,
    brand: "Kharbesh",
    color: "White",
    gender: "unisex",
    age_group: "adult",
    item_group_id: "1",
    product_type: "Tee",
    ...overrides,
  };
}

describe("buildMetaFeedCsv", () => {
  it("emits the Meta-required header row followed by one line per product row", () => {
    const csv = buildMetaFeedCsv([row()]);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe(
      "id,title,description,availability,condition,price,sale_price,link,image_link,additional_image_link,brand,color,gender,age_group,item_group_id,product_type",
    );
    expect(lines[1]).toContain('"1-white"');
    expect(lines[1]).toContain('"25.00 USD"');
    expect(lines).toHaveLength(2);
  });

  it("quotes every field and doubles embedded quotes so commas/quotes in text never break columns", () => {
    const csv = buildMetaFeedCsv([
      row({ title: 'Say "Yalla" — White', description: "Contains, a comma" }),
    ]);
    expect(csv).toContain('"Say ""Yalla"" — White"');
    expect(csv).toContain('"Contains, a comma"');
  });

  it("writes an empty string for null optional fields instead of the literal word null", () => {
    const csv = buildMetaFeedCsv([row({ sale_price: null, additional_image_link: null })]);
    const lines = csv.trim().split("\r\n");
    // sale_price and additional_image_link are both empty quoted fields: ""
    expect(lines[1]).toContain('""');
    expect(lines[1]).not.toContain("null");
  });

  it("returns just the header row (no trailing garbage) when there are no eligible products", () => {
    const csv = buildMetaFeedCsv([]);
    expect(csv.trim().split("\r\n")).toHaveLength(1);
  });
});
