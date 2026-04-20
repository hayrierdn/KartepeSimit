const state = {
  menu: null,
  search: "",
  activeCategory: "",
  cart: new Map()
};

const currency = () => state.menu?.settings?.currency || "TL";

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("tr-TR")} ${currency()}`;
}

function tableLabel() {
  const params = new URLSearchParams(window.location.search);
  const table = params.get("masa");
  return table ? `Masa ${table}` : "QR Menü";
}

function tableNumber() {
  return new URLSearchParams(window.location.search).get("masa") || "";
}

function itemMatches(item) {
  const query = state.search.trim().toLocaleLowerCase("tr-TR");
  if (!query) return true;
  return `${item.name} ${item.description}`.toLocaleLowerCase("tr-TR").includes(query);
}

function findItem(itemId) {
  for (const category of state.menu.categories) {
    const item = category.items.find((entry) => entry.id === itemId);
    if (item) return { category, item };
  }
  return null;
}

function renderItem(item) {
  const unavailable = item.available ? "" : " unavailable";
  const image = item.imageData ? `<img class="item-image" src="${escapeHtml(item.imageData)}" alt="${escapeHtml(item.name)}">` : "";
  const badge = item.available ? "" : '<span class="badge">Şu an yok</span>';
  const featured = item.featured && item.available ? '<span class="badge">Popüler</span>' : badge;
  const button = item.available
    ? `<button class="small-button add-button" data-add-item="${escapeHtml(item.id)}" type="button">Sepete Ekle</button>`
    : '<button class="small-button" type="button" disabled>Mevcut Değil</button>';
  return `
    <article class="item-card${unavailable}">
      ${image}
      <div class="item-head">
        <h3>${escapeHtml(item.name)}</h3>
        <span class="price">${formatPrice(item.price)}</span>
      </div>
      <p class="description">${escapeHtml(item.description || "")}</p>
      <div class="item-actions">
        ${featured}
        ${button}
      </div>
    </article>
  `;
}

function renderTabs() {
  const tabs = document.getElementById("categoryTabs");
  tabs.innerHTML = state.menu.categories.map((category) => {
    const active = category.id === state.activeCategory ? " active" : "";
    return `<a class="tab${active}" href="#${category.id}" data-category="${category.id}">${escapeHtml(category.name)}</a>`;
  }).join("");
}

function renderFeatured() {
  const section = document.getElementById("featuredSection");
  const grid = document.getElementById("featuredGrid");
  const items = state.menu.categories.flatMap((category) => category.items).filter((item) => item.featured && item.available && itemMatches(item));
  section.hidden = items.length === 0;
  grid.innerHTML = items.map(renderItem).join("");
}

function renderMenu() {
  const logo = document.getElementById("brandLogo");
  const hero = document.getElementById("heroImage");
  if (state.menu.settings.logoData) {
    logo.src = state.menu.settings.logoData;
    logo.hidden = false;
  } else {
    logo.hidden = true;
  }
  if (state.menu.settings.heroImage) {
    hero.src = state.menu.settings.heroImage;
  }
  renderOrderTypes();
  document.getElementById("cafeName").textContent = state.menu.settings.cafeName;
  document.getElementById("tagline").textContent = state.menu.settings.tagline;
  document.getElementById("serviceNote").textContent = state.menu.settings.serviceNote;
  document.getElementById("tableLabel").textContent = tableLabel();

  renderTabs();
  renderFeatured();

  document.getElementById("menuList").innerHTML = state.menu.categories.map((category) => {
    const items = category.items.filter(itemMatches);
    if (!items.length) return "";
    return `
      <section class="category-block" id="${category.id}">
        <h2>${escapeHtml(category.name)}</h2>
        <p>${escapeHtml(category.description || "")}</p>
        <div class="items-grid">${items.map(renderItem).join("")}</div>
      </section>
    `;
  }).join("");
}

function renderOrderTypes() {
  const select = document.getElementById("orderType");
  const current = select.value || "table";
  const delivery = state.menu?.settings?.deliveryEnabled ? '<option value="delivery">Paket teslimat</option>' : "";
  select.innerHTML = `
    <option value="table">Masaya servis</option>
    <option value="pickup">Gel-al paket</option>
    ${delivery}
  `;
  select.value = current === "delivery" && !state.menu.settings.deliveryEnabled ? "table" : current;
  document.getElementById("cartPanel").dataset.orderType = select.value;
}

function cartTotal() {
  let total = 0;
  for (const [itemId, quantity] of state.cart) {
    const found = findItem(itemId);
    if (found) total += Number(found.item.price || 0) * quantity;
  }
  return total;
}

function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const totalQuantity = Array.from(state.cart.values()).reduce((sum, value) => sum + value, 0);
  document.getElementById("cartCount").textContent = `${totalQuantity} ürün`;
  document.getElementById("cartToggleCount").textContent = totalQuantity;
  document.getElementById("cartTotal").textContent = formatPrice(cartTotal());

  if (!state.cart.size) {
    cartItems.innerHTML = "<p>Henüz ürün eklenmedi.</p>";
    return;
  }

  cartItems.innerHTML = Array.from(state.cart.entries()).map(([itemId, quantity]) => {
    const found = findItem(itemId);
    if (!found) return "";
    return `
      <div class="cart-row">
        <div>
          <strong>${escapeHtml(found.item.name)}</strong>
          <span>${formatPrice(found.item.price)} x ${quantity}</span>
        </div>
        <div class="quantity-control">
          <button class="small-button" data-decrease="${escapeHtml(itemId)}" type="button">-</button>
          <span>${quantity}</span>
          <button class="small-button" data-increase="${escapeHtml(itemId)}" type="button">+</button>
        </div>
      </div>
    `;
  }).join("");
}

function addToCart(itemId) {
  const found = findItem(itemId);
  if (!found || !found.item.available) return;
  state.cart.set(itemId, (state.cart.get(itemId) || 0) + 1);
  renderCart();
  openCart();
}

function openCart() {
  document.getElementById("cartPanel").classList.add("open");
}

function closeCart() {
  document.getElementById("cartPanel").classList.remove("open");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.getElementById("searchInput").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderMenu();
});

document.getElementById("categoryTabs").addEventListener("click", (event) => {
  const tab = event.target.closest("[data-category]");
  if (!tab) return;
  state.activeCategory = tab.dataset.category;
  renderTabs();
});

document.body.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-item]");
  const increaseButton = event.target.closest("[data-increase]");
  const decreaseButton = event.target.closest("[data-decrease]");
  if (addButton) addToCart(addButton.dataset.addItem);
  if (increaseButton) addToCart(increaseButton.dataset.increase);
  if (decreaseButton) {
    const itemId = decreaseButton.dataset.decrease;
    const nextQuantity = (state.cart.get(itemId) || 0) - 1;
    if (nextQuantity > 0) state.cart.set(itemId, nextQuantity);
    else state.cart.delete(itemId);
    renderCart();
  }
});

document.getElementById("clearCartButton").addEventListener("click", () => {
  state.cart.clear();
  renderCart();
});

document.getElementById("cartToggle").addEventListener("click", openCart);

document.getElementById("closeCartButton").addEventListener("click", closeCart);

document.getElementById("orderType").addEventListener("change", (event) => {
  document.getElementById("cartPanel").dataset.orderType = event.target.value;
});

document.getElementById("orderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.getElementById("orderStatus");
  if (!state.cart.size) {
    status.textContent = "Sepet boş.";
    return;
  }
  const payload = {
    table: tableNumber(),
    orderType: document.getElementById("orderType").value,
    customer: {
      name: document.getElementById("customerName").value,
      phone: document.getElementById("customerPhone").value,
      address: document.getElementById("customerAddress").value,
      note: document.getElementById("customerNote").value
    },
    items: Array.from(state.cart.entries()).map(([id, quantity]) => ({ id, quantity }))
  };

  status.textContent = "Sipariş gönderiliyor...";
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    status.textContent = data.error || "Sipariş gönderilemedi.";
    return;
  }
  state.cart.clear();
  renderCart();
  event.target.reset();
  document.getElementById("cartPanel").dataset.orderType = "table";
  status.textContent = `Sipariş alındı. Numara: ${data.order.id}`;
});

fetch("/api/menu")
  .then((response) => response.json())
  .then((menu) => {
    state.menu = menu;
    state.activeCategory = menu.categories[0]?.id || "";
    renderMenu();
    renderCart();
  })
  .catch(() => {
    document.getElementById("menuList").innerHTML = '<p class="note">Menü yüklenemedi. Lütfen servis ekibine haber verin.</p>';
  });
