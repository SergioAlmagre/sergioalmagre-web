document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  const minPriceInput = document.getElementById("min-price");
  const maxPriceInput = document.getElementById("max-price");
  const categorySelect = document.getElementById("category-select");
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
      
      populateCategories();
      applyFilters();
    } catch (error) {
      console.error(error);
      errorMessage.textContent = error.message || "Error al conectar con el servidor.";
      errorMessage.classList.remove("hidden");
    } finally {
      loader.classList.add("hidden");
    }
  }

  // Populate categories list
  function populateCategories() {
    const categories = new Set();
    items.forEach(item => {
      if (item.naturaleza) {
        categories.add(item.naturaleza);
      }
    });

    categorySelect.innerHTML = '<option value="">Todas las categorías</option>';
    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }

  // Apply filters and sort
  function applyFilters() {
    const query = searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const minVal = minPriceInput.value === "" ? -Infinity : parseFloat(minPriceInput.value);
    const maxVal = maxPriceInput.value === "" ? Infinity : parseFloat(maxPriceInput.value);
    const category = categorySelect.value;
    const sortBy = sortSelect.value;

    filteredItems = items.filter(item => {
      const titleClean = item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const descClean = (item.description || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const matchesSearch = titleClean.includes(query) || descClean.includes(query);
      const matchesCategory = category === "" || item.naturaleza === category;
      const matchesMin = item.secondHandPrice >= minVal;
      const matchesMax = item.secondHandPrice <= maxVal;

      return matchesSearch && matchesCategory && matchesMin && matchesMax;
    });

    // Sort
    if (sortBy === "price-asc") {
      filteredItems.sort((a, b) => a.secondHandPrice - b.secondHandPrice);
    } else if (sortBy === "price-desc") {
      filteredItems.sort((a, b) => b.secondHandPrice - a.secondHandPrice);
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
      emptyState.classList.remove("hidden");
      productsGrid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    productsGrid.classList.remove("hidden");

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

      // Qty badge
      const qtyBadgeHtml = item.cantidad > 1
        ? `<span class="qty-badge">${item.cantidad} UDS.</span>`
        : "";

      // Retail price HTML
      const retailPriceHtml = item.retailPrice > 0
        ? `<span class="product-retail-price">${item.retailPrice} €</span>`
        : "";

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

  // Setup listeners
  searchInput.addEventListener("input", applyFilters);
  minPriceInput.addEventListener("input", applyFilters);
  maxPriceInput.addEventListener("input", applyFilters);
  categorySelect.addEventListener("change", applyFilters);
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

  // Init
  fetchItems();
});
