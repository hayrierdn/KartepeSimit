const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function loadEnvFile() {
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.RENDER ? "0.0.0.0" : (process.env.HOST || "127.0.0.1");
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_FILE = path.join(ROOT, "data", "menu.json");
const CONFIG_FILE = path.join(ROOT, "data", "config.json");
const ORDERS_FILE = path.join(ROOT, "data", "orders.json");
const WHATSAPP_STATUS_FILE = path.join(ROOT, "data", "whatsapp-status.json");
const TELEGRAM_STATUS_FILE = path.join(ROOT, "data", "telegram-status.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": type.includes("text/html") ? "no-store" : "no-cache"
  });
  res.end(body);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function writeEnvFile(values) {
  const envFile = path.join(__dirname, ".env");
  const current = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : fs.readFileSync(path.join(__dirname, ".env.example"), "utf8");
  const editableKeys = new Set([
    "PORT",
    "HOST",
    "WHATSAPP_API_VERSION",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_TOKEN",
    "WHATSAPP_TO",
    "WHATSAPP_TEMPLATE_NAME",
    "WHATSAPP_TEMPLATE_LANGUAGE",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID"
  ]);
  const seen = new Set();
  const lines = current.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return line;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    if (!editableKeys.has(key) || !(key in values)) return line;
    seen.add(key);
    return `${key}=${String(values[key] || "").replace(/\r?\n/g, "")}`;
  });
  for (const key of editableKeys) {
    if ((key in values) && !seen.has(key)) lines.push(`${key}=${String(values[key] || "").replace(/\r?\n/g, "")}`);
  }
  fs.writeFileSync(envFile, `${lines.join("\n").replace(/\n+$/g, "")}\n`);
  for (const key of editableKeys) {
    if (key in values) process.env[key] = String(values[key] || "");
  }
}

function safeReadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return readJson(file);
  } catch {
    return fallback;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 40_000_000) {
        reject(new Error("İstek çok büyük."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function makeId(value, fallback = "item") {
  const slug = slugify(value);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${slug || fallback}-${suffix}`;
}

function normalizeImage(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(text);
  const isRemoteImage = /^https?:\/\/[^\s"'<>]+$/i.test(text);
  const isLocalImage = /^\/assets\/[a-z0-9-]+\.(svg|png|jpg|jpeg|webp|gif)$/i.test(text);
  if ((isDataImage || isRemoteImage || isLocalImage) && text.length <= 4_000_000) return text;
  return "";
}

function normalizeMenu(input) {
  const settings = input.settings || {};
  const currency = String(settings.currency || "TL").trim().slice(0, 8) || "TL";
  const categories = Array.isArray(input.categories) ? input.categories : [];

  return {
    settings: {
      cafeName: String(settings.cafeName || "Cafe").trim().slice(0, 80),
      tagline: String(settings.tagline || "").trim().slice(0, 160),
      currency,
      serviceNote: String(settings.serviceNote || "").trim().slice(0, 240),
      whatsapp: String(settings.whatsapp || "").trim().slice(0, 40),
      deliveryEnabled: Boolean(settings.deliveryEnabled),
      tableCount: Math.max(1, Math.min(200, Number(settings.tableCount || 1))),
      logoData: normalizeImage(settings.logoData),
      heroImage: normalizeImage(settings.heroImage)
    },
    categories: categories.map((category) => {
      const name = String(category.name || "Kategori").trim().slice(0, 80);
      const items = Array.isArray(category.items) ? category.items : [];
      return {
        id: String(category.id || makeId(name, "category")).slice(0, 80),
        name,
        description: String(category.description || "").trim().slice(0, 160),
        items: items.map((item) => {
          const itemName = String(item.name || "Ürün").trim().slice(0, 90);
          return {
            id: String(item.id || makeId(itemName, "item")).slice(0, 80),
            name: itemName,
            description: String(item.description || "").trim().slice(0, 180),
            price: Math.max(0, Number(item.price || 0)),
            available: Boolean(item.available),
            featured: Boolean(item.featured),
            imageData: normalizeImage(item.imageData)
          };
        })
      };
    })
  };
}

function findMenuItem(menu, itemId) {
  for (const category of menu.categories || []) {
    const item = (category.items || []).find((entry) => entry.id === itemId);
    if (item) return { category, item };
  }
  return null;
}

function normalizeOrder(input) {
  const menu = readJson(DATA_FILE);
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = rawItems.map((entry) => {
    const found = findMenuItem(menu, String(entry.id || ""));
    const quantity = Math.max(1, Math.min(50, Number(entry.quantity || 1)));
    if (!found || !found.item.available) return null;
    return {
      id: found.item.id,
      name: found.item.name,
      category: found.category.name,
      quantity,
      unitPrice: Number(found.item.price || 0),
      total: Number(found.item.price || 0) * quantity
    };
  }).filter(Boolean);
  const orderType = ["table", "pickup", "delivery"].includes(input.orderType) ? input.orderType : "table";
  const customer = input.customer || {};
  const table = String(input.table || "").trim().slice(0, 20);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  return {
    id: `siparis-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`,
    createdAt: new Date().toISOString(),
    status: "new",
    orderType,
    table,
    customer: {
      name: String(customer.name || "").trim().slice(0, 80),
      phone: String(customer.phone || "").trim().slice(0, 30),
      address: String(customer.address || "").trim().slice(0, 260),
      note: String(customer.note || "").trim().slice(0, 260)
    },
    items,
    subtotal
  };
}

function orderTypeLabel(type) {
  return {
    table: "Masaya servis",
    pickup: "Gel-al paket",
    delivery: "Paket teslimat"
  }[type] || "Sipariş";
}

function formatOrderMessage(order, currency) {
  return [
    `Kartepe Simit yeni sipariş`,
    `Tür: ${orderTypeLabel(order.orderType)}`,
    order.table ? `Masa: ${order.table}` : "",
    "",
    ...order.items.map((item) => `- ${item.name} x ${item.quantity} = ${item.total} ${currency}`),
    "",
    `Toplam: ${order.subtotal} ${currency}`,
    order.customer.name ? `Müşteri: ${order.customer.name}` : "",
    order.customer.phone ? `Telefon: ${order.customer.phone}` : "",
    order.customer.address ? `Adres: ${order.customer.address}` : "",
    order.customer.note ? `Not: ${order.customer.note}` : ""
  ].filter(Boolean).join("\n");
}

function buildWhatsAppPayload(order, menu, to) {
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "tr";
  const summary = formatOrderMessage(order, menu.settings.currency || "TL");

  if (templateName) {
    return {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: summary.slice(0, 1024) }
            ]
          }
        ]
      }
    };
  }

  return {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: summary
    }
  };
}

function sendWhatsAppNotification(order, menu) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";
  const to = String(process.env.WHATSAPP_TO || menu.settings.whatsapp || "").replace(/\D/g, "");
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!token || !phoneNumberId || !to) {
    return Promise.resolve({
      ok: false,
      skipped: true,
      message: "WhatsApp gönderilmedi: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID veya alıcı numara eksik.",
      configured: false
    });
  }

  const payload = JSON.stringify(buildWhatsAppPayload(order, menu, to));

  return new Promise((resolve) => {
    const request = https.request({
      hostname: "graph.facebook.com",
      path: `/${apiVersion}/${phoneNumberId}/messages`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, (response) => {
      let body = "";
      response.on("data", (chunk) => body += chunk);
      response.on("end", () => {
        const ok = response.statusCode >= 200 && response.statusCode < 300;
        resolve({
          ok,
          status: response.statusCode,
          body,
          configured: true,
          mode: templateName ? "template" : "text",
          to,
          message: ok ? "WhatsApp bildirimi Meta API'ye gönderildi." : "WhatsApp bildirimi Meta API tarafından reddedildi."
        });
      });
    });
    request.on("error", (error) => resolve({
      ok: false,
      error: error.message,
      configured: true,
      mode: templateName ? "template" : "text",
      to,
      message: "WhatsApp bildirimi gönderilirken bağlantı hatası oluştu."
    }));
    request.write(payload);
    request.end();
  });
}

function publicWhatsAppStatus() {
  const stored = safeReadJson(WHATSAPP_STATUS_FILE, {});
  return {
    configured: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && (process.env.WHATSAPP_TO || readJson(DATA_FILE).settings.whatsapp)),
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    phoneNumberIdSet: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    tokenSet: Boolean(process.env.WHATSAPP_TOKEN),
    toSet: Boolean(process.env.WHATSAPP_TO || readJson(DATA_FILE).settings.whatsapp),
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || "kartepe_siparis_bildirimi",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "tr",
    lastAttemptAt: stored.lastAttemptAt || "",
    lastResult: stored.lastResult || { ok: false, message: "Henüz WhatsApp denemesi yapılmadı." }
  };
}

function publicWhatsAppConfig() {
  const menu = readJson(DATA_FILE);
  return {
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    tokenSet: Boolean(process.env.WHATSAPP_TOKEN),
    to: process.env.WHATSAPP_TO || menu.settings.whatsapp || "",
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || "kartepe_siparis_bildirimi",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "tr"
  };
}

function recordWhatsAppResult(result) {
  const status = publicWhatsAppStatus();
  status.configured = Boolean(result.configured);
  status.lastAttemptAt = new Date().toISOString();
  status.lastResult = result;
  writeJson(WHATSAPP_STATUS_FILE, status);
}

function sendJsonHttps(hostname, pathName, payload, headers = {}) {
  const body = JSON.stringify(payload);
  return new Promise((resolve) => {
    const request = https.request({
      hostname,
      path: pathName,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...headers
      }
    }, (response) => {
      let responseBody = "";
      response.on("data", (chunk) => responseBody += chunk);
      response.on("end", () => resolve({
        ok: response.statusCode >= 200 && response.statusCode < 300,
        status: response.statusCode,
        body: responseBody
      }));
    });
    request.on("error", (error) => resolve({ ok: false, error: error.message }));
    request.write(body);
    request.end();
  });
}

function sendTelegramNotification(order, menu) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return Promise.resolve({
      ok: false,
      skipped: true,
      configured: false,
      message: "Telegram gönderilmedi: TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID eksik."
    });
  }

  return sendJsonHttps("api.telegram.org", `/bot${token}/sendMessage`, {
    chat_id: chatId,
    text: formatOrderMessage(order, menu.settings.currency || "TL"),
    disable_web_page_preview: true
  }).then((result) => ({
    ...result,
    configured: true,
    message: result.ok ? "Telegram bildirimi gönderildi." : "Telegram bildirimi gönderilemedi."
  }));
}

function publicTelegramStatus() {
  const stored = safeReadJson(TELEGRAM_STATUS_FILE, {});
  return {
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    tokenSet: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    chatIdSet: Boolean(process.env.TELEGRAM_CHAT_ID),
    lastAttemptAt: stored.lastAttemptAt || "",
    lastResult: stored.lastResult || { ok: false, message: "Henüz Telegram denemesi yapılmadı." }
  };
}

function publicTelegramConfig() {
  return {
    tokenSet: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    chatId: process.env.TELEGRAM_CHAT_ID || ""
  };
}

function recordTelegramResult(result) {
  const status = publicTelegramStatus();
  status.configured = Boolean(result.configured);
  status.lastAttemptAt = new Date().toISOString();
  status.lastResult = result;
  writeJson(TELEGRAM_STATUS_FILE, status);
}

function telegramGetUpdates() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return Promise.resolve({ ok: false, message: "Telegram bot token eksik." });
  return new Promise((resolve) => {
    https.get(`https://api.telegram.org/bot${token}/getUpdates`, (response) => {
      let body = "";
      response.on("data", (chunk) => body += chunk);
      response.on("end", () => resolve({
        ok: response.statusCode >= 200 && response.statusCode < 300,
        status: response.statusCode,
        body
      }));
    }).on("error", (error) => resolve({ ok: false, error: error.message }));
  });
}

