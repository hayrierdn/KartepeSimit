const storageKey = "sabitQrAdminPin";
let adminPin = localStorage.getItem(storageKey) || "";
let menu = null;

const loginPanel = document.getElementById("loginPanel");
const workspace = document.getElementById("workspace");
const saveStatus = document.getElementById("saveStatus");

function showAdminSection(target) {
  document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.adminTab === target);
  });
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.adminPanel === target);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function collectSettings() {
  menu.settings.cafeName = document.getElementById("settingCafeName").value.trim() || "Kafe";
  menu.settings.tagline = document.getElementById("settingTagline").value.trim();
  menu.settings.currency = document.getElementById("settingCurrency").value.trim() || "TL";
  menu.settings.serviceNote = document.getElementById("settingServiceNote").value.trim();
  menu.settings.whatsapp = document.getElementById("settingWhatsapp").value.trim();
  menu.settings.deliveryEnabled = document.getElementById("settingDeliveryEnabled").checked;
  menu.settings.tableCount = Number(document.getElementById("settingTableCount").value || 1);
  menu.settings.heroImage = document.getElementById("settingHeroImage").value.trim();
}

function fillSettings() {
  document.getElementById("settingCafeName").value = menu.settings.cafeName || "";
  document.getElementById("settingTagline").value = menu.settings.tagline || "";
  document.getElementById("settingCurrency").value = menu.settings.currency || "TL";
  document.getElementById("settingServiceNote").value = menu.settings.serviceNote || "";
  document.getElementById("settingWhatsapp").value = menu.settings.whatsapp || "";
  document.getElementById("settingDeliveryEnabled").checked = Boolean(menu.settings.deliveryEnabled);
  document.getElementById("settingTableCount").value = menu.settings.tableCount || 1;
  document.getElementById("settingHeroImage").value = menu.settings.heroImage || "";
  renderLogoPreview();
}

