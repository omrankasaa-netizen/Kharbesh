import type { Order, OrderLineItem } from "@db/schema";
import { whatsappLink } from "@/lib/whatsapp";

/* Dark-theme email shell matching the storefront's ink/cream/lime palette
   (site tokens: --background hsl(40 20% 6%), --foreground hsl(41 67% 95%),
   --brand-accent #D4ED0B). Inline styles only — most email clients strip
   <style> blocks and ignore webfonts, so everything here uses safe system
   font stacks and table-based layout for maximum compatibility. */
const INK = "#15130D";
const CARD = "#1E1B12";
const CREAM = "#F7F1E1";
const MUTED = "#A79E86";
const LIME = "#D4ED0B";
const BORDER = "#3A3424";

const LATIN_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const ARABIC_FONT = "'Segoe UI', Tahoma, Arial, sans-serif";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function itemsTable(items: OrderLineItem[], lang: "en" | "ar"): string {
  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${CREAM};font-family:${lang === "ar" ? ARABIC_FONT : LATIN_FONT};font-size:14px;">
          ${esc(it.productName)}<br/>
          <span style="color:${MUTED};font-size:12px;">${esc(it.color)} · ${esc(it.size)} · ×${it.quantity}</span>
        </td>
        <td align="${lang === "ar" ? "left" : "right"}" style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${CREAM};font-family:${LATIN_FONT};font-size:14px;white-space:nowrap;">
          $${it.lineTotal.toFixed(2)}
        </td>
      </tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows}</table>`;
}

function totalsRow(label: string, value: string, lang: "en" | "ar", strong = false): string {
  return `
    <tr>
      <td style="padding:4px 0;color:${strong ? CREAM : MUTED};font-family:${lang === "ar" ? ARABIC_FONT : LATIN_FONT};font-size:${strong ? 15 : 13}px;font-weight:${strong ? 700 : 400};">${esc(label)}</td>
      <td align="${lang === "ar" ? "left" : "right"}" style="padding:4px 0;color:${strong ? LIME : MUTED};font-family:${LATIN_FONT};font-size:${strong ? 15 : 13}px;font-weight:${strong ? 700 : 400};">${esc(value)}</td>
    </tr>`;
}

/** Shared shell: dark ink background, cream card, lime accent bar, footer with real contact details. */
function layout(params: { lang: "en" | "ar"; preheader: string; bodyHtml: string }): string {
  const { lang, preheader, bodyHtml } = params;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const font = lang === "ar" ? ARABIC_FONT : LATIN_FONT;
  const footerEn = `Kharbesh · kharbesh961.com · +961 76 465367 · @kharbeshh`;
  const footerAr = `خربش · kharbesh961.com · ٧٦ ٤٦٥٣٦٧ ٩٦١+ · @kharbeshh`;

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kharbesh</title>
</head>
<body style="margin:0;padding:0;background:${INK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${INK};padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;">
        <tr>
          <td style="padding:0 4px 20px;text-align:${lang === "ar" ? "right" : "left"};">
            <span style="font-family:${LATIN_FONT};font-weight:800;font-size:22px;letter-spacing:0.06em;color:${CREAM};text-transform:uppercase;">KHARBESH</span>
            <div style="width:36px;height:3px;background:${LIME};margin-top:8px;${lang === "ar" ? "margin-right:auto;margin-left:0;" : ""}"></div>
          </td>
        </tr>
        <tr>
          <td style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;padding:28px 26px;direction:${dir};text-align:${dir === "rtl" ? "right" : "left"};font-family:${font};">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 4px 0;text-align:center;">
            <p style="margin:0;color:${MUTED};font-size:11px;font-family:${LATIN_FONT};letter-spacing:0.02em;">
              ${lang === "ar" ? footerAr : footerEn}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const PAYMENT_LABEL: Record<string, { en: string; ar: string }> = {
  cash_on_delivery: { en: "Cash on delivery", ar: "الدفع عند التسليم" },
  whish: { en: "Whish Money", ar: "Whish Money" },
};

export function orderConfirmationEmail(order: Order): { subject: string; html: string; text: string } {
  const lang: "en" | "ar" = order.language === "ar" ? "ar" : "en";
  const items = order.items as OrderLineItem[];
  const wa = whatsappLink(
    "",
    lang === "ar"
      ? `هاي، معي طلب ${order.orderNumber} وحاب اتأكد من التفاصيل.`
      : `Hi, I have order ${order.orderNumber} and wanted to check on it.`,
  );

  const bodyEn = `
    <p style="margin:0 0 4px;color:${MUTED};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-family:${LATIN_FONT};">Order confirmed</p>
    <h1 style="margin:0 0 16px;color:${CREAM};font-size:24px;font-family:${LATIN_FONT};font-weight:800;">${esc(order.orderNumber)}</h1>
    <p style="margin:0 0 20px;color:${CREAM};font-size:14px;line-height:1.6;">
      Thanks, ${esc(order.fullName.split(" ")[0])} — we got it. Your order is now <strong style="color:${LIME};">in the queue</strong>. We'll message you as it moves.
    </p>
    ${itemsTable(items, lang)}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:16px;">
      ${totalsRow("Subtotal", money(order.subtotalCents), lang)}
      ${order.discountCents > 0 ? totalsRow("Discount", `−${money(order.discountCents)}`, lang) : ""}
      ${totalsRow("Shipping", order.shippingCents === 0 ? "Free" : money(order.shippingCents), lang)}
      ${totalsRow("Total", money(order.totalCents), lang, true)}
    </table>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid ${BORDER};">
      <p style="margin:0 0 4px;color:${MUTED};font-size:12px;">Shipping to</p>
      <p style="margin:0;color:${CREAM};font-size:14px;line-height:1.5;">${esc(order.fullName)}<br/>${esc(order.shippingAddress)}, ${esc(order.city)}<br/>${esc(order.phone)}</p>
      <p style="margin:12px 0 0;color:${MUTED};font-size:12px;">Payment: ${PAYMENT_LABEL[order.paymentMethod]?.en ?? order.paymentMethod}</p>
    </div>
    <a href="${wa}" style="display:inline-block;margin-top:20px;background:${LIME};color:#15130D;font-weight:700;font-size:13px;padding:12px 20px;border-radius:8px;text-decoration:none;">Message us on WhatsApp</a>
  `;

  const bodyAr = `
    <p style="margin:0 0 4px;color:${MUTED};font-size:12px;font-family:${LATIN_FONT};letter-spacing:0.04em;">تأكيد الطلب</p>
    <h1 style="margin:0 0 16px;color:${CREAM};font-size:22px;font-family:${LATIN_FONT};font-weight:800;">${esc(order.orderNumber)}</h1>
    <p style="margin:0 0 20px;color:${CREAM};font-size:14px;line-height:1.8;">
      يسلملي، ${esc(order.fullName.split(" ")[0])} — الطلب وصلنا وصار <strong style="color:${LIME};">بالدور</strong>. رح نراسلك كل ما تحرّك شوي.
    </p>
    ${itemsTable(items, lang)}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:16px;">
      ${totalsRow("قبل الشحن", money(order.subtotalCents), lang)}
      ${order.discountCents > 0 ? totalsRow("خصم", `−${money(order.discountCents)}`, lang) : ""}
      ${totalsRow("التوصيل", order.shippingCents === 0 ? "مجاني" : money(order.shippingCents), lang)}
      ${totalsRow("الإجمالي", money(order.totalCents), lang, true)}
    </table>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid ${BORDER};">
      <p style="margin:0 0 4px;color:${MUTED};font-size:12px;">عنوان التوصيل</p>
      <p style="margin:0;color:${CREAM};font-size:14px;line-height:1.6;">${esc(order.fullName)}<br/>${esc(order.shippingAddress)}, ${esc(order.city)}<br/>${esc(order.phone)}</p>
      <p style="margin:12px 0 0;color:${MUTED};font-size:12px;">طريقة الدفع: ${PAYMENT_LABEL[order.paymentMethod]?.ar ?? order.paymentMethod}</p>
    </div>
    <a href="${wa}" style="display:inline-block;margin-top:20px;background:${LIME};color:#15130D;font-weight:700;font-size:13px;padding:12px 20px;border-radius:8px;text-decoration:none;">راسلنا عبر واتساب</a>
  `;

  const subject = lang === "ar" ? `تأكيد الطلب ${order.orderNumber} — خربش` : `Order ${order.orderNumber} confirmed — Kharbesh`;
  const html = layout({
    lang,
    preheader: lang === "ar" ? "طلبك صار بالدور." : "Your order is in the queue.",
    bodyHtml: lang === "ar" ? bodyAr : bodyEn,
  });
  const text =
    lang === "ar"
      ? `تأكيد الطلب ${order.orderNumber}. الإجمالي: ${money(order.totalCents)}. عنوان التوصيل: ${order.shippingAddress}, ${order.city}.`
      : `Order ${order.orderNumber} confirmed. Total: ${money(order.totalCents)}. Shipping to: ${order.shippingAddress}, ${order.city}.`;
  return { subject, html, text };
}

export function followUpEmail(order: Order): { subject: string; html: string; text: string } {
  const lang: "en" | "ar" = order.language === "ar" ? "ar" : "en";
  const wa = whatsappLink(
    "",
    lang === "ar"
      ? `هاي، عم برجع بخصوص طلبي ${order.orderNumber}.`
      : `Hi, following up about my order ${order.orderNumber}.`,
  );

  const bodyEn = `
    <p style="margin:0 0 4px;color:${MUTED};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Checking in</p>
    <h1 style="margin:0 0 16px;color:${CREAM};font-size:22px;font-weight:800;">How's ${esc(order.orderNumber)} treating you?</h1>
    <p style="margin:0 0 16px;color:${CREAM};font-size:14px;line-height:1.7;">
      It should've reached you by now. No pressure, but if the fit, print, or the joke landed — we'd love to hear it. If something's off, tell us before you tell your group chat.
    </p>
    <a href="${wa}" style="display:inline-block;margin-top:8px;background:${LIME};color:#15130D;font-weight:700;font-size:13px;padding:12px 20px;border-radius:8px;text-decoration:none;">Reply on WhatsApp</a>
  `;

  const bodyAr = `
    <p style="margin:0 0 4px;color:${MUTED};font-size:12px;font-family:${LATIN_FONT};letter-spacing:0.04em;">بس نتأكد</p>
    <h1 style="margin:0 0 16px;color:${CREAM};font-size:20px;font-weight:800;">شو صار مع طلبك ${esc(order.orderNumber)}؟</h1>
    <p style="margin:0 0 16px;color:${CREAM};font-size:14px;line-height:1.8;">
      المفروض وصلك. ما في ضغط، بس إذا القصة والطبعة عجبوك، حابين نعرف. وإذا في شي مش تمام، خبرنا قبل ما تخبر الكروب.
    </p>
    <a href="${wa}" style="display:inline-block;margin-top:8px;background:${LIME};color:#15130D;font-weight:700;font-size:13px;padding:12px 20px;border-radius:8px;text-decoration:none;">جاوب عبر واتساب</a>
  `;

  const subject = lang === "ar" ? `شو صار مع طلبك ${order.orderNumber}؟ — خربش` : `How's your Kharbesh order treating you?`;
  const html = layout({
    lang,
    preheader: lang === "ar" ? "بس عم نتأكد إنه كل شي تمام." : "Just checking everything landed OK.",
    bodyHtml: lang === "ar" ? bodyAr : bodyEn,
  });
  const text =
    lang === "ar"
      ? `شو صار مع طلبك ${order.orderNumber}؟ خبرنا عبر واتساب: ${wa}`
      : `How's order ${order.orderNumber} treating you? Reply on WhatsApp: ${wa}`;
  return { subject, html, text };
}