function isAuthorized(req) {
  const config = readJson(CONFIG_FILE);
  return req.headers["x-admin-pin"] === config.adminPin;
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const cleanPath = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.normalize(path.join(PUBLIC_DIR, cleanPath));
  return resolved.startsWith(PUBLIC_DIR) ? resolved : null;
}

function publicUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
  const protocol = req.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${host}`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/menu") {
      send(res, 200, JSON.stringify(readJson(DATA_FILE)));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/qr-links") {
      const menu = readJson(DATA_FILE);
      const count = menu.settings.tableCount || 1;
      const baseUrl = publicUrl(req);
      const tables = Array.from({ length: count }, (_, index) => {
        const table = index + 1;
        return {
          table,
          url: `${baseUrl}/?masa=${table}`,
          qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${baseUrl}/?masa=${table}`)}`
        };
      });
      send(res, 200, JSON.stringify({ baseUrl, tables }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = JSON.parse(await readBody(req) || "{}");
      const config = readJson(CONFIG_FILE);
      send(res, body.pin === config.adminPin ? 200 : 401, JSON.stringify({ ok: body.pin === config.adminPin }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/orders") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const orders = readJson(ORDERS_FILE).slice().reverse();
      send(res, 200, JSON.stringify({ orders }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/whatsapp/status") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      send(res, 200, JSON.stringify(publicWhatsAppStatus()));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/whatsapp/config") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      send(res, 200, JSON.stringify(publicWhatsAppConfig()));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/telegram/status") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      send(res, 200, JSON.stringify(publicTelegramStatus()));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/telegram/config") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      send(res, 200, JSON.stringify(publicTelegramConfig()));
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/telegram/config") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const body = JSON.parse(await readBody(req) || "{}");
      const currentToken = process.env.TELEGRAM_BOT_TOKEN || "";
      writeEnvFile({
        TELEGRAM_BOT_TOKEN: String(body.token || "").trim() || currentToken,
        TELEGRAM_CHAT_ID: String(body.chatId || "").trim()
      });
      send(res, 200, JSON.stringify({ ok: true, config: publicTelegramConfig(), status: publicTelegramStatus() }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/telegram/test") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const menu = readJson(DATA_FILE);
      const order = {
        id: `test-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        status: "new",
        orderType: "table",
        table: "TEST",
        customer: { name: "Test", phone: "", address: "", note: "Telegram test bildirimi" },
        items: [{ id: "test", name: "Test Sipariş", category: "Test", quantity: 1, unitPrice: 1, total: 1 }],
        subtotal: 1
      };
      const result = await sendTelegramNotification(order, menu);
      recordTelegramResult(result);
      send(res, result.ok ? 200 : 400, JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/telegram/find-chat") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const result = await telegramGetUpdates();
      if (!result.ok) {
        send(res, 400, JSON.stringify(result));
        return;
      }
      const data = JSON.parse(result.body);
      const chats = [];
      for (const update of data.result || []) {
        const chat = update.message?.chat || update.channel_post?.chat || update.my_chat_member?.chat;
        if (!chat || chats.some((entry) => entry.id === chat.id)) continue;
        chats.push({ id: String(chat.id), title: chat.title || chat.username || chat.first_name || "Telegram sohbeti", type: chat.type });
      }
      send(res, 200, JSON.stringify({ ok: true, chats }));
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/whatsapp/config") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const body = JSON.parse(await readBody(req) || "{}");
      const currentToken = process.env.WHATSAPP_TOKEN || "";
      writeEnvFile({
        WHATSAPP_API_VERSION: String(body.apiVersion || "v21.0").trim(),
        WHATSAPP_PHONE_NUMBER_ID: String(body.phoneNumberId || "").trim(),
        WHATSAPP_TOKEN: String(body.token || "").trim() || currentToken,
        WHATSAPP_TO: String(body.to || "").replace(/\D/g, ""),
        WHATSAPP_TEMPLATE_NAME: String(body.templateName || "kartepe_siparis_bildirimi").trim(),
        WHATSAPP_TEMPLATE_LANGUAGE: String(body.templateLanguage || "tr").trim()
      });
      send(res, 200, JSON.stringify({ ok: true, config: publicWhatsAppConfig(), status: publicWhatsAppStatus() }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/whatsapp/test") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const menu = readJson(DATA_FILE);
      const order = {
        id: `test-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        status: "new",
        orderType: "table",
        table: "TEST",
        customer: { name: "Test", phone: "", address: "", note: "WhatsApp test bildirimi" },
        items: [{ id: "test", name: "Test Sipariş", category: "Test", quantity: 1, unitPrice: 1, total: 1 }],
        subtotal: 1
      };
      const result = await sendWhatsAppNotification(order, menu);
      recordWhatsAppResult(result);
      send(res, result.ok ? 200 : 400, JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      const body = JSON.parse(await readBody(req) || "{}");
      const order = normalizeOrder(body);
      const menu = readJson(DATA_FILE);
      if (!order.items.length) {
        send(res, 400, JSON.stringify({ error: "Sepet boş veya ürünler uygun değil." }));
        return;
      }
      if (order.orderType === "delivery" && !menu.settings.deliveryEnabled) {
        send(res, 400, JSON.stringify({ error: "Paket teslimat şu an kapalı." }));
        return;
      }
      if (order.orderType === "delivery" && (!order.customer.name || !order.customer.phone || !order.customer.address)) {
        send(res, 400, JSON.stringify({ error: "Paket teslimat için ad, telefon ve adres gerekli." }));
        return;
      }
      if (order.orderType === "pickup" && (!order.customer.name || !order.customer.phone)) {
        send(res, 400, JSON.stringify({ error: "Gel-al sipariş için ad ve telefon gerekli." }));
        return;
      }
      const orders = readJson(ORDERS_FILE);
      orders.push(order);
      writeJson(ORDERS_FILE, orders.slice(-500));
      sendWhatsAppNotification(order, menu).then((result) => {
        recordWhatsAppResult(result);
        if (result && !result.skipped && (result.error || result.status >= 400)) {
          console.error("WhatsApp bildirimi gönderilemedi:", result);
        }
      });
      sendTelegramNotification(order, menu).then((result) => {
        recordTelegramResult(result);
        if (result && !result.skipped && (result.error || result.status >= 400 || !result.ok)) {
          console.error("Telegram bildirimi gönderilemedi:", result);
        }
      });
      send(res, 201, JSON.stringify({ ok: true, order }));
      return;
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/orders/")) {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const orderId = decodeURIComponent(url.pathname.replace("/api/orders/", ""));
      const body = JSON.parse(await readBody(req) || "{}");
      const status = ["new", "preparing", "ready", "done", "cancelled"].includes(body.status) ? body.status : "new";
      const orders = readJson(ORDERS_FILE);
      const order = orders.find((entry) => entry.id === orderId);
      if (!order) {
        send(res, 404, JSON.stringify({ error: "Sipariş bulunamadı." }));
        return;
      }
      order.status = status;
      writeJson(ORDERS_FILE, orders);
      send(res, 200, JSON.stringify({ ok: true, order }));
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/menu") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const body = JSON.parse(await readBody(req) || "{}");
      const normalized = normalizeMenu(body);
      writeJson(DATA_FILE, normalized);
      send(res, 200, JSON.stringify({ ok: true, menu: normalized }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/change-pin") {
      if (!isAuthorized(req)) {
        send(res, 401, JSON.stringify({ error: "Yetkisiz giriş." }));
        return;
      }
      const body = JSON.parse(await readBody(req) || "{}");
      const nextPin = String(body.pin || "").trim();
      if (nextPin.length < 6 || nextPin.length > 64) {
        send(res, 400, JSON.stringify({ error: "Şifre 6-64 karakter olmalı." }));
        return;
      }
      writeJson(CONFIG_FILE, { adminPin: nextPin });
      send(res, 200, JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/admin") {
      const filePath = path.join(PUBLIC_DIR, "admin.html");
      send(res, 200, fs.readFileSync(filePath), MIME_TYPES[".html"]);
      return;
    }

    if (req.method === "GET" && url.pathname === "/orders") {
      const filePath = path.join(PUBLIC_DIR, "orders.html");
      send(res, 200, fs.readFileSync(filePath), MIME_TYPES[".html"]);
      return;
    }

    const staticPath = safeStaticPath(url.pathname);
    if (req.method === "HEAD" && staticPath && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      const ext = path.extname(staticPath).toLowerCase();
      send(res, 200, "", MIME_TYPES[ext] || "application/octet-stream");
      return;
    }

    if (req.method === "GET" && staticPath && fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
      const ext = path.extname(staticPath).toLowerCase();
      send(res, 200, fs.readFileSync(staticPath), MIME_TYPES[ext] || "application/octet-stream");
      return;
    }

    if (req.method === "GET") {
      const filePath = path.join(PUBLIC_DIR, "index.html");
      send(res, 200, fs.readFileSync(filePath), MIME_TYPES[".html"]);
      return;
    }

    send(res, 404, JSON.stringify({ error: "Bulunamadi." }));
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message || "Sunucu hatasi." }));
  }
});

server.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log(`Sabit QR menü sistemi hazır: ${localUrl}`);
  console.log(`Yönetim paneli: ${localUrl}/admin`);
});