function renderLogoPreview() {
  const preview = document.getElementById("logoPreview");
  if (menu.settings.logoData) {
    preview.innerHTML = `<img src="${escapeHtml(menu.settings.logoData)}" alt="Firma logosu">`;
  } else {
    preview.textContent = "Logo yok";
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      reject(new Error("Lütfen bir görsel dosyası seçin."));
      return;
    }
    if (file.size > 1_500_000) {
      reject(new Error("Görsel 1.5 MB'den küçük olmalı."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Görsel okunamadı."));
    reader.readAsDataURL(file);
  });
}

function renderEditor() {
  fillSettings();
  document.getElementById("categoryEditor").innerHTML = menu.categories.map((category, categoryIndex) => `
    <article class="editor-category" data-category-index="${categoryIndex}">
      <div class="editor-category-head simple-category-head">
        <div>
          <input data-field="categoryName" value="${escapeHtml(category.name)}" placeholder="Kategori adı">
          <input data-field="categoryDescription" value="${escapeHtml(category.description || "")}" placeholder="Kısa açıklama">
        </div>
        <button class="button secondary" data-action="addItem">Ürün Ekle</button>
        <details class="row-details">
          <summary>Diğer</summary>
          <button class="small-button" data-action="moveCategoryUp">Yukarı Taşı</button>
          <button class="small-button danger" data-action="deleteCategory">Kategoriyi Sil</button>
        </details>
      </div>
      <div class="editor-items">
        ${category.items.map((item, itemIndex) => `
          <div class="editor-item" data-item-index="${itemIndex}">
            <div class="editor-item-main">
              <input data-field="itemName" value="${escapeHtml(item.name)}" placeholder="Ürün adı">
              <input data-field="itemPrice" type="number" min="0" value="${item.price}" placeholder="Fiyat">
              <label class="check-label"><input data-field="itemAvailable" type="checkbox" ${item.available ? "checked" : ""}> Var</label>
              <label class="check-label"><input data-field="itemFeatured" type="checkbox" ${item.featured ? "checked" : ""}> Öne çıkan</label>
              <details class="row-details item-details">
                <summary>Detay</summary>
                <div class="item-detail-panel">
                  <label class="detail-field">Ürün açıklaması
                    <input data-field="itemDescription" value="${escapeHtml(item.description || "")}" placeholder="Örn: Bol susamlı, çıtır klasik simit.">
                  </label>
                  <div class="detail-image">
                    ${item.imageData ? `<img src="${escapeHtml(item.imageData)}" alt="${escapeHtml(item.name)}">` : '<span>Görsel yok</span>'}
                  </div>
                  <div class="detail-actions">
                    <label class="small-button file-button">
                      Görsel Seç
                      <input data-action="itemImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
                    </label>
                    <button class="small-button" data-action="removeItemImage">Görseli Kaldır</button>
                    <button class="small-button danger" data-action="deleteItem">Ürünü Sil</button>
                  </div>
                </div>
              </details>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function syncFromEditor() {
  collectSettings();
  document.querySelectorAll("[data-category-index]").forEach((categoryEl) => {
    const category = menu.categories[Number(categoryEl.dataset.categoryIndex)];
    category.name = categoryEl.querySelector('[data-field="categoryName"]').value.trim() || "Kategori";
    category.description = categoryEl.querySelector('[data-field="categoryDescription"]').value.trim();

    categoryEl.querySelectorAll("[data-item-index]").forEach((itemEl) => {
      const item = category.items[Number(itemEl.dataset.itemIndex)];
      item.name = itemEl.querySelector('[data-field="itemName"]').value.trim() || "Ürün";
      item.description = itemEl.querySelector('[data-field="itemDescription"]').value.trim();
      item.price = Number(itemEl.querySelector('[data-field="itemPrice"]').value || 0);
      item.available = itemEl.querySelector('[data-field="itemAvailable"]').checked;
      item.featured = itemEl.querySelector('[data-field="itemFeatured"]').checked;
    });
  });
}

async function loadMenu() {
  const response = await fetch("/api/menu");
  menu = await response.json();
  renderEditor();
}

async function saveMenu() {
  syncFromEditor();
  saveStatus.textContent = "Kaydediliyor...";
  const response = await fetch("/api/menu", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-pin": adminPin
    },
    body: JSON.stringify(menu)
  });
  if (!response.ok) {
    saveStatus.textContent = "Kaydedilemedi";
    return;
  }
  const data = await response.json();
  menu = data.menu;
  renderEditor();
  saveStatus.textContent = "Kaydedildi";
}

function statusLabel(status) {
  return {
    new: "Yeni",
    preparing: "Hazırlanıyor",
    ready: "Hazır",
    done: "Tamamlandı",
    cancelled: "İptal"
  }[status] || "Yeni";
}

function orderTypeLabel(type) {
  return {
    table: "Masaya servis",
    pickup: "Gel-al paket",
    delivery: "Paket teslimat"
  }[type] || "Sipariş";
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("tr-TR")} ${menu?.settings?.currency || "TL"}`;
}

async function loadOrders() {
  const list = document.getElementById("ordersList");
  list.innerHTML = "<p>Siparişler yükleniyor...</p>";
  const response = await fetch("/api/orders", {
    headers: { "x-admin-pin": adminPin }
  });
  if (!response.ok) {
    list.innerHTML = "<p>Siparişler yüklenemedi.</p>";
    return;
  }
  const data = await response.json();
  if (!data.orders.length) {
    list.innerHTML = "<p class=\"empty-state\">Henüz sipariş yok.</p>";
    return;
  }
  list.innerHTML = data.orders.map((order) => {
    return `
      <article class="order-card ${order.status === "new" ? "is-new" : ""}" data-order-id="${escapeHtml(order.id)}">
      <div class="order-top">
        <div>
          <strong>${orderTypeLabel(order.orderType)} ${order.table ? `- Masa ${escapeHtml(order.table)}` : ""}</strong>
          <span>${new Date(order.createdAt).toLocaleString("tr-TR")}</span>
        </div>
        <select data-action="orderStatus">
          ${["new", "preparing", "ready", "done", "cancelled"].map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}
        </select>
      </div>
      <div class="order-lines">
        ${order.items.map((item) => `<p>${escapeHtml(item.name)} x ${item.quantity} <strong>${formatPrice(item.total)}</strong></p>`).join("")}
      </div>
      <div class="order-customer">
        <span>${escapeHtml(order.customer.name || "İsimsiz")}</span>
        <span>${escapeHtml(order.customer.phone || "")}</span>
        <span>${escapeHtml(order.customer.address || "")}</span>
        <span>${escapeHtml(order.customer.note || "")}</span>
      </div>
      <div class="cart-total">
        <span>Toplam</span>
        <strong>${formatPrice(order.subtotal)}</strong>
      </div>
    </article>
    `;
  }).join("");
}

async function updateOrderStatus(orderId, status) {
  await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-admin-pin": adminPin
    },
    body: JSON.stringify({ status })
  });
  await loadOrders();
}

function renderTelegramStatus(status) {
  const box = document.getElementById("telegramStatus");
  const result = status.lastResult || {};
  box.innerHTML = `
    <p><strong>Genel durum:</strong> ${status.configured ? "Hazır" : "Eksik bilgi var"}</p>
    <p><strong>Bot token:</strong> ${status.tokenSet ? "Var" : "Eksik"}</p>
    <p><strong>Chat ID:</strong> ${status.chatIdSet ? "Var" : "Eksik"}</p>
    <p><strong>Son deneme:</strong> ${status.lastAttemptAt ? new Date(status.lastAttemptAt).toLocaleString("tr-TR") : "Yok"}</p>
    <p><strong>Son sonuç:</strong> ${result.ok ? "Başarılı" : "Başarısız"} - ${escapeHtml(result.message || "")}</p>
    ${result.status ? `<p><strong>Telegram HTTP:</strong> ${result.status}</p>` : ""}
    ${result.body ? `<pre>${escapeHtml(result.body).slice(0, 1200)}</pre>` : ""}
    ${result.error ? `<pre>${escapeHtml(result.error)}</pre>` : ""}
  `;
}

async function loadTelegramConfig() {
  const response = await fetch("/api/telegram/config", {
    headers: { "x-admin-pin": adminPin }
  });
  if (!response.ok) return;
  const config = await response.json();
  document.getElementById("telegramChatId").value = config.chatId || "";
  document.getElementById("telegramToken").placeholder = config.tokenSet ? "Kayıtlı token var, değiştirmek için yeni token girin" : "BotFather token";
}

async function loadTelegramStatus() {
  const response = await fetch("/api/telegram/status", {
    headers: { "x-admin-pin": adminPin }
  });
  if (!response.ok) return;
  renderTelegramStatus(await response.json());
}

async function saveTelegramConfig() {
  const box = document.getElementById("telegramStatus");
  box.textContent = "Telegram ayarları kaydediliyor...";
  const response = await fetch("/api/telegram/config", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-pin": adminPin
    },
    body: JSON.stringify({
      token: document.getElementById("telegramToken").value,
      chatId: document.getElementById("telegramChatId").value
    })
  });
  const data = await response.json();
  if (!response.ok) {
    box.textContent = data.error || "Telegram ayarları kaydedilemedi.";
    return;
  }
  document.getElementById("telegramToken").value = "";
  await loadTelegramConfig();
  renderTelegramStatus(data.status);
}

async function testTelegram() {
  const box = document.getElementById("telegramStatus");
  box.textContent = "Telegram test bildirimi gönderiliyor...";
  const response = await fetch("/api/telegram/test", {
    method: "POST",
    headers: { "x-admin-pin": adminPin }
  });
  const data = await response.json();
  renderTelegramStatus({
    configured: Boolean(data.configured),
    tokenSet: true,
    chatIdSet: Boolean(document.getElementById("telegramChatId").value),
    lastAttemptAt: new Date().toISOString(),
    lastResult: data
  });
}

async function findTelegramChat() {
  const box = document.getElementById("telegramStatus");
  box.textContent = "Telegram grupları aranıyor. Botu gruba ekleyip gruba bir mesaj yazmış olmalısınız.";
  const response = await fetch("/api/telegram/find-chat", {
    method: "POST",
    headers: { "x-admin-pin": adminPin }
  });
  const data = await response.json();
  if (!response.ok) {
    box.innerHTML = `<p>Grup bulunamadı.</p><pre>${escapeHtml(data.body || data.error || data.message || "")}</pre>`;
    return;
  }
  if (!data.chats.length) {
    box.innerHTML = "<p>Henüz sohbet bulunamadı. Botu gruba ekleyin, gruba 'test' yazın, sonra tekrar deneyin.</p>";
    return;
  }
  const firstGroup = data.chats.find((chat) => chat.type === "group" || chat.type === "supergroup" || chat.type === "channel") || data.chats[0];
  document.getElementById("telegramChatId").value = firstGroup.id;
  box.innerHTML = `
    <p><strong>Bulunan sohbet:</strong> ${escapeHtml(firstGroup.title)} (${escapeHtml(firstGroup.type)})</p>
    <p><strong>Chat ID:</strong> ${escapeHtml(firstGroup.id)}</p>
    <p>Şimdi “Telegram Ayarlarını Kaydet” ve ardından “Telegram Test Et” butonuna basın.</p>
  `;
}

async function verifyPassword(password) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: password })
  });
  return response.ok;
}

async function openWorkspace(pin, alreadyVerified = false) {
  if (!alreadyVerified && !(await verifyPassword(pin))) {
    localStorage.removeItem(storageKey);
    document.getElementById("loginStatus").textContent = "Şifrenizi girin.";
    return;
  }
  adminPin = pin;
  localStorage.setItem(storageKey, pin);
  loginPanel.hidden = true;
  workspace.hidden = false;
  await loadMenu();
  await loadOrders();
  await loadTelegramConfig();
  await loadTelegramStatus();
  showAdminSection("orders");
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const pin = document.getElementById("pinInput").value.trim();
  if (await verifyPassword(pin)) {
    await openWorkspace(pin, true);
  } else {
    document.getElementById("loginStatus").textContent = "Şifre hatalı.";
  }
});

document.getElementById("categoryEditor").addEventListener("input", () => {
  saveStatus.textContent = "Değişiklik var";
});

document.getElementById("categoryEditor").addEventListener("change", async (event) => {
  const input = event.target.closest('[data-action="itemImage"]');
  if (!input) return;
  syncFromEditor();
  const itemEl = input.closest("[data-item-index]");
  const categoryEl = input.closest("[data-category-index]");
  const category = menu.categories[Number(categoryEl.dataset.categoryIndex)];
  const item = category.items[Number(itemEl.dataset.itemIndex)];
  try {
    item.imageData = await fileToDataUrl(input.files[0]);
    renderEditor();
    saveStatus.textContent = "Görsel eklendi, kaydetmeyi unutmayın";
  } catch (error) {
    saveStatus.textContent = error.message;
  }
});

document.getElementById("categoryEditor").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "itemImage") return;
  syncFromEditor();
  const categoryEl = button.closest("[data-category-index]");
  const categoryIndex = Number(categoryEl.dataset.categoryIndex);
  const category = menu.categories[categoryIndex];
  const itemEl = button.closest("[data-item-index]");
  const action = button.dataset.action;

  if (action === "addItem") {
    category.items.push({ id: id("item"), name: "Yeni Ürün", description: "", price: 0, available: true, featured: false, imageData: "" });
  }
  if (action === "deleteCategory" && confirm("Kategori silinsin mi?")) {
    menu.categories.splice(categoryIndex, 1);
  }
  if (action === "moveCategoryUp" && categoryIndex > 0) {
    const [moved] = menu.categories.splice(categoryIndex, 1);
    menu.categories.splice(categoryIndex - 1, 0, moved);
  }
  if (action === "deleteItem" && itemEl && confirm("Ürün silinsin mi?")) {
    category.items.splice(Number(itemEl.dataset.itemIndex), 1);
  }
  if (action === "removeItemImage" && itemEl) {
    category.items[Number(itemEl.dataset.itemIndex)].imageData = "";
  }

  renderEditor();
  saveStatus.textContent = "Değişiklik var";
});

document.getElementById("addCategoryButton").addEventListener("click", () => {
  syncFromEditor();
  menu.categories.push({ id: id("category"), name: "Yeni Kategori", description: "", items: [] });
  renderEditor();
  saveStatus.textContent = "Değişiklik var";
});

document.getElementById("saveButton").addEventListener("click", saveMenu);

document.getElementById("exportButton").addEventListener("click", () => {
  syncFromEditor();
  const blob = new Blob([JSON.stringify(menu, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "menu-yedek.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

document.getElementById("importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  menu = JSON.parse(await file.text());
  renderEditor();
  saveStatus.textContent = "Yedek yüklendi, kaydetmeyi unutmayın";
});

document.getElementById("logoInput").addEventListener("change", async (event) => {
  syncFromEditor();
  try {
    menu.settings.logoData = await fileToDataUrl(event.target.files[0]);
    renderLogoPreview();
    saveStatus.textContent = "Logo eklendi, kaydetmeyi unutmayın";
  } catch (error) {
    saveStatus.textContent = error.message;
  }
});

document.getElementById("removeLogoButton").addEventListener("click", () => {
  syncFromEditor();
  menu.settings.logoData = "";
  renderLogoPreview();
  saveStatus.textContent = "Logo kaldırıldı, kaydetmeyi unutmayın";
});

document.getElementById("loadQrButton").addEventListener("click", async () => {
  syncFromEditor();
  const response = await fetch("/api/qr-links");
  const data = await response.json();
  document.getElementById("qrGrid").innerHTML = data.tables.map((table) => `
    <article class="qr-card">
      <img src="${table.qrImage}" alt="Masa ${table.table} QR">
      <strong>Masa ${table.table}</strong>
      <a href="${table.url}" target="_blank" rel="noreferrer">${table.url}</a>
    </article>
  `).join("");
});

document.getElementById("loadOrdersButton").addEventListener("click", loadOrders);

document.getElementById("findTelegramChatButton").addEventListener("click", findTelegramChat);

document.getElementById("saveTelegramButton").addEventListener("click", saveTelegramConfig);

document.getElementById("testTelegramButton").addEventListener("click", testTelegram);

document.querySelectorAll("[data-admin-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    showAdminSection(button.dataset.adminTab);
  });
});

document.getElementById("ordersList").addEventListener("change", async (event) => {
  const select = event.target.closest('[data-action="orderStatus"]');
  if (!select) return;
  const card = select.closest("[data-order-id]");
  await updateOrderStatus(card.dataset.orderId, select.value);
});

document.getElementById("logoutButton").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  location.reload();
});

document.getElementById("pinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const nextPin = document.getElementById("newPinInput").value.trim();
  const response = await fetch("/api/change-pin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-pin": adminPin
    },
    body: JSON.stringify({ pin: nextPin })
  });
  if (response.ok) {
    adminPin = nextPin;
    localStorage.setItem(storageKey, nextPin);
    document.getElementById("pinStatus").textContent = "Şifre değişti.";
  } else {
    document.getElementById("pinStatus").textContent = "Şifre 6-64 karakter olmalı.";
  }
});

if (adminPin) {
  openWorkspace(adminPin).catch(() => {
    localStorage.removeItem(storageKey);
  });
}