/** Internal staff notification fired to the ops inbox on every new order.
 * Always English — this is an operational tool for whoever is packing/
 * shipping, not a customer-facing message, so it skips the bilingual
 * treatment used elsewhere and leads with what staff need to act: who,
 * what, where, and a direct link into the admin order list. */
export function adminNewOrderEmail(order: Order): { subject: string; html: string; text: string } {
  const lang: "en" | "ar" = "en";
  const items = order.items as OrderLineItem[];
  const adminUrl = "https://kharbesh961.com/admin/orders";
  const wa = whatsappLink(order.phone, `Hi ${order.fullName.split(" ")[0]}, this is Kharbesh regarding your order ${order.orderNumber}.`);

  const bodyHtml = `
    <p style="margin:0 0 4px;color:${MUTED};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">New order</p>
    <h1 style="margin:0 0 16px;color:${CREAM};font-size:24px;font-weight:800;">${esc(order.orderNumber)}</h1>
    ${itemsTable(items, lang)}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:16px;">
      ${totalsRow("Subtotal", money(order.subtotalCents), lang)}
      ${order.discountCents > 0 ? totalsRow("Discount", `−${money(order.discountCents)}`, lang) : ""}
      ${totalsRow("Shipping", order.shippingCents === 0 ? "Free" : money(order.shippingCents), lang)}
      ${totalsRow("Total", money(order.totalCents), lang, true)}
    </table>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid ${BORDER};">
      <p style="margin:0 0 4px;color:${MUTED};font-size:12px;">Customer</p>
      <p style="margin:0;color:${CREAM};font-size:14px;line-height:1.5;">${esc(order.fullName)}<br/>${esc(order.phone)} · ${esc(order.email)}<br/>${esc(order.shippingAddress)}, ${esc(order.city)}</p>
      <p style="margin:12px 0 0;color:${MUTED};font-size:12px;">Payment: ${PAYMENT_LABEL[order.paymentMethod]?.en ?? order.paymentMethod}</p>
      ${order.notes ? `<p style="margin:12px 0 0;color:${MUTED};font-size:12px;">Note: ${esc(order.notes)}</p>` : ""}
    </div>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;"><tr>
      <td><a href="${adminUrl}" style="display:inline-block;background:${LIME};color:#15130D;font-weight:700;font-size:13px;padding:12px 20px;border-radius:8px;text-decoration:none;">Open in admin</a></td>
      <td style="width:10px;"></td>
      <td><a href="${wa}" style="display:inline-block;background:transparent;border:1px solid ${BORDER};color:${CREAM};font-weight:700;font-size:13px;padding:11px 20px;border-radius:8px;text-decoration:none;">Message customer</a></td>
    </tr></table>
  `;

  const subject = `New order ${order.orderNumber} — ${money(order.totalCents)}`;
  const html = layout({
    lang,
    preheader: `${esc(order.fullName)} just ordered · ${money(order.totalCents)}`,
    bodyHtml,
  });
  const text = `New order ${order.orderNumber} from ${order.fullName} (${order.phone}). Total: ${money(order.totalCents)}. Ship to: ${order.shippingAddress}, ${order.city}. Admin: ${adminUrl}`;
  return { subject, html, text };
}

