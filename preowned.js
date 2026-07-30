document.addEventListener("DOMContentLoaded", () => {
  const t = (key, vars) => window.I18n ? window.I18n.t(key, vars) : key;
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const safeImageUrl = (value) => {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  };
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  
  const loader = document.getElementById("loader");
  const errorMessage = document.getElementById("error-message");
  const emptyState = document.getElementById("empty-state");
  const productsGrid = document.getElementById("products-grid");
  
  // Modal DOM elements
  const detailModal = document.getElementById("detail-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const modalTitle = document.getElementById("modal-title");
  const modalDescription = document.getElementById("modal-description");
  const modalSecondhandPrice = document.getElementById("modal-secondhand-price");
  const modalRetailPrice = document.getElementById("modal-retail-price");
  const modalDtoBadge = document.getElementById("modal-dto-badge");
  const modalImageContainer = document.getElementById("modal-image-container");
  const modalEmailBtn = document.getElementById("modal-email-btn");

  let items = [];
  let filteredItems = [];
  let activeCategory = "";
  let searchTriggeredView = false; // track if search auto-switched to list
  let itemOpenedInCurrentHistoryEntry = false;

  // Fetch items
  async function fetchItems() {
    try {
      loader.classList.remove("hidden");
      errorMessage.classList.add("hidden");
      productsGrid.classList.add("hidden");
      emptyState.classList.add("hidden");

      const response = await fetch("/api/public/items");
      if (!response.ok) {
        throw new Error(t("store.fetchError"));
      }

      const data = await response.json();
      items = data.items || [];
      
      applyFilters();
      syncItemFromUrl();
    } catch (error) {
      console.error(error);
      errorMessage.textContent = error.message || t("store.fetchError");
      errorMessage.classList.remove("hidden");
    } finally {
      loader.classList.add("hidden");
    }
  }

  // Apply filters and sort
  function applyFilters() {
    const query = searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const sortBy = sortSelect.value;

    filteredItems = items.filter(item => {
      const titleClean = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const descClean = (item.description || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const matchesSearch = titleClean.includes(query) || descClean.includes(query);
      const matchesCategory = activeCategory === "" || item.naturaleza === activeCategory;

      return matchesSearch && matchesCategory;
    });

    // Sort
    if (sortBy === "price-asc") {
      filteredItems.sort((a, b) => a.secondHandPrice - b.secondHandPrice);
    } else if (sortBy === "price-desc") {
      filteredItems.sort((a, b) => b.secondHandPrice - a.secondHandPrice);
    } else if (sortBy === "alpha-asc") {
      filteredItems.sort((a, b) => a.title.localeCompare(b.title, "es"));
    } else if (sortBy === "alpha-desc") {
      filteredItems.sort((a, b) => b.title.localeCompare(a.title, "es"));
    } else {
      // default: recent (lastEdited descending)
      filteredItems.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited));
    }

    renderItems();
  }

  // Render items
  function renderItems() {
    productsGrid.innerHTML = "";
    
    if (filteredItems.length === 0) {
      if (currentView === "list") {
        emptyState.classList.remove("hidden");
      }
      productsGrid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    
    // Only show products grid if we're in list view
    if (currentView === "list") {
      productsGrid.classList.remove("hidden");
    } else {
      productsGrid.classList.add("hidden");
    }

    filteredItems.forEach(item => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      const title = escapeHtml(item.title);
      const description = escapeHtml(item.description || t("store.noDescription"));
      const imageUrl = safeImageUrl(item.imageUrl);
      
      // Image html
      const imgHtml = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy">`
        : `<svg class="no-image-placeholder" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="36" height="36">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>`;

      // Savings badge
      const savingsBadgeHtml = item.savingsPercentage > 0
        ? `<span class="dto-badge">${t("store.savings", { percentage: item.savingsPercentage })}</span>`
        : "";

      // Qty badge (on image)
      const qtyBadgeHtml = item.cantidad > 1
        ? `<span class="qty-badge">${t("store.units", { count: item.cantidad })}</span>`
        : "";

      // Retail price HTML
      const retailPriceHtml = item.retailPrice > 0
        ? `<span class="product-retail-price">${item.retailPrice} €</span>`
        : "";

      // Stock info
      const stockHtml = item.cantidad > 1
        ? `<span class="product-stock">${t("store.inStock", { count: item.cantidad })}</span>`
        : `<span class="product-stock">${t("store.inStockOne")}</span>`;

      card.innerHTML = `
        <div class="product-img-wrap">
          ${imgHtml}
          ${savingsBadgeHtml}
          ${qtyBadgeHtml}
        </div>
        <div class="product-body">
          <div>
            <div class="product-price-row">
              <span class="product-price">${item.secondHandPrice} €</span>
              ${retailPriceHtml}
            </div>
            <h3 class="product-name">${title}</h3>
            <div class="product-stock-row">${stockHtml}</div>
            <p class="product-desc">${description}</p>
          </div>
          <div class="product-footer">
            <span>${new Date(item.lastEdited).toLocaleDateString()}</span>
            <span class="product-view-btn">
              ${t("store.details")} <span>&rarr;</span>
            </span>
          </div>
        </div>
      `;

      const activateCard = () => openModal(item);
      card.addEventListener("click", activateCard);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateCard();
        }
      });
      productsGrid.appendChild(card);
    });
  }

  // Modal actions
  function openModal(item, { updateUrl = true } = {}) {
    if (updateUrl && item.id) {
      const itemUrl = new URL("/preowned", window.location.origin);
      itemUrl.searchParams.set("item", item.id);
      // Bump this when preview metadata changes so WhatsApp does not reuse an old card.
      itemUrl.searchParams.set("v", "2");
      history.pushState(
        {
          ...(history.state || {}),
          preownedView: "list",
          category: activeCategory,
          preownedItem: item.id,
        },
        "",
        itemUrl.href
      );
      itemOpenedInCurrentHistoryEntry = true;
    }

    modalTitle.textContent = item.title;
    modalDescription.textContent = item.description || t("store.noDescription");
    modalSecondhandPrice.textContent = `${item.secondHandPrice} €`;
    
    if (item.retailPrice > 0) {
      modalRetailPrice.textContent = `${item.retailPrice} €`;
      modalRetailPrice.classList.remove("hidden");
    } else {
      modalRetailPrice.classList.add("hidden");
    }

    if (item.savingsPercentage > 0) {
      modalDtoBadge.textContent = t("store.savings", { percentage: item.savingsPercentage });
      modalDtoBadge.classList.remove("hidden");
    } else {
      modalDtoBadge.classList.add("hidden");
    }

    // Image
    const imageUrl = safeImageUrl(item.imageUrl);
    modalImageContainer.innerHTML = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}">`
      : `<svg class="no-image-placeholder" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="48" height="48" style="opacity:0.3">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
         </svg>`;

    // Email contact button href setup
    const subject = encodeURIComponent(t("store.subject", { title: item.title }));
    const emailBody = encodeURIComponent(t("store.emailBody", { title: item.title, price: item.secondHandPrice }));
    modalEmailBtn.href = `mailto:info@sergioalmagre.com?subject=${subject}&body=${emailBody}`;

    detailModal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Disable background scrolling
  }

  function closeModal({ updateUrl = true } = {}) {
    if (updateUrl) {
      if (itemOpenedInCurrentHistoryEntry) {
        itemOpenedInCurrentHistoryEntry = false;
        history.back();
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("item");
      const state = { ...(history.state || {}) };
      delete state.preownedItem;
      history.replaceState(state, "", url.href);
    }

    detailModal.classList.add("hidden");
    document.body.style.overflow = ""; // Enable scrolling
  }

  function syncItemFromUrl() {
    const itemId = new URLSearchParams(window.location.search).get("item");
    const item = itemId ? items.find((candidate) => candidate.id === itemId) : null;

    if (item) {
      openModal(item, { updateUrl: false });
    } else if (!detailModal.classList.contains("hidden")) {
      closeModal({ updateUrl: false });
    }
  }

  // View toggle
  const viewListBtn = document.getElementById("view-list-btn");
  const viewCategoriesBtn = document.getElementById("view-categories-btn");
  const categoriesGrid = document.getElementById("categories-grid");
  let currentView = "categories"; // "list" or "categories"
  let categoriesData = null;

  // Keep catalogue view changes in the browser history so Back returns to
  // categories before leaving the pre-owned page.
  const categoryFromUrl = new URLSearchParams(window.location.search).get("category") || "";
  const initialItemId = new URLSearchParams(window.location.search).get("item") || "";
  const initialCatalogueView = categoryFromUrl || initialItemId ? "list" : "categories";
  if (categoryFromUrl) {
    activeCategory = categoryFromUrl;
    currentView = "list";
  }
  const initialHistoryState = history.state || {};
  if (
    initialHistoryState.preownedView !== initialCatalogueView ||
    initialHistoryState.category !== categoryFromUrl ||
    initialHistoryState.preownedItem !== initialItemId
  ) {
    history.replaceState(
      {
        ...initialHistoryState,
        preownedView: initialCatalogueView,
        category: categoryFromUrl,
        preownedItem: initialItemId || null,
      },
      "",
      window.location.href
    );
  }

  function pushCatalogueView(view, category = "") {
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("category", category);
    else url.searchParams.delete("category");
    history.pushState({ preownedView: view, category }, "", url.href);
  }

  // Fetch categories data from API
  async function fetchCategories() {
    try {
      const response = await fetch("/api/public/category-images");
      if (!response.ok) throw new Error(t("store.fetchError"));
      const data = await response.json();
      categoriesData = data.categories || [];
      return categoriesData;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  function renderCategories() {
    if (!categoriesData || categoriesData.length === 0) {
        categoriesGrid.innerHTML = `<div class="empty-state"><h3>${t("store.noCategories")}</h3></div>`;
      categoriesGrid.classList.remove("hidden");
      return;
    }

    categoriesGrid.innerHTML = "";

    categoriesData.forEach(cat => {
      const card = document.createElement("div");
      card.className = "category-card";
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.dataset.category = cat.name;
      const categoryName = escapeHtml(cat.name);
      const imageUrl = safeImageUrl(cat.imageUrl);

      const imgHtml = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="${categoryName}" loading="lazy">`
        : `<svg class="no-image-placeholder" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="36" height="36">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>`;

      card.innerHTML = `
        <div class="category-card-img-wrap">
          ${imgHtml}
        </div>
        <div class="category-card-body">
          <h3 class="category-card-name">${categoryName}</h3>
            <span class="category-card-count">${cat.itemCount === 1 ? t("store.unit", { count: cat.itemCount }) : t("store.units", { count: cat.itemCount })}</span>
        </div>
      `;

      // Click to filter by this category
      const activateCategory = () => {
        activeCategory = cat.name;
        pushCatalogueView("list", cat.name);
        // Set sort to alphabetical A-Z
        sortSelect.value = "alpha-asc";
        // Switch to list view
        switchView("list");
        applyFilters();
      };
      card.addEventListener("click", activateCategory);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateCategory();
        }
      });

      categoriesGrid.appendChild(card);
    });
  }

  function switchView(view) {
    currentView = view;
    if (view === "list") {
      productsGrid.classList.remove("hidden");
      categoriesGrid.classList.add("hidden");
      viewListBtn.classList.add("active");
      viewCategoriesBtn.classList.remove("active");
      sortSelect.disabled = false;
      sortSelect.style.opacity = "1";
      sortSelect.style.pointerEvents = "auto";
      // Show loader if items haven't loaded yet
      if (items.length === 0) {
        loader.classList.remove("hidden");
        productsGrid.classList.add("hidden");
      }
      renderItems();
    } else {
      productsGrid.classList.add("hidden");
      categoriesGrid.classList.remove("hidden");
      viewListBtn.classList.remove("active");
      viewCategoriesBtn.classList.add("active");
      sortSelect.disabled = true;
      sortSelect.style.opacity = "0.4";
      sortSelect.style.pointerEvents = "none";
      // Load categories if needed
      if (!categoriesData) {
        categoriesGrid.innerHTML = `<div class="loader"><p>${t("store.loadingCategories")}</p></div>`;
        fetchCategories().then(() => {
          renderCategories();
        });
      } else {
        renderCategories();
      }
    }
  }

  viewListBtn.addEventListener("click", () => {
    searchTriggeredView = false;
    switchView("list");
  });
  viewCategoriesBtn.addEventListener("click", () => {
    searchTriggeredView = false;
    switchView("categories");
  });

  window.addEventListener("popstate", (event) => {
    const state = event.state || {};
    activeCategory = state.preownedView === "list" ? (state.category || "") : "";
    searchTriggeredView = false;
    if (state.preownedView === "list") {
      sortSelect.value = "alpha-asc";
      switchView("list");
    } else {
      switchView("categories");
    }
    applyFilters();
    itemOpenedInCurrentHistoryEntry = false;
    syncItemFromUrl();
  });

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    
    // If user types and we're in categories view → auto-switch to list
    if (query.length > 0 && currentView === "categories") {
      searchTriggeredView = true;
      switchView("list");
    }
    
    // If user cleared search and we had auto-switched → restore categories
    if (query.length === 0 && searchTriggeredView) {
      searchTriggeredView = false;
      switchView("categories");
      return; // switchView already calls renderCategories, no need for applyFilters
    }
    
    applyFilters();
  });
  sortSelect.addEventListener("change", applyFilters);
  
  closeModalBtn.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) {
      closeModal();
    }
  });
  
  // ESC key closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !detailModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  window.addEventListener("languagechange", () => {
    renderItems();
    renderCategories();
  });

  // Init - default view is categories, unless a category was shared in the URL
  // The main loader (#loader) is shown by fetchItems(), that's the only spinner we need
  if (initialCatalogueView === "list") {
    sortSelect.value = "alpha-asc";
    switchView("list");
  } else {
    productsGrid.classList.add("hidden");
    categoriesGrid.classList.remove("hidden");
    viewListBtn.classList.remove("active");
    viewCategoriesBtn.classList.add("active");
    sortSelect.disabled = true;
    sortSelect.style.opacity = "0.4";
    sortSelect.style.pointerEvents = "none";
  }
  
  // Fetch items in background (for list view) — shows the main loader
  fetchItems();
  
  // Fetch and show categories immediately
  fetchCategories().then(() => {
    renderCategories();
    // Si estamos en vista de categorías, ocultamos el loader en cuanto
    // las categorías están listas, sin esperar a que terminen los items.
    if (currentView === "categories") {
      loader.classList.add("hidden");
    }
  });
});
