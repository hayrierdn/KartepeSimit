const storageKey = "sabitQrAdminPin";
let adminPin = localStorage.getItem(storageKey) || "";
let knownOrderIds = new Set();
let soundEnabled = false;
let settings = {};
let hasRingingNewOrders = false;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("tr-TR")} ${settings.currency || "TL"}`;
}

function statusLabel(status) {
  return { new: "Yeni", preparing: "Hazırlanıyor", ready: "Hazır", done: "Tamamlandı", cancelled: "İptal" }[status] || "Yeni";
}

function orderTypeLabel(type) {
  return { table: "Masaya servis", pickup: "Gel-al paket", delivery: "Paket teslimat" }[type] || "Sipariş";
}

function playSound() {
  if (!soundEnabled) return;
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const oscillatorTwo = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "square";
  oscillatorTwo.type = "triangle";
  oscillator.frequency.value = 1046;
  oscillatorTwo.frequency.value = 1568;
  gain.gain.setValueAtTime(0.001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.75, audio.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 1.05);
  oscillator.connect(gain);
  oscillatorTwo.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillatorTwo.start(audio.currentTime + 0.12);
  oscillator.stop(audio.currentTime + 1.1);
  oscillatorTwo.stop(audio.currentTime + 1.1);
}

async function verifyPassword(password) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: password })
  });
  return response.ok;
}

async function loadSettings() {
  const response = await fetch("/api/menu");
  const menu = await response.json();
  settings = menu.settings || {};
}

async function loadOrders(playAlert = true) {
  await loadSettings();
  const response = await fetch("/api/orders", { headers: { "x-admin-pin": adminPin } });
  const data = await response.json();
  const list = document.getElementById("tabletOrdersList");
  const today = new Date().toLocaleDateString("tr-TR");
  const todayOrders = data.orders.filter((order) => new Date(order.createdAt).toLocaleDateString("tr-TR") === today);
  const todayTotal = todayOrders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
  document.getElementById("dailySummary").textContent = `Bugün: ${todayOrders.length} sipariş - ${formatPrice(todayTotal)}`;
  const activeOrders = data.orders.filter((order) => !["done", "cancelled"].includes(order.status));
  const fresh = activeOrders.filter((order) => !knownOrderIds.has(order.id));
  const newOrders = activeOrders.filter((order) => order.status === "new");
  hasRingingNewOrders = newOrders.length > 0;
  if (playAlert && knownOrderIds.size && (fresh.length || hasRingingNewOrders)) playSound();
  knownOrderIds = new Set(data.orders.map((order) => order.id));

  if (!activeOrders.length) {
    list.innerHTML = "<p>Aktif sipariş yok.</p>";
  } else {
    list.innerHTML = activeOrders.map((order) => {
      return `
        <article class="order-card tablet-order ${order.status === "new" ? "is-new" : ""}" data-order-id="${escapeHtml(order.id)}">
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
            <span>${escapeHtml(order.customer.name || "")}</span>
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
  document.getElementById("lastRefresh").textContent = `Son yenileme: ${new Date().toLocaleTimeString("tr-TR")}`;
}

async function updateOrderStatus(orderId, status) {
  await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
    body: JSON.stringify({ status })
  });
  await loadOrders(false);
}

async function openWorkspace(pin, alreadyVerified = false) {
  if (!alreadyVerified && !(await verifyPassword(pin))) {
    localStorage.removeItem(storageKey);
    return;
  }
  adminPin = pin;
  localStorage.setItem(storageKey, pin);
  document.getElementById("tabletLoginPanel").hidden = true;
  document.getElementById("tabletWorkspace").hidden = false;
  await loadOrders(false);
  setInterval(() => loadOrders(true), 7000);
  setInterval(() => {
    if (hasRingingNewOrders) playSound();
  }, 3500);
}

document.getElementById("tabletLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const pin = document.getElementById("tabletPinInput").value.trim();
  if (await verifyPassword(pin)) await openWorkspace(pin, true);
  else document.getElementById("tabletLoginStatus").textContent = "Şifre hatalı.";
});

document.getElementById("soundButton").addEventListener("click", () => {
  soundEnabled = true;
  playSound();
  document.getElementById("soundButton").textContent = "Ses Açık";
});

document.getElementById("tabletRefreshButton").addEventListener("click", () => loadOrders(false));

document.getElementById("tabletOrdersList").addEventListener("change", async (event) => {
  const select = event.target.closest('[data-action="orderStatus"]');
  if (!select) return;
  const card = select.closest("[data-order-id]");
  await updateOrderStatus(card.dataset.orderId, select.value);
});

if (adminPin) openWorkspace(adminPin).catch(() => localStorage.removeItem(storageKey));
