import { describe, expect, it } from "vitest";
import { createOrderSchema } from "./order-router";
import { customProjectSchema } from "./custom-request-router";

describe("commerce input validation", () => {
  it("accepts a valid storefront order", () => {
    const parsed = createOrderSchema.parse({
      email: "customer@example.com",
      phone: "+96170123456",
      fullName: "Kharbesh Customer",
      shippingAddress: "Main street, building 2, floor 3",
      city: "Beirut",
      country: "Lebanon",
      language: "en",
      paymentMethod: "cash_on_delivery",
      items: [{ productId: "1", size: "M", color: "Black", quantity: 2 }],
    });

    expect(parsed.items[0].quantity).toBe(2);
    expect(parsed.language).toBe("en");
  });

  it("rejects invalid order email and unsafe quantity", () => {
    expect(() =>
      createOrderSchema.parse({
        email: "not-an-email",
        phone: "+96170123456",
        fullName: "Kharbesh Customer",
        shippingAddress: "Main street",
        city: "Beirut",
        country: "Lebanon",
        items: [{ productId: "1", size: "M", color: "Black", quantity: 100 }],
      }),
    ).toThrow();
  });

  it("rejects non-numeric product ids", () => {
    expect(() =>
      createOrderSchema.parse({
        email: "customer@example.com",
        phone: "+96170123456",
        fullName: "Kharbesh Customer",
        shippingAddress: "Main street",
        city: "Beirut",
        country: "Lebanon",
        items: [{ productId: "abc", size: "M", color: "Black", quantity: 1 }],
      }),
    ).toThrow();
  });

  it("rejects orders with non-E.164 phone numbers", () => {
    for (const phone of ["70123456", "+961 70 123 456", "+0123", "+96170123456789012345"]) {
      expect(() =>
        createOrderSchema.parse({
          email: "customer@example.com",
          phone,
          fullName: "Kharbesh Customer",
          shippingAddress: "Main street",
          city: "Beirut",
          country: "Lebanon",
          items: [{ productId: "1", size: "M", color: "Black", quantity: 1 }],
        }),
      ).toThrow();
    }
  });

  it("accepts custom projects with no phone or an E.164 phone, rejects bad ones", () => {
    const base = {
      name: "Kharbesh Customer",
      email: "customer@example.com",
      phrase: "تمرين ابن Carb",
      rights_confirmed: true,
    };
    expect(customProjectSchema.parse(base).phone).toBeUndefined();
    expect(customProjectSchema.parse({ ...base, phone: "+971501234567" }).phone).toBe("+971501234567");
    expect(() => customProjectSchema.parse({ ...base, phone: "0501234567" })).toThrow();
  });

  it("accepts a custom project with rights confirmed", () => {
    const parsed = customProjectSchema.parse({
      name: "Kharbesh Customer",
      email: "customer@example.com",
      phone: "+96170123456",
      phrase: "تمرين ابن Carb",
      story: "For my brother who never skips carb day.",
      language: "ar",
      tone: "sarcastic",
      garment: "Oversized Tee",
      color: "Black",
      size: "L",
      quantity: 1,
      rights_confirmed: true,
    });

    expect(parsed.language).toBe("ar");
    expect(parsed.quantity).toBe(1);
  });

  it("accepts image/PDF data-URL reference files and rejects other payloads", () => {
    const base = {
      name: "Kharbesh Customer",
      email: "customer@example.com",
      phrase: "تمرين ابن Carb",
      rights_confirmed: true,
    };
    const png = `data:image/png;base64,${"A".repeat(64)}`;
    const pdf = `data:application/pdf;base64,${"B".repeat(64)}`;
    expect(customProjectSchema.parse({ ...base, reference_files: [png, pdf] }).reference_files).toHaveLength(2);

    // SVG, plain URLs, raw base64 and HTML payloads must all be rejected.
    for (const bad of [
      `data:image/svg+xml;base64,${"A".repeat(64)}`,
      "https://cdn.example.com/artwork.png",
      "A".repeat(64),
      "data:text/html;base64,PHNjcmlwdD4=",
      `data:image/png;base64,${"A".repeat(63)}!!!`,
    ]) {
      expect(() => customProjectSchema.parse({ ...base, reference_files: [bad] })).toThrow();
    }
  });

  it("caps reference files at 4 entries and 4M chars combined", () => {
    const base = {
      name: "Kharbesh Customer",
      email: "customer@example.com",
      phrase: "تمرين ابن Carb",
      rights_confirmed: true,
    };
    const file = `data:image/png;base64,${"A".repeat(1_500_000)}`;
    expect(() => customProjectSchema.parse({ ...base, reference_files: [file, file, file, file, file] })).toThrow();
    expect(() => customProjectSchema.parse({ ...base, reference_files: [file, file, file] })).toThrow(); // 3 × 1.5M+ > 4M total
    expect(customProjectSchema.parse({ ...base, reference_files: [file, file] }).reference_files).toHaveLength(2);
  });

  it("accepts the checkout honeypot field only when short (bots get fake success server-side)", () => {
    const order = {
      email: "customer@example.com",
      phone: "+96170123456",
      fullName: "Kharbesh Customer",
      shippingAddress: "Main street",
      city: "Beirut",
      country: "Lebanon",
      paymentMethod: "cash_on_delivery",
      items: [{ productId: "1", size: "M", color: "Black", quantity: 1 }],
    };
    expect(createOrderSchema.parse({ ...order, company: "" }).company).toBe("");
    expect(createOrderSchema.parse({ ...order, company: "Bot Industries" }).company).toBe("Bot Industries");
    expect(() => createOrderSchema.parse({ ...order, company: "x".repeat(201) })).toThrow();
  });

  it("rejects custom projects without rights confirmation or phrase", () => {
    expect(() =>
      customProjectSchema.parse({
        name: "Kharbesh Customer",
        email: "customer@example.com",
        phrase: "تمرين ابن Carb",
        rights_confirmed: false,
      }),
    ).toThrow();

    expect(() =>
      customProjectSchema.parse({
        name: "Kharbesh Customer",
        email: "customer@example.com",
        phrase: "",
        rights_confirmed: true,
      }),
    ).toThrow();
  });
});
