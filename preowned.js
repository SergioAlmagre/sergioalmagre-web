document.addEventListener("DOMContentLoaded", () => {
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

  // Fetch items
  async function fetchItems() {
    try {
      loader.classList.remove("hidden");
      errorMessage.classList.add("hidden");
      productsGrid.classList.add("hidden");
      emptyState.classList.add("hidden");

      const response = await fetch("/api/public/items");
      if (!response.ok) {
        throw new Error("No se pudo cargar el catálogo de Notion. Por favor, inténtalo de nuevo.");
      }

      const data = await response.json();
      items = data.items || [];
      
      applyFilters();
    } catch (error) {
      console.error(error);
      errorMessage.textContent = error.message || "Error al conectar con el servidor.";
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
      
      // Image html
      const imgHtml = item.imageUrl 
        ? `<img src="${item.imageUrl}" alt="${item.title}" loading="lazy">`
        : `<svg class="no-image-placeholder" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="36" height="36">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>`;

      // Savings badge
      const savingsBadgeHtml = item.savingsPercentage > 0
        ? `<span class="dto-badge">-${item.savingsPercentage}% DTO.</span>`
        : "";

      // Qty badge (on image)
      const qtyBadgeHtml = item.cantidad > 1
        ? `<span class="qty-badge">${item.cantidad} UDS.</span>`
        : "";

      // Retail price HTML
      const retailPriceHtml = item.retailPrice > 0
        ? `<span class="product-retail-price">${item.retailPrice} €</span>`
        : "";

      // Stock info
      const stockHtml = item.cantidad > 1
        ? `<span class="product-stock">${item.cantidad} uds. en stock</span>`
        : `<span class="product-stock">1 ud. en stock</span>`;

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
            <h3 class="product-name">${item.title}</h3>
            <div class="product-stock-row">${stockHtml}</div>
            <p class="product-desc">${item.description || "Sin descripción disponible."}</p>
          </div>
          <div class="product-footer">
            <span>${new Date(item.lastEdited).toLocaleDateString()}</span>
            <span class="product-view-btn">
              Ver detalles <span>&rarr;</span>
            </span>
          </div>
        </div>
      `;

      card.addEventListener("click", () => openModal(item));
      productsGrid.appendChild(card);
    });
  }

  // Modal actions
  function openModal(item) {
    modalTitle.textContent = item.title;
    modalDescription.textContent = item.description || "Sin descripción disponible.";
    modalSecondhandPrice.textContent = `${item.secondHandPrice} €`;
    
    if (item.retailPrice > 0) {
      modalRetailPrice.textContent = `${item.retailPrice} €`;
      modalRetailPrice.classList.remove("hidden");
    } else {
      modalRetailPrice.classList.add("hidden");
    }

    if (item.savingsPercentage > 0) {
      modalDtoBadge.textContent = `Ahorras ${item.savingsPercentage}%`;
      modalDtoBadge.classList.remove("hidden");
    } else {
      modalDtoBadge.classList.add("hidden");
    }

    // Image
    modalImageContainer.innerHTML = item.imageUrl 
      ? `<img src="${item.imageUrl}" alt="${item.title}">`
      : `<svg class="no-image-placeholder" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="48" height="48" style="opacity:0.3">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
         </svg>`;

    // Email contact button href setup
    const subject = encodeURIComponent(`Interés en artículo: ${item.title}`);
    const emailBody = encodeURIComponent(`Hola Sergio,\n\nEstoy interesado en adquirir el artículo "${item.title}" listado en tu web por ${item.secondHandPrice} €.\n\nPor favor, confírmame disponibilidad.\n\nUn saludo.`);
    modalEmailBtn.href = `mailto:info@sergioalmagre.com?subject=${subject}&body=${emailBody}`;

    detailModal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Disable background scrolling
  }

  function closeModal() {
    detailModal.classList.add("hidden");
    document.body.style.overflow = ""; // Enable scrolling
  }

  // View toggle
  const viewListBtn = document.getElementById("view-list-btn");
  const viewCategoriesBtn = document.getElementById("view-categories-btn");
  const categoriesGrid = document.getElementById("categories-grid");
  let currentView = "categories"; // "list" or "categories"
  let categoriesData = null;

  // Fetch categories data from API
  async function fetchCategories() {
    try {
      const response = await fetch("/api/public/category-images");
      if (!response.ok) throw new Error("No se pudieron cargar las categorías.");
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
      categoriesGrid.innerHTML = `<div class="empty-state"><h3>No hay categorías disponibles</h3></div>`;
      categoriesGrid.classList.remove("hidden");
      return;
    }

    categoriesGrid.innerHTML = "";

    categoriesData.forEach(cat => {
      const card = document.createElement("div");
      card.className = "category-card";
      card.dataset.category = cat.name;

      const imgHtml = cat.imageUrl
        ? `<img src="${cat.imageUrl}" alt="${cat.name}" loading="lazy">`
        : `<svg class="no-image-placeholder" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="36" height="36">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>`;

      card.innerHTML = `
        <div class="category-card-img-wrap">
          ${imgHtml}
        </div>
        <div class="category-card-body">
          <h3 class="category-card-name">${cat.name}</h3>
          <span class="category-card-count">${cat.itemCount} artículo${cat.itemCount !== 1 ? "s" : ""}</span>
        </div>
      `;

      // Click to filter by this category
      card.addEventListener("click", () => {
        activeCategory = cat.name;
        // Set sort to alphabetical A-Z
        sortSelect.value = "alpha-asc";
        // Switch to list view
        switchView("list");
        applyFilters();
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
        categoriesGrid.innerHTML = `<div class="loader"><div class="spinner"></div><p>Cargando categorías...</p></div>`;
        fetchCategories().then(() => {
          renderCategories();
        });
      } else {
        renderCategories();
      }
    }
  }

  viewListBtn.addEventListener("click", () => switchView("list"));
  viewCategoriesBtn.addEventListener("click", () => switchView("categories"));

  searchInput.addEventListener("input", applyFilters);
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

  // Init - default view is categories
  // Hide main loader since categories view is shown by default
  loader.classList.add("hidden");
  productsGrid.classList.add("hidden");
  categoriesGrid.classList.remove("hidden");
  viewListBtn.classList.remove("active");
  viewCategoriesBtn.classList.add("active");
  sortSelect.disabled = true;
  sortSelect.style.opacity = "0.4";
  sortSelect.style.pointerEvents = "none";
  categoriesGrid.innerHTML = `<div class="loader"><div class="spinner"></div><p>Cargando categorías...</p></div>`;
  
  // Fetch items in background (for list view)
  fetchItems();
  
  // Fetch and show categories immediately
  fetchCategories().then(() => {
    renderCategories();
  });
});
