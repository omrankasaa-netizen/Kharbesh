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