export function otpEmail(code: string, lang: "en" | "ar"): { subject: string; html: string; text: string } {
  const digits = code.split("");
  const chips = digits
    .map(
      (d) =>
        `<td style="padding:0 4px;"><div style="width:38px;height:46px;line-height:46px;text-align:center;background:${INK};border:1px solid ${BORDER};border-radius:8px;color:${LIME};font-size:22px;font-weight:800;font-family:${LATIN_FONT};">${esc(d)}</div></td>`,
    )
    .join("");

  const bodyEn = `
    <p style="margin:0 0 4px;color:${MUTED};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Sign-in code</p>
    <h1 style="margin:0 0 16px;color:${CREAM};font-size:22px;font-weight:800;">Here's your code</h1>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 18px;"><tr>${chips}</tr></table>
    <p style="margin:0 0 8px;color:${CREAM};font-size:14px;line-height:1.6;">Enter this on kharbesh961.com to sign in. It expires in <strong style="color:${LIME};">10 minutes</strong>.</p>
    <p style="margin:0;color:${MUTED};font-size:12px;">Didn't request this? Just ignore it — no account changes without this code.</p>
  `;
  const bodyAr = `
    <p style="margin:0 0 4px;color:${MUTED};font-size:12px;font-family:${LATIN_FONT};letter-spacing:0.04em;">رمز الدخول</p>
    <h1 style="margin:0 0 16px;color:${CREAM};font-size:20px;font-weight:800;">هويّ الرمز</h1>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 18px;"><tr>${chips}</tr></table>
    <p style="margin:0 0 8px;color:${CREAM};font-size:14px;line-height:1.8;">دخّل هالرمز على kharbesh961.com. بينتهي بعد <strong style="color:${LIME};">10 دقايق</strong>.</p>
    <p style="margin:0;color:${MUTED};font-size:12px;">ما طلبت هالرمز؟ تجاهله، ما في أي تغيير من دونه.</p>
  `;

  const subject = lang === "ar" ? `رمز الدخول: ${code} — خربش` : `Your Kharbesh sign-in code: ${code}`;
  const html = layout({
    lang,
    preheader: lang === "ar" ? "رمز دخولك جوا." : "Your sign-in code is inside.",
    bodyHtml: lang === "ar" ? bodyAr : bodyEn,
  });
  const text = lang === "ar" ? `رمز الدخول: ${code} (ينتهي بعد 10 دقايق)` : `Your sign-in code: ${code} (expires in 10 minutes)`;
  return { subject, html, text };
}
