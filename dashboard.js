// State management
let items = [];
let notionSchema = {};
let filterRules = [];
let filteredItems = [];
let expandedIds = {};
let selectedItemIds = {};
let activeRuleDropdown = null;
let isBulkProcessing = false;
let bulkProgress = { current: 0, total: 0 };
let bulkCancel = false;
let analyzingIds = {};
let savingIds = {};
let currentConfigItem = null;

// --- AI Model selection state persistence ---
const MODEL_STORAGE_KEY = "dashboard_selected_ai_model_v1";
let selectedAIModel = localStorage.getItem(MODEL_STORAGE_KEY) || "llama-3.1-8b-instant";

// --- Discount range filter state ---
const DISCOUNT_STORAGE_KEY = "dashboard_discount_filter_v1";
let discountFilterEnabled = false;
let discountFilterMin = 0;
let discountFilterMax = 100;

// --- Stats Discount range filter state ---
const STATS_DISCOUNT_STORAGE_KEY = "dashboard_stats_discount_filter_v1";
let statsDiscountFilterEnabled = false;
let statsDiscountFilterMin = 0;
let statsDiscountFilterMax = 100;

function saveDiscountFilterToStorage() {
  try {
    localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify({
      enabled: discountFilterEnabled,
      min: discountFilterMin,
      max: discountFilterMax
    }));
  } catch (_) {}
}

function loadDiscountFilterFromStorage() {
  try {
    const raw = localStorage.getItem(DISCOUNT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      discountFilterEnabled = !!parsed.enabled;
      discountFilterMin = typeof parsed.min === "number" ? parsed.min : 0;
      discountFilterMax = typeof parsed.max === "number" ? parsed.max : 100;
    }
  } catch (_) {}
}

function saveStatsDiscountToStorage() {
  try {
    localStorage.setItem(STATS_DISCOUNT_STORAGE_KEY, JSON.stringify({
      enabled: statsDiscountFilterEnabled,
      min: statsDiscountFilterMin,
      max: statsDiscountFilterMax
    }));
  } catch (_) {}
}

function loadStatsDiscountFromStorage() {
  try {
    const raw = localStorage.getItem(STATS_DISCOUNT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      statsDiscountFilterEnabled = !!parsed.enabled;
      statsDiscountFilterMin = typeof parsed.min === "number" ? parsed.min : 0;
      statsDiscountFilterMax = typeof parsed.max === "number" ? parsed.max : 100;
    }
  } catch (_) {}
}

// --- Filter persistence via localStorage ---
const FILTER_STORAGE_KEY = "dashboard_filterRules_v1";
const STATS_FILTER_STORAGE_KEY = "dashboard_stats_filterRules_v1";
let statsFilterRules = [];

function saveFiltersToStorage() {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterRules));
  } catch (_) {}
}

function loadFiltersFromStorage() {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) filterRules = parsed;
    }
  } catch (_) {}
}

function saveStatsFiltersToStorage() {
  try {
    localStorage.setItem(STATS_FILTER_STORAGE_KEY, JSON.stringify(statsFilterRules));
  } catch (_) {}
}

function loadStatsFiltersFromStorage() {
  try {
    const raw = localStorage.getItem(STATS_FILTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) statsFilterRules = parsed;
    }
  } catch (_) {}
}

// DOM Elements
const loader = document.getElementById("dash-loader");
const errorBox = document.getElementById("dash-error");
const itemsListContainer = document.getElementById("items-list-container");
const itemsList = document.getElementById("items-list");
const selectAllCheckbox = document.getElementById("select-all-items");

const searchInput = document.getElementById("dash-search");
const bulkEnrichBtn = document.getElementById("bulk-enrich-btn");

const statNotionCount = document.getElementById("stat-notion-count");
const statFilteredCount = document.getElementById("stat-filtered-count");
const statSelectedCount = document.getElementById("stat-selected-count");

// Stats tab elements
const statTotalModels = document.getElementById("stat-total-models");
const statTotalUnits = document.getElementById("stat-total-units");
const statSoldUnits = document.getElementById("stat-sold-units");
const statTotalCost = document.getElementById("stat-total-cost");
const statTotalRevenue = document.getElementById("stat-total-revenue");
const statTotalRetail = document.getElementById("stat-total-retail");
const statExpectedProfit = document.getElementById("stat-expected-profit");
const statsTableBody = document.getElementById("stats-table-body");

// Chart display unit mode selectors ("val" or "pct")
let chartDisplayModes = {
  categoryBar: "val",
  unitsPie: "val",
  financePie: "val"
};

// Stats filter DOM elements
const statsSearchInput = document.getElementById("stats-dash-search");
const statsAddFilterRuleBtn = document.getElementById("stats-add-filter-rule-btn");
const statsClearFiltersBtn = document.getElementById("stats-clear-filters-btn");
const statsFilterRulesList = document.getElementById("stats-filter-rules-list");
const statsNoFiltersMsg = document.getElementById("stats-no-filters-msg");

const statsDiscountToggle = document.getElementById("stats-discount-filter-toggle");
const statsDiscountFilterBody = document.getElementById("stats-discount-filter-body");
const statsDiscountMinInput = document.getElementById("stats-discount-min");
const statsDiscountMaxInput = document.getElementById("stats-discount-max");
const statsDiscountMinLabel = document.getElementById("stats-discount-min-label");
const statsDiscountMaxLabel = document.getElementById("stats-discount-max-label");
const statsDiscountRangeSummary = document.getElementById("stats-discount-range-summary");
const statsDualRangeFill = document.getElementById("stats-dual-range-fill");

// Toast Container
const toastContainer = document.getElementById("toast-container");

// Modals
const sellPriceModal = document.getElementById("sell-price-modal");
const sellModalItemName = document.getElementById("sell-modal-item-name");
const sellModalPurchasePrice = document.getElementById("sell-modal-purchase-price");
const sellModalSalePrice = document.getElementById("sell-modal-sale-price");
const sellModalSuggestedPriceWrap = document.getElementById("sell-modal-suggested-price-wrap");
const sellModalSuggestedPrice = document.getElementById("sell-modal-suggested-price");
const sellModalCancel = document.getElementById("sell-modal-cancel");
const sellModalConfirm = document.getElementById("sell-modal-confirm");

const generalConfirmModal = document.getElementById("general-confirm-modal");
const confirmModalTitle = document.getElementById("confirm-modal-title");
const confirmModalMessage = document.getElementById("confirm-modal-message");
const confirmModalCancel = document.getElementById("confirm-modal-cancel");
const confirmModalConfirm = document.getElementById("confirm-modal-confirm");

const itemConfigModal = document.getElementById("item-config-modal");
const configPropertiesBody = document.getElementById("config-properties-body");
const configModalCancel = document.getElementById("config-modal-cancel");
const configModalSave = document.getElementById("config-modal-save");
const configModalDelete = document.getElementById("config-modal-delete");

// Add Item modal elements
const addItemBtn = document.getElementById("add-item-btn");
const addItemModal = document.getElementById("add-item-modal");
const addItemCancel = document.getElementById("add-item-cancel");
const addItemSave = document.getElementById("add-item-save");
const addItemTitle = document.getElementById("add-item-title");
const addItemCategorySelect = document.getElementById("add-item-category-select");
const addItemCategoryCustom = document.getElementById("add-item-category-custom");
const addItemBrandSelect = document.getElementById("add-item-brand-select");
const addItemBrandCustom = document.getElementById("add-item-brand-custom");
const addItemRetail = document.getElementById("add-item-retail");
const addItemPurchase = document.getElementById("add-item-purchase");
const addItemSale = document.getElementById("add-item-sale");
const addItemImage = document.getElementById("add-item-image");
const addItemDescription = document.getElementById("add-item-description");
const addItemQuantity = document.getElementById("add-item-quantity");
const addItemPublicar = document.getElementById("add-item-publicar");

// Tabs switching
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Configuration tab elements
const aiModelSelect = document.getElementById("ai-model-select");
const saveConfigBtn = document.getElementById("save-config-btn");

if (aiModelSelect) {
  aiModelSelect.value = selectedAIModel;
}

if (saveConfigBtn) {
  saveConfigBtn.addEventListener("click", () => {
    if (aiModelSelect) {
      selectedAIModel = aiModelSelect.value;
      try {
        localStorage.setItem(MODEL_STORAGE_KEY, selectedAIModel);
        showToast(`Configuración guardada: Modelo ${selectedAIModel} seleccionado.`, "success");
      } catch (_) {
        showToast("Error al guardar la configuración localmente.", "error");
      }
    }
  });
}

// Discount range filter elements
const discountToggle = document.getElementById("discount-filter-toggle");
const discountFilterBody = document.getElementById("discount-filter-body");
const discountMinInput = document.getElementById("discount-min");
const discountMaxInput = document.getElementById("discount-max");
const discountMinLabel = document.getElementById("discount-min-label");
const discountMaxLabel = document.getElementById("discount-max-label");
const discountRangeSummary = document.getElementById("discount-range-summary");
const dualRangeFill = document.getElementById("dual-range-fill");

function updateDiscountSliderUI() {
  if (!discountMinInput || !discountMaxInput || !dualRangeFill) return;
  
  const minPercent = parseInt(discountMinInput.value, 10);
  const maxPercent = parseInt(discountMaxInput.value, 10);

  if (discountMinLabel) discountMinLabel.textContent = minPercent;
  if (discountMaxLabel) discountMaxLabel.textContent = maxPercent;
  if (discountRangeSummary) {
    discountRangeSummary.textContent = `${minPercent}% – ${maxPercent}%`;
  }

  // Update visual fill track
  dualRangeFill.style.left = minPercent + "%";
  dualRangeFill.style.width = (maxPercent - minPercent) + "%";

  discountFilterMin = minPercent;
  discountFilterMax = maxPercent;
}

function updateStatsDiscountSliderUI() {
  if (!statsDiscountMinInput || !statsDiscountMaxInput || !statsDualRangeFill) return;
  
  const minPercent = parseInt(statsDiscountMinInput.value, 10);
  const maxPercent = parseInt(statsDiscountMaxInput.value, 10);

  if (statsDiscountMinLabel) statsDiscountMinLabel.textContent = minPercent;
  if (statsDiscountMaxLabel) statsDiscountMaxLabel.textContent = maxPercent;
  if (statsDiscountRangeSummary) {
    statsDiscountRangeSummary.textContent = `${minPercent}% – ${maxPercent}%`;
  }

  // Update visual fill track
  statsDualRangeFill.style.left = minPercent + "%";
  statsDualRangeFill.style.width = (maxPercent - minPercent) + "%";

  statsDiscountFilterMin = minPercent;
  statsDiscountFilterMax = maxPercent;
}

if (discountMinInput && discountMaxInput) {
  discountMinInput.addEventListener("input", () => {
    if (parseInt(discountMinInput.value, 10) > parseInt(discountMaxInput.value, 10)) {
      discountMinInput.value = discountMaxInput.value;
    }
    discountMinInput.style.zIndex = "4";
    discountMaxInput.style.zIndex = "3";
    updateDiscountSliderUI();
    saveDiscountFilterToStorage();
    if (discountFilterEnabled) {
      applyFilters();
    }
  });

  discountMaxInput.addEventListener("input", () => {
    if (parseInt(discountMaxInput.value, 10) < parseInt(discountMinInput.value, 10)) {
      discountMaxInput.value = discountMinInput.value;
    }
    discountMaxInput.style.zIndex = "4";
    discountMinInput.style.zIndex = "3";
    updateDiscountSliderUI();
    saveDiscountFilterToStorage();
    if (discountFilterEnabled) {
      applyFilters();
    }
  });
}

if (statsDiscountMinInput && statsDiscountMaxInput) {
  statsDiscountMinInput.addEventListener("input", () => {
    if (parseInt(statsDiscountMinInput.value, 10) > parseInt(statsDiscountMaxInput.value, 10)) {
      statsDiscountMinInput.value = statsDiscountMaxInput.value;
    }
    statsDiscountMinInput.style.zIndex = "4";
    statsDiscountMaxInput.style.zIndex = "3";
    updateStatsDiscountSliderUI();
    saveStatsDiscountToStorage();
    if (statsDiscountFilterEnabled) {
      applyStatsFilters();
    }
  });

  statsDiscountMaxInput.addEventListener("input", () => {
    if (parseInt(statsDiscountMaxInput.value, 10) < parseInt(statsDiscountMinInput.value, 10)) {
      statsDiscountMaxInput.value = statsDiscountMinInput.value;
    }
    statsDiscountMaxInput.style.zIndex = "4";
    statsDiscountMinInput.style.zIndex = "3";
    updateStatsDiscountSliderUI();
    saveStatsDiscountToStorage();
    if (statsDiscountFilterEnabled) {
      applyStatsFilters();
    }
  });
}

if (discountToggle) {
  discountToggle.addEventListener("change", (e) => {
    discountFilterEnabled = e.target.checked;
    if (discountFilterBody) {
      if (discountFilterEnabled) {
        discountFilterBody.classList.remove("disabled");
      } else {
        discountFilterBody.classList.add("disabled");
      }
    }
    saveDiscountFilterToStorage();
    applyFilters();
  });
}

if (statsDiscountToggle) {
  statsDiscountToggle.addEventListener("change", (e) => {
    statsDiscountFilterEnabled = e.target.checked;
    if (statsDiscountFilterBody) {
      if (statsDiscountFilterEnabled) {
        statsDiscountFilterBody.classList.remove("disabled");
      } else {
        statsDiscountFilterBody.classList.add("disabled");
      }
    }
    saveStatsDiscountToStorage();
    applyStatsFilters();
  });
}

// Initial discount loader setup
loadDiscountFilterFromStorage();
if (discountToggle) {
  discountToggle.checked = discountFilterEnabled;
  if (discountFilterBody) {
    if (discountFilterEnabled) {
      discountFilterBody.classList.remove("disabled");
    } else {
      discountFilterBody.classList.add("disabled");
    }
  }
}
if (discountMinInput && discountMaxInput) {
  discountMinInput.value = discountFilterMin;
  discountMaxInput.value = discountFilterMax;
}
updateDiscountSliderUI();

loadStatsDiscountFromStorage();
if (statsDiscountToggle) {
  statsDiscountToggle.checked = statsDiscountFilterEnabled;
  if (statsDiscountFilterBody) {
    if (statsDiscountFilterEnabled) {
      statsDiscountFilterBody.classList.remove("disabled");
    } else {
      statsDiscountFilterBody.classList.add("disabled");
    }
  }
}
if (statsDiscountMinInput && statsDiscountMaxInput) {
  statsDiscountMinInput.value = statsDiscountFilterMin;
  statsDiscountMaxInput.value = statsDiscountFilterMax;
}
updateStatsDiscountSliderUI();

let sellModalCallbacks = { onConfirm: null, onCancel: null };
let confirmModalCallbacks = { onConfirm: null, onCancel: null };

// Toast helper
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast-item animate-slideIn ${type}`;
  
  let icon = "";
  if (type === "success") {
    icon = `<svg style="width: 14px; height: 14px; color: #10b981;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`;
  } else if (type === "error") {
    icon = `<svg style="width: 14px; height: 14px; color: #f43f5e;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  } else {
    icon = `<svg style="width: 14px; height: 14px; color: #a78bfa;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  }

  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "0.5rem";
  toast.style.background = "var(--bg3)";
  toast.style.border = "1px solid var(--border)";
  toast.style.padding = "0.6rem 1rem";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "0.75rem";
  toast.style.fontFamily = "var(--font-mono)";
  toast.style.color = "var(--text)";
  toast.style.pointerEvents = "auto";
  
  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Confirmation helper
function openConfirmModal(title, message, onConfirm, onCancel = null) {
  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  generalConfirmModal.classList.remove("hidden");
  
  confirmModalCallbacks.onConfirm = () => {
    generalConfirmModal.classList.add("hidden");
    if (onConfirm) onConfirm();
  };
  
  confirmModalCallbacks.onCancel = () => {
    generalConfirmModal.classList.add("hidden");
    if (onCancel) onCancel();
  };
}

confirmModalConfirm.addEventListener("click", () => confirmModalCallbacks.onConfirm?.());
confirmModalCancel.addEventListener("click", () => confirmModalCallbacks.onCancel?.());

// Logout
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        window.location.href = "/login.html";
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// Load inventory data
async function fetchNotionItems() {
  loader.classList.remove("hidden");
  itemsListContainer.classList.add("hidden");
  errorBox.classList.add("hidden");

  try {
    const response = await fetch("/api/notion/items");
    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/login.html";
        return;
      }
      throw new Error(`Fallo al consultar la base de datos (${response.status})`);
    }

    const data = await response.json();
    items = data.items || [];
    notionSchema = data.schema || {};

    // Restore saved filters and render them now that we have the schema!
    loadFiltersFromStorage();
    if (filterRules.length > 0) {
      renderFilterRules();
    }

    // Restore stats filters too!
    loadStatsFiltersFromStorage();
    if (statsFilterRules.length > 0) {
      renderStatsFilterRules();
    }

    applyFilters();
    applyStatsFilters();
  } catch (err) {
    console.error(err);
    errorBox.textContent = err.message || "Error al conectar con el inventario.";
    errorBox.classList.remove("hidden");
  } finally {
    loader.classList.add("hidden");
  }
}

// Tab navigation
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.add("hidden"));
    
    btn.classList.add("active");
    const tabId = btn.getAttribute("data-tab");
    document.getElementById(tabId).classList.remove("hidden");

    // Redraw chart if tab switched to stats
    if (tabId === "stats-tab") {
      setTimeout(calculateStats, 50);
    }
  });
});

// Helper to configure button toggle group visual active state
function setupChartToggle(valBtnId, pctBtnId, key) {
  const valBtn = document.getElementById(valBtnId);
  const pctBtn = document.getElementById(pctBtnId);
  if (!valBtn || !pctBtn) return;

  valBtn.addEventListener("click", () => {
    chartDisplayModes[key] = "val";
    valBtn.classList.add("active");
    valBtn.style.background = "var(--bg3)";
    valBtn.style.color = "var(--accent)";
    
    pctBtn.classList.remove("active");
    pctBtn.style.background = "transparent";
    pctBtn.style.color = "var(--text-dim)";
    calculateStats();
  });

  pctBtn.addEventListener("click", () => {
    chartDisplayModes[key] = "pct";
    pctBtn.classList.add("active");
    pctBtn.style.background = "var(--bg3)";
    pctBtn.style.color = "var(--accent)";
    
    valBtn.classList.remove("active");
    valBtn.style.background = "transparent";
    valBtn.style.color = "var(--text-dim)";
    calculateStats();
  });
}

// Initialise chart mode toggles - Removed switches, displaying both by default

// Advanced filters logic
const addFilterRuleBtn = document.getElementById("add-filter-rule-btn");
const clearFiltersBtn = document.getElementById("clear-filters-btn");
const filterRulesList = document.getElementById("filter-rules-list");
const noFiltersMsg = document.getElementById("no-filters-msg");

addFilterRuleBtn.addEventListener("click", () => {
  const id = Math.random().toString(36).substring(2, 9);
  filterRules.push({ id, column: "", condition: "contains", value: "" });
  renderFilterRules();
  saveFiltersToStorage();
});

clearFiltersBtn.addEventListener("click", () => {
  filterRules = [];
  renderFilterRules();
  applyFilters();
  saveFiltersToStorage();
});

function renderFilterRules() {
  // Clear rules list except for button
  const ruleRows = filterRulesList.querySelectorAll(".filter-rule-row");
  ruleRows.forEach(row => row.remove());
  
  if (filterRules.length === 0) {
    noFiltersMsg.classList.remove("hidden");
    clearFiltersBtn.classList.add("hidden");
  } else {
    noFiltersMsg.classList.add("hidden");
    clearFiltersBtn.classList.remove("hidden");
  }

  filterRules.forEach(rule => {
    const row = document.createElement("div");
    row.className = "filter-rule-row";
    row.id = `rule-${rule.id}`;

    // Select column dropdown
    let colOptions = `<option value="">-- Seleccionar columna --</option>`;
    Object.keys(notionSchema).sort((a,b)=>a.localeCompare(b, "es", { sensitivity: "base" })).forEach(col => {
      colOptions += `<option value="${col}" ${rule.column === col ? "selected" : ""}>${col}</option>`;
    });

    const colSelect = document.createElement("select");
    colSelect.innerHTML = colOptions;
    colSelect.addEventListener("change", (e) => {
      const col = e.target.value;
      rule.column = col;
      
      // Default conditions based on type
      const schema = notionSchema[col];
      if (schema?.type === "checkbox") {
        rule.condition = "checked";
        rule.value = true;
      } else if (schema?.type === "select" || schema?.type === "status" || schema?.type === "multi_select") {
        rule.condition = "is";
        rule.value = [];
      } else {
        rule.condition = "contains";
        rule.value = "";
      }
      renderFilterRules();
      applyFilters();
      saveFiltersToStorage();
    });

    row.appendChild(colSelect);

    // If column selected, show condition and value fields
    if (rule.column) {
      const schema = notionSchema[rule.column];
      
      const condSelect = document.createElement("select");
      let condOptions = "";
      
      if (schema?.type === "checkbox") {
        condOptions = `
          <option value="checked" ${rule.condition === "checked" ? "selected" : ""}>Está marcado</option>
          <option value="unchecked" ${rule.condition === "unchecked" ? "selected" : ""}>No está marcado</option>
        `;
      } else if (schema?.type === "select" || schema?.type === "status" || schema?.type === "multi_select") {
        condOptions = `
          <option value="is" ${rule.condition === "is" ? "selected" : ""}>Es igual a</option>
          <option value="is_not" ${rule.condition === "is_not" ? "selected" : ""}>No es igual a</option>
          <option value="empty" ${rule.condition === "empty" ? "selected" : ""}>Está vacío</option>
          <option value="not_empty" ${rule.condition === "not_empty" ? "selected" : ""}>No está vacío</option>
        `;
      } else {
        condOptions = `
          <option value="contains" ${rule.condition === "contains" ? "selected" : ""}>Contiene</option>
          <option value="not_contains" ${rule.condition === "not_contains" ? "selected" : ""}>No contiene</option>
          <option value="is" ${rule.condition === "is" ? "selected" : ""}>Es igual a</option>
          <option value="is_not" ${rule.condition === "is_not" ? "selected" : ""}>No es igual a</option>
          <option value="empty" ${rule.condition === "empty" ? "selected" : ""}>Está vacío</option>
          <option value="not_empty" ${rule.condition === "not_empty" ? "selected" : ""}>No está vacío</option>
        `;
      }
      
      condSelect.innerHTML = condOptions;
      condSelect.addEventListener("change", (e) => {
        rule.condition = e.target.value;
        renderFilterRules();
        applyFilters();
        saveFiltersToStorage();
      });
      row.appendChild(condSelect);

      // Value input or multiselect
      if (rule.condition !== "empty" && rule.condition !== "not_empty" && rule.condition !== "checked" && rule.condition !== "unchecked") {
        const valContainer = document.createElement("div");
        valContainer.className = "filter-rule-value-container";

        if (schema?.options && schema.options.length > 0) {
          // Multiselect dropdown panel style
          const currentArr = Array.isArray(rule.value) ? rule.value : [];
          const dropBtn = document.createElement("button");
          dropBtn.className = "btn-multiselect-dropdown";
          dropBtn.innerHTML = `<span>${currentArr.length > 0 ? `${currentArr.length} seleccionados` : "Todos"}</span><svg style="width: 12px; height: 12px; min-width: 12px; min-height: 12px; flex-shrink: 0; margin-left: 0.5rem; display: inline-block;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>`;
          
          dropBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (activeRuleDropdown === rule.id) {
              activeRuleDropdown = null;
            } else {
              activeRuleDropdown = rule.id;
            }
            renderFilterRules();
          });
          
          valContainer.appendChild(dropBtn);

          if (activeRuleDropdown === rule.id) {
            const dropdownPanel = document.createElement("div");
            dropdownPanel.className = "multiselect-dropdown-panel";
            dropdownPanel.addEventListener("click", (e) => e.stopPropagation());
            
            const sortedOptions = [...schema.options].sort((a, b) => String(a).localeCompare(String(b), "es", { sensitivity: "base" }));
            sortedOptions.forEach(opt => {
              const label = document.createElement("label");
              label.className = "multiselect-dropdown-option";
              
              const isChecked = currentArr.includes(opt);
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.checked = isChecked;
              
              checkbox.addEventListener("change", () => {
                const updated = isChecked 
                  ? currentArr.filter(o => o !== opt) 
                  : [...currentArr, opt];
                rule.value = updated;
                applyFilters();
                renderFilterRules();
                saveFiltersToStorage();
              });
              
              label.appendChild(checkbox);
              const textSpan = document.createElement("span");
              textSpan.textContent = opt;
              label.appendChild(textSpan);
              dropdownPanel.appendChild(label);
            });
            valContainer.appendChild(dropdownPanel);
          }
        } else {
          // Normal text input
          const textInput = document.createElement("input");
          textInput.type = "text";
          textInput.value = String(rule.value || "");
          textInput.placeholder = "Escribe valor de filtro...";
          textInput.addEventListener("input", (e) => {
            rule.value = e.target.value;
            applyFilters();
            saveFiltersToStorage();
          });
          valContainer.appendChild(textInput);
        }
        row.appendChild(valContainer);
      }
    }

    // Delete rule button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-rule-delete";
    deleteBtn.innerHTML = `<svg style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
    deleteBtn.addEventListener("click", () => {
      filterRules = filterRules.filter(r => r.id !== rule.id);
      renderFilterRules();
      applyFilters();
      saveFiltersToStorage();
    });
    row.appendChild(deleteBtn);

    filterRulesList.appendChild(row);
  });
}

// Global click to close active filter dropdowns
let activeStatsRuleDropdown = null;

if (statsAddFilterRuleBtn) {
  statsAddFilterRuleBtn.addEventListener("click", () => {
    const id = Math.random().toString(36).substring(2, 9);
    statsFilterRules.push({ id, column: "", condition: "contains", value: "" });
    renderStatsFilterRules();
    saveStatsFiltersToStorage();
  });
}

if (statsClearFiltersBtn) {
  statsClearFiltersBtn.addEventListener("click", () => {
    statsFilterRules = [];
    renderStatsFilterRules();
    applyStatsFilters();
    saveStatsFiltersToStorage();
  });
}

function renderStatsFilterRules() {
  if (!statsFilterRulesList || !statsNoFiltersMsg || !statsClearFiltersBtn) return;

  const ruleRows = statsFilterRulesList.querySelectorAll(".filter-rule-row");
  ruleRows.forEach(row => row.remove());
  
  if (statsFilterRules.length === 0) {
    statsNoFiltersMsg.classList.remove("hidden");
    statsClearFiltersBtn.classList.add("hidden");
  } else {
    statsNoFiltersMsg.classList.add("hidden");
    statsClearFiltersBtn.classList.remove("hidden");
  }

  statsFilterRules.forEach(rule => {
    const row = document.createElement("div");
    row.className = "filter-rule-row";
    row.id = `stats-rule-${rule.id}`;

    // Select column dropdown
    let colOptions = `<option value="">-- Seleccionar columna --</option>`;
    Object.keys(notionSchema).sort((a,b)=>a.localeCompare(b, "es", { sensitivity: "base" })).forEach(col => {
      colOptions += `<option value="${col}" ${rule.column === col ? "selected" : ""}>${col}</option>`;
    });

    const colSelect = document.createElement("select");
    colSelect.innerHTML = colOptions;
    colSelect.addEventListener("change", (e) => {
      const col = e.target.value;
      rule.column = col;
      
      const schema = notionSchema[col];
      if (schema?.type === "checkbox") {
        rule.condition = "checked";
        rule.value = true;
      } else if (schema?.type === "select" || schema?.type === "status" || schema?.type === "multi_select") {
        rule.condition = "is";
        rule.value = [];
      } else {
        rule.condition = "contains";
        rule.value = "";
      }
      renderStatsFilterRules();
      applyStatsFilters();
      saveStatsFiltersToStorage();
    });

    row.appendChild(colSelect);

    // Condition select
    if (rule.column) {
      const schema = notionSchema[rule.column];
      const condSelect = document.createElement("select");
      let condOptions = "";
      
      if (schema?.type === "checkbox") {
        condOptions = `
          <option value="checked" ${rule.condition === "checked" ? "selected" : ""}>Está marcado</option>
          <option value="unchecked" ${rule.condition === "unchecked" ? "selected" : ""}>No está marcado</option>
        `;
      } else if (schema?.type === "select" || schema?.type === "status" || schema?.type === "multi_select") {
        condOptions = `
          <option value="is" ${rule.condition === "is" ? "selected" : ""}>Es igual a</option>
          <option value="is_not" ${rule.condition === "is_not" ? "selected" : ""}>No es igual a</option>
          <option value="empty" ${rule.condition === "empty" ? "selected" : ""}>Está vacío</option>
          <option value="not_empty" ${rule.condition === "not_empty" ? "selected" : ""}>No está vacío</option>
        `;
      } else {
        condOptions = `
          <option value="contains" ${rule.condition === "contains" ? "selected" : ""}>Contiene</option>
          <option value="not_contains" ${rule.condition === "not_contains" ? "selected" : ""}>No contiene</option>
          <option value="is" ${rule.condition === "is" ? "selected" : ""}>Es igual a</option>
          <option value="is_not" ${rule.condition === "is_not" ? "selected" : ""}>No es igual a</option>
          <option value="empty" ${rule.condition === "empty" ? "selected" : ""}>Está vacío</option>
          <option value="not_empty" ${rule.condition === "not_empty" ? "selected" : ""}>No está vacío</option>
        `;
      }
      
      condSelect.innerHTML = condOptions;
      condSelect.addEventListener("change", (e) => {
        rule.condition = e.target.value;
        renderStatsFilterRules();
        applyStatsFilters();
        saveStatsFiltersToStorage();
      });
      row.appendChild(condSelect);

      // Value input or multi-select dropdown
      if (rule.condition !== "empty" && rule.condition !== "not_empty" && rule.condition !== "checked" && rule.condition !== "unchecked") {
        const valContainer = document.createElement("div");
        valContainer.className = "filter-rule-value-container";

        if (schema?.options && schema.options.length > 0) {
          const currentArr = Array.isArray(rule.value) ? rule.value : [];
          const dropBtn = document.createElement("button");
          dropBtn.className = "btn-multiselect-dropdown";
          dropBtn.innerHTML = `<span>${currentArr.length > 0 ? `${currentArr.length} seleccionados` : "Todos"}</span><svg style="width: 12px; height: 12px; min-width: 12px; min-height: 12px; flex-shrink: 0; margin-left: 0.5rem; display: inline-block;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>`;
          
          dropBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (activeStatsRuleDropdown === rule.id) {
              activeStatsRuleDropdown = null;
            } else {
              activeStatsRuleDropdown = rule.id;
            }
            renderStatsFilterRules();
          });
          
          valContainer.appendChild(dropBtn);

          if (activeStatsRuleDropdown === rule.id) {
            const dropdownPanel = document.createElement("div");
            dropdownPanel.className = "multiselect-dropdown-panel";
            dropdownPanel.addEventListener("click", (e) => e.stopPropagation());
            
            const sortedOptions = [...schema.options].sort((a, b) => String(a).localeCompare(String(b), "es", { sensitivity: "base" }));
            sortedOptions.forEach(opt => {
              const label = document.createElement("label");
              label.className = "multiselect-dropdown-option";
              
              const isChecked = currentArr.includes(opt);
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.checked = isChecked;
              
              checkbox.addEventListener("change", () => {
                const updated = isChecked 
                  ? currentArr.filter(o => o !== opt) 
                  : [...currentArr, opt];
                rule.value = updated;
                applyStatsFilters();
                renderStatsFilterRules();
                saveStatsFiltersToStorage();
              });
              
              label.appendChild(checkbox);
              const textSpan = document.createElement("span");
              textSpan.textContent = opt;
              label.appendChild(textSpan);
              dropdownPanel.appendChild(label);
            });
            valContainer.appendChild(dropdownPanel);
          }
        } else {
          const textInput = document.createElement("input");
          textInput.type = "text";
          textInput.value = String(rule.value || "");
          textInput.placeholder = "Escribe valor...";
          textInput.addEventListener("input", (e) => {
            rule.value = e.target.value;
            applyStatsFilters();
            saveStatsFiltersToStorage();
          });
          valContainer.appendChild(textInput);
        }
        row.appendChild(valContainer);
      }
    }

    // Delete rule button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-rule-delete";
    deleteBtn.innerHTML = `<svg style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`;
    deleteBtn.addEventListener("click", () => {
      statsFilterRules = statsFilterRules.filter(r => r.id !== rule.id);
      renderStatsFilterRules();
      applyStatsFilters();
      saveStatsFiltersToStorage();
    });
    row.appendChild(deleteBtn);

    statsFilterRulesList.appendChild(row);
  });
}

// Global click to close active filter dropdowns when clicking outside
document.addEventListener("click", (e) => {
  if (e.target.closest(".multiselect-dropdown-panel") || e.target.closest(".btn-multiselect-dropdown")) {
    return;
  }
  let changed = false;
  if (activeRuleDropdown !== null) {
    activeRuleDropdown = null;
    renderFilterRules();
    changed = true;
  }
  if (activeStatsRuleDropdown !== null) {
    activeStatsRuleDropdown = null;
    renderStatsFilterRules();
    changed = true;
  }
});

// Search input
if (searchInput) {
  searchInput.addEventListener("input", applyFilters);
}

if (statsSearchInput) {
  statsSearchInput.addEventListener("input", applyStatsFilters);
}

function getFullItemName(item) {
  const naturaleza = String(item.rawProperties["Naturaleza"] || "").trim();
  const fabricante = String(item.rawProperties["Fabricante"] || "").trim();
  const modelo = item.title.trim();

  const parts = [];
  if (naturaleza) parts.push(naturaleza);
  if (fabricante) parts.push(fabricante);
  if (modelo) parts.push(modelo);

  return parts.join(" ");
}

function applyFilters() {
  const query = searchInput ? searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

  filteredItems = items.filter(item => {
    const textMatch = 
      item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query) ||
      item.enriched.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query) ||
      item.enriched.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query) ||
      Object.values(item.rawProperties).some(val => {
        if (!val) return false;
        if (Array.isArray(val)) {
          return val.some(v => String(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query));
        }
        return String(val).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query);
      });

    if (!textMatch) return false;

    // Apply advanced rules
    for (const rule of filterRules) {
      if (!rule.column) continue;
      
      const propSchema = notionSchema[rule.column];
      const itemVal = item.rawProperties[rule.column];
      if (!propSchema) continue;

      // 1. Checkbox
      if (propSchema.type === "checkbox") {
        const isChecked = !!itemVal;
        if (rule.condition === "checked" && !isChecked) return false;
        if (rule.condition === "unchecked" && isChecked) return false;
      }
      // 2. Select/Status/Multi-select options
      else if (propSchema.type === "select" || propSchema.type === "status" || propSchema.type === "multi_select") {
        const selectedOptions = Array.isArray(rule.value) ? rule.value : [];
        if (rule.condition === "empty") {
          if (propSchema.type === "multi_select") {
            if (((itemVal || [])).length > 0) return false;
          } else {
            if (itemVal !== null && itemVal !== "") return false;
          }
        } else if (rule.condition === "not_empty") {
          if (propSchema.type === "multi_select") {
            if (((itemVal || [])).length === 0) return false;
          } else {
            if (itemVal === null || itemVal === "") return false;
          }
        } else if (rule.condition === "is") {
          if (selectedOptions.length === 0) continue;
          if (propSchema.type === "multi_select") {
            const arr = itemVal || [];
            if (!arr.some(opt => selectedOptions.includes(opt))) return false;
          } else {
            if (!selectedOptions.includes(itemVal)) return false;
          }
        } else if (rule.condition === "is_not") {
          if (selectedOptions.length === 0) continue;
          if (propSchema.type === "multi_select") {
            const arr = itemVal || [];
            if (arr.some(opt => selectedOptions.includes(opt))) return false;
          } else {
            if (selectedOptions.includes(itemVal)) return false;
          }
        }
      }
      // 3. Text/Numbers
      else {
        const itemStr = String(itemVal || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const targetStr = String(rule.value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (rule.condition === "empty" && itemStr.trim() !== "") return false;
        if (rule.condition === "not_empty" && itemStr.trim() === "") return false;
        if (rule.condition === "contains" && !itemStr.includes(targetStr)) return false;
        if (rule.condition === "not_contains" && itemStr.includes(targetStr)) return false;
        if (rule.condition === "is" && itemStr !== targetStr) return false;
        if (rule.condition === "is_not" && itemStr === targetStr) return false;
      }
    }

    // Apply discount range filter if enabled
    if (discountFilterEnabled) {
      const discount = Number(item.enriched.savingsPercentage) || 0;
      if (discount < discountFilterMin || discount > discountFilterMax) {
        return false;
      }
    }

    return true;
  });

  renderItemsList();
}

let statsFilteredItems = [];

function applyStatsFilters() {
  const query = statsSearchInput ? statsSearchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

  statsFilteredItems = items.filter(item => {
    const textMatch = 
      item.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query) ||
      item.enriched.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query) ||
      item.enriched.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query) ||
      Object.values(item.rawProperties).some(val => {
        if (!val) return false;
        if (Array.isArray(val)) {
          return val.some(v => String(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query));
        }
        return String(val).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query);
      });

    if (!textMatch) return false;

    // Apply advanced rules
    for (const rule of statsFilterRules) {
      if (!rule.column) continue;
      
      const propSchema = notionSchema[rule.column];
      const itemVal = item.rawProperties[rule.column];
      if (!propSchema) continue;

      // 1. Checkbox
      if (propSchema.type === "checkbox") {
        const isChecked = !!itemVal;
        if (rule.condition === "checked" && !isChecked) return false;
        if (rule.condition === "unchecked" && isChecked) return false;
      }
      // 2. Select/Status/Multi-select options
      else if (propSchema.type === "select" || propSchema.type === "status" || propSchema.type === "multi_select") {
        const selectedOptions = Array.isArray(rule.value) ? rule.value : [];
        if (rule.condition === "empty") {
          if (propSchema.type === "multi_select") {
            if (((itemVal || [])).length > 0) return false;
          } else {
            if (itemVal !== null && itemVal !== "") return false;
          }
        } else if (rule.condition === "not_empty") {
          if (propSchema.type === "multi_select") {
            if (((itemVal || [])).length === 0) return false;
          } else {
            if (itemVal === null || itemVal === "") return false;
          }
        } else if (rule.condition === "is") {
          if (selectedOptions.length === 0) continue;
          if (propSchema.type === "multi_select") {
            const arr = itemVal || [];
            if (!arr.some(opt => selectedOptions.includes(opt))) return false;
          } else {
            if (!selectedOptions.includes(itemVal)) return false;
          }
        } else if (rule.condition === "is_not") {
          if (selectedOptions.length === 0) continue;
          if (propSchema.type === "multi_select") {
            const arr = itemVal || [];
            if (arr.some(opt => selectedOptions.includes(opt))) return false;
          } else {
            if (selectedOptions.includes(itemVal)) return false;
          }
        }
      }
      // 3. Text/Numbers
      else {
        const itemStr = String(itemVal || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const targetStr = String(rule.value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (rule.condition === "empty" && itemStr.trim() !== "") return false;
        if (rule.condition === "not_empty" && itemStr.trim() === "") return false;
        if (rule.condition === "contains" && !itemStr.includes(targetStr)) return false;
        if (rule.condition === "not_contains" && itemStr.includes(targetStr)) return false;
        if (rule.condition === "is" && itemStr !== targetStr) return false;
        if (rule.condition === "is_not" && itemStr === targetStr) return false;
      }
    }

    // Apply stats discount range filter if enabled
    if (statsDiscountFilterEnabled) {
      const discount = Number(item.enriched.savingsPercentage) || 0;
      if (discount < statsDiscountFilterMin || discount > statsDiscountFilterMax) {
        return false;
      }
    }

    return true;
  });

  calculateStats();
}

function updateSelectAllCheckboxState() {
  const allFilteredChecked = filteredItems.length > 0 && filteredItems.every(it => !!selectedItemIds[it.id]);
  selectAllCheckbox.checked = allFilteredChecked;
  
  // Update selected count stat
  const selectedCount = Object.keys(selectedItemIds).filter(id => selectedItemIds[id] && items.some(it => it.id === id)).length;
  const selectedUnits = items.filter(it => !!selectedItemIds[it.id]).reduce((acc, it) => acc + (it.cantidad || 1), 0);
  statSelectedCount.textContent = `${selectedCount} (${selectedUnits} ud)`;
}

selectAllCheckbox.addEventListener("change", (e) => {
  const isChecked = e.target.checked;
  filteredItems.forEach(item => {
    selectedItemIds[item.id] = isChecked;
  });
  renderItemsList();
  updateSelectAllCheckboxState();
});

// Render dynamic expandable cards list
function renderItemsList() {
  itemsList.innerHTML = "";
  
  if (filteredItems.length === 0) {
    itemsListContainer.classList.add("hidden");
    return;
  }

  itemsListContainer.classList.remove("hidden");

  statNotionCount.textContent = items.length;
  statFilteredCount.textContent = filteredItems.length;
  updateSelectAllCheckboxState();

  filteredItems.forEach(item => {
    const isExpanded = !!expandedIds[item.id];
    const isSelected = !!selectedItemIds[item.id];
    const enrichedData = item.enriched;

    const isReadyForSale = enrichedData.secondHandPrice > 0 && (enrichedData.description || "").trim() !== "";
    const isAnalyzing = !!analyzingIds[item.id];
    const isSaving = !!savingIds[item.id];

    // Card element
    const card = document.createElement("article");
    card.className = `dash-card-item ${isExpanded ? "expanded" : ""} ${isSelected ? "selected" : ""}`;
    card.id = `card-${item.id}`;

    // Metrics calculations
    const cost = enrichedData.purchasePrice || 0;
    const price = enrichedData.secondHandPrice || 0;
    const profit = price - cost;
    const profitMargin = price > 0 ? Math.round((profit / price) * 100) : 0;
    const dateStr = new Date(item.lastEdited).toLocaleDateString();

    const isProfit = profit >= 0;
    const profitHtml = (cost > 0 && price > 0) 
      ? `<span class="badge ${isProfit ? "pub" : "nv"}" style="font-weight:600;">${isProfit ? "Ganancia" : "Pérdida"}: ${isProfit ? "+" : ""}${Math.round(profit)} €</span>` 
      : "";

    const readyBadge = isReadyForSale
      ? `<span class="badge pub" style="font-weight:600;"><span style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%; margin-right:4px;"></span>Listo para Venta</span>`
      : `<span class="badge unpub" style="font-weight:600;">Pendiente</span>`;

    const discountHtml = enrichedData.savingsPercentage > 0
      ? `<span class="badge pub" style="font-weight:700; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.1); color:#10b981;">${enrichedData.savingsPercentage}% Dto.</span>`
      : "";

    card.innerHTML = `
      <div class="dash-card-header-wrapper" style="display: flex; align-items: stretch; min-height: 140px;">
        <!-- Clickable image on left for selecting the complete card (highlight) -->
        <div class="dash-card-img-wrap" style="width: 160px; flex-shrink: 0; position: relative; cursor: pointer; border: none; border-radius: 0;" data-action="toggle-select" title="Haz clic para seleccionar">
          ${enrichedData.imageUrl 
            ? `<img src="${enrichedData.imageUrl}" alt="${enrichedData.title}" style="width: 100%; height: 100%; object-fit: cover;">` 
            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg); color: var(--text-dim);"><svg style="width: 24px; height: 24px;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>`}
        </div>

        <!-- Metadata & Title -->
        <div class="dash-card-info" style="flex: 1; padding: 1.1rem 1.6rem; display: flex; flex-direction: column; justify-content: center; cursor: pointer; min-width: 0;" data-action="toggle-expand">
          <h2 class="dash-card-title-text" title="${getFullItemName(item)}" style="margin-top: 0; font-size: 1.25rem; font-weight: 800; color: var(--text);">
            ${getFullItemName(item)}
          </h2>
          <div class="dash-card-meta" style="margin-top: 0.4rem; margin-bottom: 0.5rem; display: flex; gap: 0.5rem; align-items: center;">
            <span>Modificado: ${dateStr}</span>
            <span>•</span>
            ${readyBadge}
          </div>
          <div class="dash-card-metrics" style="margin-top: 0.2rem;">
            <span>Compra: <strong>${cost} €</strong></span>
            <span>|</span>
            <span>Venta: <strong style="color:var(--accent);">${price} €</strong></span>
            <span>|</span>
            <span>Retail: <strong>${enrichedData.retailPrice || 0} €</strong></span>
            <span>|</span>
            <span>Stock: <strong style="color:var(--accent); background:rgba(167,139,250,0.1); padding:1px 6px; border-radius:4px; border:1px solid rgba(167,139,250,0.1);">${item.cantidad || 1}</strong></span>
            ${item.unidadesVendidas > 0 ? `<span>|</span><span style="font-size:0.75rem; color:#10b981;">✓ ${item.unidadesVendidas} vendidas</span>` : ""}
            ${discountHtml ? `<span>|</span>${discountHtml}` : ""}
            ${profitHtml ? `<span>|</span>${profitHtml}` : ""}
          </div>
        </div>

        <!-- Controls (Stacked vertically for the taller card) -->
        <div class="dash-card-right" style="padding: 1.1rem 1.6rem; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; gap: 0.6rem; flex-shrink: 0;">
          <!-- Switches -->
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <label class="dash-control-label ${enrichedData.publicar ? "active-pub" : ""}">
              <input type="checkbox" data-control="publicar" ${enrichedData.publicar ? "checked" : ""}>
              <span>Publicado</span>
            </label>

            <label class="dash-control-label ${enrichedData.vendido ? "active-sold" : ""}">
              <input type="checkbox" data-control="vendido" ${enrichedData.vendido ? "checked" : ""}>
              <span>Vendido</span>
            </label>

            <label class="dash-control-label ${enrichedData.noVender ? "active-nv" : ""}">
              <input type="checkbox" data-control="noVender" ${enrichedData.noVender ? "checked" : ""}>
              <span>No vender</span>
            </label>
          </div>

          <!-- Action buttons -->
          <div class="dash-card-actions" style="display: flex; align-items: center; gap: 0.5rem;">
            ${!isExpanded ? `
              <button class="btn-primary" style="font-size:0.7rem; padding:0.4rem 0.8rem; border-radius:6px;" data-action="quick-analyze" ${isAnalyzing || isBulkProcessing ? "disabled" : ""}>
                ${isAnalyzing ? "..." : `<svg style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:3px;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Analizar`}
              </button>
            ` : ""}
            <button class="btn-ghost" style="font-size:0.7rem; padding:0.4rem 0.7rem; border-radius:6px; color:#10b981; border-color:rgba(16,185,129,0.4);" data-action="sell-unit" title="Registrar venta de 1 unidad">
              🛒 Vender
            </button>
            <button class="btn-icon" data-action="copy-original-to-purchase" title="Copiar precio original a precio de compra" style="padding: 0.35rem; color: var(--accent);">
              <svg style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <button class="btn-icon" data-action="open-config" title="Propiedades avanzadas" style="padding: 0.35rem;">
              <svg style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button class="btn-icon ${isExpanded ? "rotate-180" : ""}" data-action="toggle-expand">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- EDITABLE EXPANDED FORM -->
      ${isExpanded ? `
        <div class="expanded-container animate-fadeIn" style="padding: 1.25rem;">
          <!-- Image column -->
          <div class="edit-col-image">
            <div class="edit-image-header">
              <span>Imagen del Producto</span>
              <button class="btn-primary" style="font-size:0.65rem; padding:0.25rem 0.5rem; border-radius:4px;" data-action="form-analyze" ${isAnalyzing || isBulkProcessing ? "disabled" : ""}>
                ${isAnalyzing ? "Analizando..." : "Autocompletar con IA"}
              </button>
            </div>
            
            <div class="edit-image-frame">
              ${enrichedData.imageUrl 
                ? `<img src="${enrichedData.imageUrl}" alt="${enrichedData.title}">` 
                : `<div style="text-align:center;"><svg style="width:32px; height:32px; color:var(--text-dim); margin-bottom:0.5rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><p style="font-size:0.7rem; color:var(--text-dim);">Sin imagen. Pulsa autocompletar.</p></div>`}
            </div>

            <div>
              <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-dim); margin-bottom:0.25rem;">URL de Imagen (editable)</label>
              <input type="text" class="form-control-input edit-field-image-url" value="${enrichedData.imageUrl || ""}" placeholder="Pegar URL de la imagen...">
            </div>

            <button class="btn-ghost" style="width:100%; padding:0.5rem;" data-action="download-image" ${!enrichedData.imageUrl ? "disabled" : ""}>
              <svg style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Descargar Imagen
            </button>
          </div>

          <!-- Fields column -->
          <div class="edit-col-fields">
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.4rem;">Título del Anuncio</label>
              <input type="text" class="form-control-input edit-field-title" value="${enrichedData.title || ""}">
            </div>

            <div class="form-group-row">
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.4rem;">P. Original (€)</label>
                <input type="number" class="form-control-input edit-field-retail-price" value="${enrichedData.retailPrice || ""}">
              </div>
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.4rem;">P. Compra (€)</label>
                <input type="number" class="form-control-input edit-field-purchase-price" value="${enrichedData.purchasePrice || ""}">
              </div>
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.4rem;">P. Venta (€)</label>
                <input type="number" class="form-control-input edit-field-secondhand-price" value="${enrichedData.secondHandPrice || ""}">
              </div>
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.4rem;">Ahorro (%)</label>
                <input type="text" class="form-control-input edit-field-savings" value="${enrichedData.savingsPercentage || 0}%" disabled style="background:rgba(255,255,255,0.02); color:var(--accent); font-weight:bold; cursor:not-allowed;">
              </div>
            </div>

            <div style="flex:1; display:flex; flex-direction:column;">
              <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.4rem;">Descripción de Venta</label>
              <textarea class="form-control-textarea edit-field-description" rows="6" style="flex:1; min-height:120px;">${enrichedData.description || ""}</textarea>
            </div>

            <div class="form-actions-row">
              <div class="form-copy-buttons">
                <button class="btn-ghost" style="padding:0.4rem 0.8rem; font-size:0.7rem;" data-copy="desc">Copiar Descripción</button>
                <button class="btn-ghost" style="padding:0.4rem 0.8rem; font-size:0.7rem;" data-copy="title">Copiar Título</button>
                <button class="btn-ghost" style="padding:0.4rem 0.8rem; font-size:0.7rem;" data-copy="price">Copiar P. Venta</button>
              </div>

              <button class="btn-primary" style="padding:0.6rem 1.5rem;" data-action="save-notion" ${isSaving ? "disabled" : ""}>
                ${isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      ` : ""}
    `;

    // Hook listeners
    // Toggle select by clicking the full-height image on the left
    const imageSelectBtn = card.querySelector('[data-action="toggle-select"]');
    imageSelectBtn.addEventListener("click", () => {
      selectedItemIds[item.id] = !isSelected;
      renderItemsList();
      updateSelectAllCheckboxState();
    });

    // Expand click triggers
    const toggleEls = card.querySelectorAll('[data-action="toggle-expand"]');
    toggleEls.forEach(el => {
      el.addEventListener("click", () => {
        expandedIds[item.id] = !isExpanded;
        renderItemsList();
      });
    });

    // Advanced Notion key-value properties modal trigger
    const configBtn = card.querySelector('[data-action="open-config"]');
    configBtn.addEventListener("click", () => {
      openConfigModal(item);
    });

    // Copy original price shortcut button in card header
    const copyOriginalBtn = card.querySelector('[data-action="copy-original-to-purchase"]');
    if (copyOriginalBtn) {
      copyOriginalBtn.addEventListener("click", async (e) => {
        e.stopPropagation(); // Prevent card expansion
        const oldPurchase = item.enriched.purchasePrice;
        const retail = item.enriched.retailPrice || 0;
        
        if (!retail) {
          showToast("El precio original está vacío o es 0", "info");
          return;
        }

        item.enriched.purchasePrice = retail;
        renderItemsList(); // update immediately in UI

        try {
          const response = await fetch("/api/notion/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: item.id,
              itemIds: item.itemIds || [item.id],
              purchasePrice: retail,
            }),
          });

          if (!response.ok) throw new Error();
          showToast(`Copiado original (${retail} €) a precio de compra.`, "success");
          calculateStats();
        } catch (err) {
          console.error(err);
          item.enriched.purchasePrice = oldPurchase;
          renderItemsList();
          showToast("Error al guardar el precio de compra.", "error");
        }
      });
    }

    // Control switches (Publish, Sold, No Vender)
    const controlCheckboxes = card.querySelectorAll("[data-control]");
    controlCheckboxes.forEach(cb => {
      cb.addEventListener("change", async (e) => {
        const control = e.target.getAttribute("data-control");
        const val = e.target.checked;
        
        if (control === "publicar") {
          handleTogglePublish(item, val);
        } else if (control === "noVender") {
          handleToggleNoVender(item, val);
        } else if (control === "vendido") {
          handleVendidoChange(item, val);
        }
      });
    });

    // Quick analyze button
    const quickAnalyze = card.querySelector('[data-action="quick-analyze"]');
    if (quickAnalyze) {
      quickAnalyze.addEventListener("click", () => handleAnalyze(item));
    }

    // Sell unit button
    const sellBtn = card.querySelector('[data-action="sell-unit"]');
    if (sellBtn) {
      sellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openSellModal(item);
      });
    }

    // Form expanded hooks
    if (isExpanded) {
      const formAnalyze = card.querySelector('[data-action="form-analyze"]');
      formAnalyze.addEventListener("click", () => handleAnalyze(item));

      const downloadImage = card.querySelector('[data-action="download-image"]');
      if (downloadImage) {
        downloadImage.addEventListener("click", () => handleDownloadImage(enrichedData.imageUrl, enrichedData.title));
      }

      // Input changes
      const imgUrlInput = card.querySelector(".edit-field-image-url");
      const titleInput = card.querySelector(".edit-field-title");
      const retailInput = card.querySelector(".edit-field-retail-price");
      const purchaseInput = card.querySelector(".edit-field-purchase-price");
      const saleInput = card.querySelector(".edit-field-secondhand-price");
      const descInput = card.querySelector(".edit-field-description");
      const savingsInput = card.querySelector(".edit-field-savings");

      const updateLocalFields = () => {
        enrichedData.imageUrl = imgUrlInput.value;
        enrichedData.title = titleInput.value;
        enrichedData.retailPrice = Number(retailInput.value) || 0;
        enrichedData.purchasePrice = Number(purchaseInput.value) || 0;
        enrichedData.secondHandPrice = Number(saleInput.value) || 0;
        enrichedData.description = descInput.value;
        
        if (enrichedData.retailPrice > 0) {
          enrichedData.savingsPercentage = Math.round(((enrichedData.retailPrice - enrichedData.secondHandPrice) / enrichedData.retailPrice) * 100);
        } else {
          enrichedData.savingsPercentage = 0;
        }
        savingsInput.value = `${enrichedData.savingsPercentage}%`;
      };



      [imgUrlInput, titleInput, retailInput, purchaseInput, saleInput, descInput].forEach(inp => {
        inp.addEventListener("blur", updateLocalFields);
      });

      // Save button
      const saveBtn = card.querySelector('[data-action="save-notion"]');
      saveBtn.addEventListener("click", async () => {
        updateLocalFields();
        expandedIds[item.id] = false;
        handleSave(item);
      });

      // Copy buttons
      const copyBtns = card.querySelectorAll("[data-copy]");
      copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const type = btn.getAttribute("data-copy");
          let text = "";
          if (type === "desc") text = descInput.value;
          else if (type === "title") text = titleInput.value;
          else if (type === "price") text = `${saleInput.value} €`;
          
          navigator.clipboard.writeText(text).then(() => {
            showToast("Copiado al portapapeles");
          }).catch(err => {
            console.error(err);
          });
        });
      });
    }

    itemsList.appendChild(card);
  });
}

// Checkbox action: Publish toggle
async function handleTogglePublish(item, isPublished) {
  item.enriched.publicar = isPublished;
  // Re-run filters so active filter rules react immediately to the change
  applyFilters();

  try {
    const response = await fetch("/api/notion/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: item.id,
        itemIds: item.itemIds || [item.id],
        publicar: isPublished,
      }),
    });

    if (!response.ok) throw new Error("Fallo al actualizar la base de datos");
    showToast(isPublished ? `"${getFullItemName(item)}" publicado en la web.` : `"${getFullItemName(item)}" puesto en borrador.`, "success");
    calculateStats();
  } catch (err) {
    console.error(err);
    item.enriched.publicar = !isPublished;
    applyFilters();
    showToast("Error al guardar estado de publicación.", "error");
  }
}

// Checkbox action: No Vender toggle
async function handleToggleNoVender(item, isNoVender) {
  item.enriched.noVender = isNoVender;
  applyFilters();

  try {
    const response = await fetch("/api/notion/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: item.id,
        itemIds: item.itemIds || [item.id],
        noVender: isNoVender,
      }),
    });

    if (!response.ok) throw new Error("Fallo al actualizar la base de datos");
    showToast(isNoVender ? `"${getFullItemName(item)}" marcado como No Vender.` : `"${getFullItemName(item)}" disponible para venta.`, "success");
    calculateStats();
  } catch (err) {
    console.error(err);
    item.enriched.noVender = !isNoVender;
    applyFilters();
    showToast("Error al guardar estado.", "error");
  }
}

// Checkbox action: Sold toggle with modal confirm
function handleVendidoChange(item, isChecked) {
  if (isChecked) {
    const defaultCost = item.enriched.purchasePrice || 0;
    const defaultSale = item.enriched.secondHandPrice || 0;
    
    sellModalItemName.textContent = `"${getFullItemName(item)}"`;
    sellModalPurchasePrice.value = defaultCost;
    sellModalSalePrice.value = defaultSale;

    if (item.enriched.retailPrice > 0) {
      sellModalSuggestedPriceWrap.classList.remove("hidden");
      sellModalSuggestedPrice.textContent = `${item.enriched.secondHandPrice} €`;
    } else {
      sellModalSuggestedPriceWrap.classList.add("hidden");
    }

    sellPriceModal.classList.remove("hidden");

    sellModalCallbacks.onConfirm = async () => {
      sellPriceModal.classList.add("hidden");
      const cost = Number(sellModalPurchasePrice.value) || 0;
      const sale = Number(sellModalSalePrice.value) || 0;

      // Update state
      item.enriched.purchasePrice = cost;
      item.enriched.secondHandPrice = sale;
      item.enriched.vendido = true;
      applyFilters();

      try {
        const response = await fetch("/api/notion/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.id,
            itemIds: item.itemIds || [item.id],
            vendido: true,
            purchasePrice: cost,
            secondHandPrice: sale
          }),
        });

        if (!response.ok) throw new Error("Fallo al actualizar");
        showToast(`"${getFullItemName(item)}" vendido por ${sale} €.`, "success");
        calculateStats();
      } catch (err) {
        console.error(err);
        item.enriched.vendido = false;
        renderItemsList();
        showToast("Error al registrar la venta.", "error");
      }
    };

    sellModalCallbacks.onCancel = () => {
      sellPriceModal.classList.add("hidden");
      renderItemsList(); // re-renders to restore checkbox to unchecked
    };

  } else {
    // Unchecking sold triggers direct restore to available
    item.enriched.vendido = false;
    renderItemsList();

    fetch("/api/notion/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: item.id,
        itemIds: item.itemIds || [item.id],
        vendido: false
      }),
    }).then(res => {
      if (!res.ok) throw new Error();
      showToast(`"${getFullItemName(item)}" marcado como disponible.`, "success");
      calculateStats();
    }).catch(err => {
      console.error(err);
      item.enriched.vendido = true;
      renderItemsList();
      showToast("Error al revertir estado de venta.", "error");
    });
  }
}

// AI Fields selection modal logic
const AI_FIELDS_STORAGE_KEY = "dashboard_ai_fields_prefs_v1";
let aiFieldsCallbacks = { onConfirm: null, onCancel: null };

function openAiFieldsModal(itemTitle, onConfirm) {
  const modal = document.getElementById("ai-fields-modal");
  const subtitle = document.getElementById("ai-fields-modal-subtitle");

  const checkTitle = document.getElementById("ai-field-title");
  const checkRetail = document.getElementById("ai-field-retailPrice");
  const checkSale = document.getElementById("ai-field-secondHandPrice");
  const checkImage = document.getElementById("ai-field-imageUrl");
  const checkDesc = document.getElementById("ai-field-description");

  // Load saved preferences
  try {
    const raw = localStorage.getItem(AI_FIELDS_STORAGE_KEY);
    if (raw) {
      const prefs = JSON.parse(raw);
      if (typeof prefs.title === "boolean") checkTitle.checked = prefs.title;
      if (typeof prefs.retailPrice === "boolean") checkRetail.checked = prefs.retailPrice;
      if (typeof prefs.secondHandPrice === "boolean") checkSale.checked = prefs.secondHandPrice;
      if (typeof prefs.imageUrl === "boolean") checkImage.checked = prefs.imageUrl;
      if (typeof prefs.description === "boolean") checkDesc.checked = prefs.description;
    }
  } catch (_) {}

  if (itemTitle) {
    subtitle.textContent = `Selecciona qué campos deseas que la IA autocomplete o sobreescriba para "${itemTitle}":`;
  } else {
    subtitle.textContent = "Selecciona qué información deseas que la IA genere o sobreescriba:";
  }

  modal.classList.remove("hidden");

  aiFieldsCallbacks.onConfirm = () => {
    const selectedFields = {
      title: checkTitle.checked,
      retailPrice: checkRetail.checked,
      secondHandPrice: checkSale.checked,
      imageUrl: checkImage.checked,
      description: checkDesc.checked
    };

    // Save preferences
    try {
      localStorage.setItem(AI_FIELDS_STORAGE_KEY, JSON.stringify(selectedFields));
    } catch (_) {}

    modal.classList.add("hidden");
    if (onConfirm) onConfirm(selectedFields);
  };

  aiFieldsCallbacks.onCancel = () => {
    modal.classList.add("hidden");
  };
}

const aiFieldsConfirm = document.getElementById("ai-fields-confirm");
const aiFieldsCancel = document.getElementById("ai-fields-cancel");
if (aiFieldsConfirm) aiFieldsConfirm.addEventListener("click", () => aiFieldsCallbacks.onConfirm?.());
if (aiFieldsCancel) aiFieldsCancel.addEventListener("click", () => aiFieldsCallbacks.onCancel?.());

// Single AI analyze
function handleAnalyze(item) {
  openAiFieldsModal(getFullItemName(item), (selectedFields) => {
    executeAnalyze(item, selectedFields);
  });
}

async function executeAnalyze(item, selectedFields) {
  const fullName = getFullItemName(item);
  analyzingIds[item.id] = true;
  renderItemsList();

  try {
    const qty = item.cantidad || 1;
    const response = await fetch(`/api/enrich?title=${encodeURIComponent(fullName)}&cantidad=${qty}&model=${encodeURIComponent(selectedAIModel)}`, { credentials: "same-origin" });
    if (!response.ok) {
      let errMsg = "Fallo en la API RAG de tasación";
      try {
        const errData = await response.json();
        if (errData && errData.error) errMsg = errData.error;
      } catch (_) {}
      throw new Error(errMsg);
    }
    
    const data = await response.json();
    
    const updatedTitle = (selectedFields.title && data.title) ? data.title : item.enriched.title;
    const updatedRetail = (selectedFields.retailPrice && typeof data.retailPrice === "number") ? data.retailPrice : (item.enriched.retailPrice || 0);
    const updatedSale = (selectedFields.secondHandPrice && typeof data.secondHandPrice === "number") ? data.secondHandPrice : (item.enriched.secondHandPrice || 0);
    const updatedImage = (selectedFields.imageUrl && data.imageUrl) ? data.imageUrl : (item.enriched.imageUrl || "");
    const updatedDesc = (selectedFields.description && data.description) ? data.description : (item.enriched.description || "");

    const enriched = {
      title: updatedTitle || fullName,
      retailPrice: updatedRetail,
      secondHandPrice: updatedSale,
      savingsPercentage: updatedRetail > 0 ? Math.round(((updatedRetail - updatedSale) / updatedRetail) * 100) : 0,
      description: updatedDesc,
      imageUrl: updatedImage,
      publicar: item.enriched.publicar || false,
      vendido: item.enriched.vendido || false,
      noVender: item.enriched.noVender || false,
    };

    // Build update payload only with selected fields
    const updatePayload = {
      itemId: item.id,
      itemIds: item.itemIds || [item.id],
      publicar: enriched.publicar,
    };

    if (selectedFields.title) updatePayload.title = enriched.title;
    if (selectedFields.retailPrice) updatePayload.retailPrice = enriched.retailPrice;
    if (selectedFields.secondHandPrice) updatePayload.secondHandPrice = enriched.secondHandPrice;
    if (selectedFields.description) updatePayload.description = enriched.description;
    if (selectedFields.imageUrl) updatePayload.imageUrl = enriched.imageUrl;

    // Auto save to Notion
    const saveRes = await fetch("/api/notion/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });

    if (!saveRes.ok) throw new Error("Fallo al guardar tasación");

    item.enriched = {
      ...enriched,
      isAnalyzed: true
    };
    showToast(`Artículo "${fullName}" tasado y guardado con éxito.`, "success");
    calculateStats();
  } catch (err) {
    console.error(err);
    openConfirmModal("Error en Tasación", `No se pudo tasar "${fullName}": ${err.message || "Error desconocido"}`);
  } finally {
    analyzingIds[item.id] = false;
    renderItemsList();
  }
}

// Save custom fields
async function handleSave(item) {
  savingIds[item.id] = true;
  renderItemsList();

  try {
    const response = await fetch("/api/notion/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: item.id,
        itemIds: item.itemIds || [item.id],
        title: item.enriched.title,
        retailPrice: item.enriched.retailPrice,
        secondHandPrice: item.enriched.secondHandPrice,
        purchasePrice: item.enriched.purchasePrice,
        description: item.enriched.description,
        imageUrl: item.enriched.imageUrl,
        publicar: item.enriched.publicar,
      }),
    });

    if (!response.ok) throw new Error("Fallo al actualizar");
    showToast("Guardado correctamente", "success");
    calculateStats();
  } catch (err) {
    console.error(err);
    showToast("Error al guardar cambios.", "error");
  } finally {
    savingIds[item.id] = false;
    renderItemsList();
  }
}

// Download image helper
function handleDownloadImage(imageUrl, fileName) {
  if (!imageUrl) return;
  
  // Format clean filename
  const cleanName = fileName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `${cleanName}.jpg`;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Descargando imagen...");
}

// Bulk analysis
const bulkProgressPanel = document.getElementById("bulk-progress-panel");
const bulkProgressBar = document.getElementById("bulk-progress-bar");
const bulkProgressStatus = document.getElementById("bulk-progress-status");
const cancelBulkBtn = document.getElementById("cancel-bulk-btn");

bulkEnrichBtn.addEventListener("click", () => {
  const selectedItems = items.filter(it => !!selectedItemIds[it.id]);
  if (selectedItems.length === 0) {
    openConfirmModal("Sin selección", "Selecciona al menos un artículo haciendo clic sobre su imagen para iniciar el procesamiento masivo.");
    return;
  }

  openAiFieldsModal(`${selectedItems.length} artículos seleccionados`, (selectedFields) => {
    isBulkProcessing = true;
    bulkCancel = false;
    bulkProgressPanel.classList.remove("hidden");
    bulkProgress = { current: 0, total: selectedItems.length };
    updateBulkProgressUI();

    (async () => {
      for (let i = 0; i < selectedItems.length; i++) {
        if (bulkCancel) break;
        
        const currentItem = selectedItems[i];
        const fullName = getFullItemName(currentItem);
        bulkProgress.current = i + 1;
        updateBulkProgressUI();

        try {
          const qty = currentItem.cantidad || 1;
          const res = await fetch(`/api/enrich?title=${encodeURIComponent(fullName)}&cantidad=${qty}&model=${encodeURIComponent(selectedAIModel)}`);
          if (res.ok) {
            const data = await res.json();

            const updatedTitle = (selectedFields.title && data.title) ? data.title : currentItem.enriched.title;
            const updatedRetail = (selectedFields.retailPrice && typeof data.retailPrice === "number") ? data.retailPrice : (currentItem.enriched.retailPrice || 0);
            const updatedSale = (selectedFields.secondHandPrice && typeof data.secondHandPrice === "number") ? data.secondHandPrice : (currentItem.enriched.secondHandPrice || 0);
            const updatedImage = (selectedFields.imageUrl && data.imageUrl) ? data.imageUrl : (currentItem.enriched.imageUrl || "");
            const updatedDesc = (selectedFields.description && data.description) ? data.description : (currentItem.enriched.description || "");

            const enriched = {
              title: updatedTitle || fullName,
              retailPrice: updatedRetail,
              secondHandPrice: updatedSale,
              savingsPercentage: updatedRetail > 0 ? Math.round(((updatedRetail - updatedSale) / updatedRetail) * 100) : 0,
              description: updatedDesc,
              imageUrl: updatedImage,
              publicar: currentItem.enriched.publicar || false,
              vendido: currentItem.enriched.vendido || false,
              noVender: currentItem.enriched.noVender || false,
            };

            const updatePayload = {
              itemId: currentItem.id,
              itemIds: currentItem.itemIds || [currentItem.id],
              publicar: enriched.publicar,
            };
            if (selectedFields.title) updatePayload.title = enriched.title;
            if (selectedFields.retailPrice) updatePayload.retailPrice = enriched.retailPrice;
            if (selectedFields.secondHandPrice) updatePayload.secondHandPrice = enriched.secondHandPrice;
            if (selectedFields.description) updatePayload.description = enriched.description;
            if (selectedFields.imageUrl) updatePayload.imageUrl = enriched.imageUrl;

            await fetch("/api/notion/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updatePayload),
            });

            currentItem.enriched = { ...enriched, isAnalyzed: true };
          }
        } catch (err) {
          console.error(`Error en procesamiento masivo para ${fullName}:`, err);
        }

        // Add small sleep interval between calls to respect limits
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      isBulkProcessing = false;
      bulkProgressPanel.classList.add("hidden");
      showToast("Procesamiento masivo de IA finalizado.");
      applyFilters();
    })();
  });
});

function updateBulkProgressUI() {
  const percent = bulkProgress.total > 0 ? Math.round((bulkProgress.current / bulkProgress.total) * 100) : 0;
  bulkProgressBar.style.width = `${percent}%`;
  bulkProgressStatus.textContent = `${bulkProgress.current} de ${bulkProgress.total} procesados (${percent}%)`;
}

cancelBulkBtn.addEventListener("click", () => {
  bulkCancel = true;
  showToast("Cancelando procesamiento masivo...", "info");
});

// Advanced properties config gear modal functions
function openConfigModal(item) {
  currentConfigItem = item;
  configPropertiesBody.innerHTML = "";

  // 1. Siempre incluir la fila destacada de Cantidad / Stock al inicio
  const currentQty = item.cantidad || 1;
  const qtyTr = document.createElement("tr");
  qtyTr.style.borderBottom = "1px solid var(--border)";
  qtyTr.style.background = "rgba(59, 130, 246, 0.08)";

  const qtyKeyTd = document.createElement("td");
  qtyKeyTd.style.fontWeight = "700";
  qtyKeyTd.style.fontSize = "0.75rem";
  qtyKeyTd.style.padding = "0.6rem 0.8rem";
  qtyKeyTd.style.verticalAlign = "middle";
  qtyKeyTd.style.color = "var(--accent)";
  qtyKeyTd.innerHTML = `📦 Cantidad (Stock) <span style="font-size:0.6rem; color:var(--text-dim); display:block; font-weight:normal; font-family:var(--font-mono); margin-top:0.15rem;">Unidades en stock</span>`;
  qtyTr.appendChild(qtyKeyTd);

  const qtyValTd = document.createElement("td");
  qtyValTd.style.padding = "0.6rem 0.8rem";
  qtyValTd.style.verticalAlign = "middle";
  qtyValTd.innerHTML = `<input type="number" id="config-custom-cantidad-input" class="form-control-input" value="${currentQty}" min="1" style="font-size:0.8rem; font-weight:bold; padding:0.4rem 0.6rem; width:100%; border-color:var(--accent);">`;
  qtyTr.appendChild(qtyValTd);

  configPropertiesBody.appendChild(qtyTr);

  // Loop through all properties in notionSchema
  Object.keys(notionSchema).sort((a,b)=>a.localeCompare(b, "es", { sensitivity: "base" })).forEach(col => {
    // Avoid duplicating Cantidad/Unidades if already shown above
    if (col.toLowerCase() === "cantidad" || col.toLowerCase() === "stock" || col.toLowerCase() === "unidades") return;

    const schema = notionSchema[col];
    const val = item.rawProperties[col];
    const isReadOnly = (schema.type === "formula" || schema.type === "relation" || schema.type === "rollup" || schema.type === "created_time" || schema.type === "last_edited_time");

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid var(--border)";

    // Left cell: Key
    const keyTd = document.createElement("td");
    keyTd.style.fontWeight = "700";
    keyTd.style.fontSize = "0.75rem";
    keyTd.style.padding = "0.6rem 0.8rem";
    keyTd.style.verticalAlign = "middle";
    keyTd.style.color = "var(--text)";
    keyTd.innerHTML = `${col} <span style="font-size:0.6rem; color:var(--text-dim); display:block; font-weight:normal; font-family:var(--font-mono); margin-top:0.15rem;">Tipo: ${schema.type}</span>`;
    tr.appendChild(keyTd);

    // Right cell: Editable Value Input
    const valTd = document.createElement("td");
    valTd.style.padding = "0.6rem 0.8rem";
    valTd.style.verticalAlign = "middle";

    if (isReadOnly) {
      // Disabled text input for read-only values
      let valStr = "";
      if (Array.isArray(val)) valStr = val.join(", ");
      else valStr = val !== null && val !== undefined ? String(val) : "";
      
      valTd.innerHTML = `<input type="text" class="form-control-input" value="${valStr}" disabled style="background:rgba(255,255,255,0.02); color:var(--text-dim); cursor:not-allowed; font-size:0.75rem; padding:0.35rem 0.6rem; width:100%; border-color:var(--border);">`;
    } else if (schema.type === "checkbox") {
      valTd.innerHTML = `<div style="display:flex; align-items:center; height:100%;"><input type="checkbox" class="config-val-input" data-col="${col}" ${!!val ? "checked" : ""} style="width:1.1rem; height:1.1rem; cursor:pointer; accent-color:var(--accent);"></div>`;
    } else if (schema.type === "number") {
      valTd.innerHTML = `<input type="number" class="config-val-input form-control-input" data-col="${col}" value="${val !== null && val !== undefined ? val : ""}" style="font-size:0.75rem; padding:0.35rem 0.6rem; width:100%;">`;
    } else if (schema.type === "select" || schema.type === "status") {
      let options = `<option value="">-- Vacío --</option>`;
      if (schema.options) {
        const sortedOptions = [...schema.options].sort((a, b) => String(a).localeCompare(String(b), "es", { sensitivity: "base" }));
        sortedOptions.forEach(opt => {
          options += `<option value="${opt}" ${opt === val ? "selected" : ""}>${opt}</option>`;
        });
      }
      valTd.innerHTML = `<select class="config-val-input" data-col="${col}" style="background:var(--bg3); border:1px solid var(--border); border-radius:4px; color:var(--text); font-size:0.75rem; padding:0.35rem 0.6rem; outline:none; width:100%;"><option value="">-- Vacío --</option>${options}</select>`;
    } else if (schema.type === "multi_select") {
      // Input text of comma separated values for multi select
      const currentList = Array.isArray(val) ? val : [];
      valTd.innerHTML = `<input type="text" class="config-val-input form-control-input" data-col="${col}" data-type="multi" value="${currentList.join(", ")}" placeholder="Opción 1, Opción 2..." style="font-size:0.75rem; padding:0.35rem 0.6rem; width:100%;">`;
    } else {
      // URL, Date, Title, rich_text, etc.
      valTd.innerHTML = `<input type="text" class="config-val-input form-control-input" data-col="${col}" value="${val !== null && val !== undefined ? String(val) : ""}" style="font-size:0.75rem; padding:0.35rem 0.6rem; width:100%;">`;
    }

    tr.appendChild(valTd);
    configPropertiesBody.appendChild(tr);
  });

  itemConfigModal.classList.remove("hidden");
}

configModalCancel.addEventListener("click", () => {
  itemConfigModal.classList.add("hidden");
  currentConfigItem = null;
});

configModalSave.addEventListener("click", async () => {
  if (!currentConfigItem) return;

  const rawProperties = {};
  const inputs = configPropertiesBody.querySelectorAll(".config-val-input");
  
  inputs.forEach(inp => {
    const col = inp.getAttribute("data-col");
    const isMulti = inp.getAttribute("data-type") === "multi";
    
    if (inp.type === "checkbox") {
      rawProperties[col] = inp.checked;
    } else if (inp.type === "number") {
      rawProperties[col] = inp.value === "" ? null : Number(inp.value);
    } else if (isMulti) {
      rawProperties[col] = inp.value.split(",").map(s => s.trim()).filter(Boolean);
    } else {
      rawProperties[col] = inp.value;
    }
  });

  const customQtyInput = document.getElementById("config-custom-cantidad-input");
  const newQty = customQtyInput ? (Math.max(1, Number(customQtyInput.value)) || 1) : (currentConfigItem.cantidad || 1);
  rawProperties["Cantidad"] = newQty;

  configModalSave.textContent = "Guardando...";
  configModalSave.disabled = true;

  try {
    const response = await fetch("/api/notion/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: currentConfigItem.id,
        itemIds: currentConfigItem.itemIds || [currentConfigItem.id],
        cantidad: newQty,
        rawProperties
      })
    });

    if (!response.ok) throw new Error("Fallo al actualizar propiedades");
    
    showToast("Propiedades guardadas con éxito");
    itemConfigModal.classList.add("hidden");
    fetchNotionItems(); // reload data
  } catch (err) {
    console.error(err);
    showToast("Error al guardar propiedades.", "error");
  } finally {
    configModalSave.textContent = "Guardar propiedades";
    configModalSave.disabled = false;
    currentConfigItem = null;
  }
});

// configModalDelete action
if (configModalDelete) {
  configModalDelete.addEventListener("click", () => {
    if (!currentConfigItem) return;
    
    openConfirmModal(
      "Eliminar Artículo",
      `¿Estás seguro de que deseas eliminar permanentemente el artículo "${currentConfigItem.title || "este artículo"}" de Notion?`,
      async () => {
        try {
          configModalDelete.textContent = "Eliminando...";
          configModalDelete.disabled = true;
          
          const response = await fetch("/api/notion/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: currentConfigItem.id,
              archived: true
            })
          });

          if (!response.ok) throw new Error("Error al archivar el elemento.");
          
          showToast("Artículo eliminado con éxito");
          itemConfigModal.classList.add("hidden");
          fetchNotionItems(); // reload
        } catch (err) {
          console.error(err);
          showToast("Error al eliminar el artículo.", "error");
        } finally {
          configModalDelete.textContent = "Eliminar Artículo";
          configModalDelete.disabled = false;
          currentConfigItem = null;
        }
      }
    );
  });
}

// Helper to populate category and brand select dropdowns from notionSchema options AND items
function populateAddItemModalDropdowns() {
  if (!addItemCategorySelect || !addItemBrandSelect || !addItemCategoryCustom || !addItemBrandCustom) return;

  const findSchemaOptions = (possibleNames) => {
    const options = new Set();
    const normPossibles = possibleNames.map(n => n.toLowerCase().trim());
    
    // 1. Check notionSchema options
    for (const key of Object.keys(notionSchema || {})) {
      if (normPossibles.includes(key.toLowerCase().trim())) {
        const schema = notionSchema[key];
        if (schema && Array.isArray(schema.options)) {
          schema.options.forEach(opt => { if (opt) options.add(opt); });
        }
      }
    }
    
    // 2. Check values present across all loaded items
    (items || []).forEach(it => {
      if (!it.rawProperties) return;
      for (const key of Object.keys(it.rawProperties)) {
        if (normPossibles.includes(key.toLowerCase().trim())) {
          const val = it.rawProperties[key];
          if (val && typeof val === "string" && val.trim() !== "") {
            options.add(val.trim());
          }
        }
      }
    });

    return Array.from(options).sort((a, b) => a.localeCompare(b));
  };

  // 1. Populate Naturaleza (Categoría)
  const categories = findSchemaOptions(["Naturaleza", "Categoría", "Categoria", "Nature"]);
  let catOptions = `<option value="">-- Seleccionar categoría --</option>`;
  categories.forEach(opt => {
    catOptions += `<option value="${opt}">${opt}</option>`;
  });
  catOptions += `<option value="__NEW__">+ Añadir nueva categoría...</option>`;
  addItemCategorySelect.innerHTML = catOptions;
  addItemCategoryCustom.classList.add("hidden");
  addItemCategoryCustom.value = "";

  // 2. Populate Fabricante (Brand)
  const brands = findSchemaOptions(["Fabricante", "Marca", "Brand", "Manufacturer"]);
  let brandOptions = `<option value="">-- Seleccionar fabricante --</option>`;
  brands.forEach(opt => {
    brandOptions += `<option value="${opt}">${opt}</option>`;
  });
  brandOptions += `<option value="__NEW__">+ Añadir nuevo fabricante...</option>`;
  addItemBrandSelect.innerHTML = brandOptions;
  addItemBrandCustom.classList.add("hidden");
  addItemBrandCustom.value = "";

  // 3. Setup event listeners
  addItemCategorySelect.onchange = () => {
    if (addItemCategorySelect.value === "__NEW__") {
      addItemCategoryCustom.classList.remove("hidden");
      addItemCategoryCustom.focus();
    } else {
      addItemCategoryCustom.classList.add("hidden");
      addItemCategoryCustom.value = "";
    }
  };

  addItemBrandSelect.onchange = () => {
    if (addItemBrandSelect.value === "__NEW__") {
      addItemBrandCustom.classList.remove("hidden");
      addItemBrandCustom.focus();
    } else {
      addItemBrandCustom.classList.add("hidden");
      addItemBrandCustom.value = "";
    }
  };
}

// Add Item Modal interaction listeners
if (addItemBtn) {
  addItemBtn.addEventListener("click", () => {
    // Reset fields
    addItemTitle.value = "";
    addItemRetail.value = "";
    addItemPurchase.value = "";
    addItemSale.value = "";
    addItemImage.value = "";
    addItemDescription.value = "";
    if (addItemQuantity) addItemQuantity.value = "1";
    if (addItemPublicar) addItemPublicar.checked = false;
    
    // Populate dropdowns from notionSchema
    populateAddItemModalDropdowns();
    
    addItemModal.classList.remove("hidden");
  });
}

if (addItemCancel) {
  addItemCancel.addEventListener("click", () => {
    addItemModal.classList.add("hidden");
  });
}

const addItemAiBtn = document.getElementById("add-item-ai-btn");
if (addItemAiBtn) {
  addItemAiBtn.addEventListener("click", () => {
    const title = addItemTitle.value.trim();
    if (!title) {
      showToast("Escribe primero el nombre o modelo del producto para buscar.", "warning");
      return;
    }

    openAiFieldsModal(title, async (selectedFields) => {
      addItemAiBtn.disabled = true;
      addItemAiBtn.textContent = "✨ Analizando...";
      showToast("Buscando especificaciones y precios con IA...", "info");

      try {
        const url = `/api/enrich?title=${encodeURIComponent(title)}&model=${encodeURIComponent(selectedAIModel)}`;
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Fallo al consultar la IA.");
        }

        const data = await res.json();
        
        // Auto-populate fields only if selected in modal
        if (selectedFields.title && data.title) addItemTitle.value = data.title;
        if (selectedFields.retailPrice && data.retailPrice) addItemRetail.value = data.retailPrice;
        if (selectedFields.secondHandPrice && data.secondHandPrice) addItemSale.value = data.secondHandPrice;
        if (selectedFields.imageUrl && data.imageUrl) addItemImage.value = data.imageUrl;
        if (selectedFields.description && data.description) addItemDescription.value = data.description;

        // Match Category and Brand automatically
        if (data.title) {
          const titleLower = data.title.toLowerCase();
          
          // Match brand (Fabricante)
          let matchedBrand = "";
          const brandSelectOptions = Array.from(addItemBrandSelect.options);
          for (const opt of brandSelectOptions) {
            if (opt.value && opt.value !== "__NEW__" && titleLower.includes(opt.value.toLowerCase())) {
              matchedBrand = opt.value;
              break;
            }
          }
          if (matchedBrand) {
            addItemBrandSelect.value = matchedBrand;
            addItemBrandSelect.dispatchEvent(new Event("change"));
          } else {
            addItemBrandSelect.value = "";
            addItemBrandSelect.dispatchEvent(new Event("change"));
          }

          // Match category (Naturaleza)
          let matchedCat = "";
          const catSelectOptions = Array.from(addItemCategorySelect.options);
          for (const opt of catSelectOptions) {
            if (opt.value && opt.value !== "__NEW__" && titleLower.includes(opt.value.toLowerCase())) {
              matchedCat = opt.value;
              break;
            }
          }
          if (matchedCat) {
            addItemCategorySelect.value = matchedCat;
            addItemCategorySelect.dispatchEvent(new Event("change"));
          } else {
            addItemCategorySelect.value = "";
            addItemCategorySelect.dispatchEvent(new Event("change"));
          }
        }

        showToast("Datos autocompletados con IA correctamente.", "success");
      } catch (err) {
        console.error(err);
        showToast(err.message || "Error al autocompletar con IA.", "error");
      } finally {
        addItemAiBtn.disabled = false;
        addItemAiBtn.textContent = "✨ Autocompletar con IA";
      }
    });
  });
}

if (addItemSave) {
  addItemSave.addEventListener("click", async () => {
    const titleVal = addItemTitle.value.trim();
    if (!titleVal) {
      showToast("El Nombre/Modelo del producto es obligatorio.", "error");
      return;
    }
    
    // Determine category selection
    let categoryVal = "";
    if (addItemCategorySelect.value === "__NEW__") {
      categoryVal = addItemCategoryCustom.value.trim();
    } else {
      categoryVal = addItemCategorySelect.value;
    }

    // Determine brand selection
    let brandVal = "";
    if (addItemBrandSelect.value === "__NEW__") {
      brandVal = addItemBrandCustom.value.trim();
    } else {
      brandVal = addItemBrandSelect.value;
    }

    const retailVal = addItemRetail.value.trim();
    const purchaseVal = addItemPurchase.value.trim();
    const saleVal = addItemSale.value.trim();
    const imageVal = addItemImage.value.trim();
    const descVal = addItemDescription.value.trim();
    const quantityVal = addItemQuantity ? (Math.max(1, Number(addItemQuantity.value)) || 1) : 1;
    const publicarVal = addItemPublicar ? addItemPublicar.checked : false;

    addItemSave.textContent = "Guardando...";
    addItemSave.disabled = true;

    try {
      const response = await fetch("/api/notion/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCreate: true,
          itemTitle: titleVal,
          title: titleVal, // set as default ad title
          retailPrice: retailVal === "" ? null : Number(retailVal),
          secondHandPrice: saleVal === "" ? null : Number(saleVal),
          purchasePrice: purchaseVal === "" ? null : Number(purchaseVal),
          description: descVal,
          imageUrl: imageVal,
          publicar: publicarVal,
          cantidad: quantityVal,
          vendido: false,
          noVender: false,
          rawProperties: {
            "Naturaleza": categoryVal,
            "Fabricante": brandVal
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fallo en Notion API.");
      }

      showToast("Artículo añadido a Notion con éxito", "success");
      addItemModal.classList.add("hidden");
      fetchNotionItems(); // reload
    } catch (err) {
      console.error(err);
      showToast(`Error al añadir artículo: ${err.message || "Error desconocido"}`, "error");
    } finally {
      addItemSave.textContent = "Añadir a Notion";
      addItemSave.disabled = false;
    }
  });
}

// Financial statistics calculations and Canvas chart renderer
function calculateStats() {
  const activeItems = statsFilteredItems; // independent stats filters apply here!
  
  const totalModels = activeItems.length;
  const totalUnits = activeItems.reduce((acc, it) => acc + (it.cantidad || 1), 0);

  // Real sales data from Notion columns "Unidades Vendidas" & "Total Ingresado"
  const totalSoldUnits = activeItems.reduce((acc, it) => acc + (it.unidadesVendidas || 0), 0);
  const totalRealIncome = activeItems.reduce((acc, it) => acc + (it.totalIngresado || 0), 0);

  let totalCost = 0;
  let totalRetail = 0;
  // Categories dictionary
  const categoryStats = {};

  activeItems.forEach(item => {
    const cost = item.enriched.purchasePrice || 0;
    const price = item.enriched.secondHandPrice || 0;
    const retail = item.enriched.retailPrice || 0;
    const qty = item.cantidad || 1;
    const vendidas = item.unidadesVendidas || 0;
    
    // Inversión sobre stock ACTUAL (unidades pendientes de vender)
    totalCost += cost * qty;
    totalRetail += retail * qty;

    const category = String(item.rawProperties["Naturaleza"] || "General").trim();
    if (!categoryStats[category]) {
      categoryStats[category] = {
        name: category,
        count: 0,
        cost: 0,
        revenue: 0,
      };
    }
    
    categoryStats[category].count += qty;
    categoryStats[category].cost += cost * qty;
    categoryStats[category].revenue += price * qty;
  });

  // Potential Revenue (stock restante)
  const totalRevenue = activeItems.reduce((acc, it) => acc + ((it.enriched.secondHandPrice || 0) * (it.cantidad || 1)), 0);

  // Inversión recuperada: coste por unidad × unidades ya vendidas (estimado)
  const totalRecoveredCost = activeItems.reduce((acc, it) => {
    const costPerUnit = it.enriched.purchasePrice || 0;
    return acc + costPerUnit * (it.unidadesVendidas || 0);
  }, 0);

  // Beneficio neto real: lo ingresado - lo que nos costaron esas unidades
  const netProfit = totalRealIncome - totalRecoveredCost;

  // Render quick kpi cards
  if (statTotalModels) {
    statTotalModels.textContent = totalModels;
  }
  statTotalUnits.textContent = totalUnits;
  if (statSoldUnits) {
    statSoldUnits.textContent = totalSoldUnits > 0 
      ? `${totalSoldUnits} vendidas · ${Math.round(totalRealIncome)} € ingresados`
      : "Sin ventas registradas";
  }
  statTotalCost.textContent = `${Math.round(totalCost)} €`;
  const statRecoveredCost = document.getElementById("stat-recovered-cost");
  if (statRecoveredCost) {
    statRecoveredCost.textContent = totalRecoveredCost > 0 
      ? `Recuperado: ${Math.round(totalRecoveredCost)} €` 
      : "Recuperado: 0 €";
  }
  statTotalRevenue.textContent = `${Math.round(totalRevenue)} €`;
  const statRealIncome = document.getElementById("stat-real-income");
  if (statRealIncome) {
    if (totalRealIncome > 0) {
      statRealIncome.textContent = `Ingresado: ${Math.round(totalRealIncome)} € · Neto: ${netProfit >= 0 ? "+" : ""}${Math.round(netProfit)} €`;
      statRealIncome.style.color = netProfit >= 0 ? "#10b981" : "#f43f5e";
    } else {
      statRealIncome.textContent = "Sin ventas registradas";
      statRealIncome.style.color = "";
    }
  }
  if (statTotalRetail) {
    statTotalRetail.textContent = `${Math.round(totalRetail)} €`;
  }

  // Render categories detailed breakdown table
  statsTableBody.innerHTML = "";
  Object.values(categoryStats).sort((a,b)=>b.count - a.count).forEach(cat => {
    const profit = cat.revenue - cat.cost;
    const margin = cat.revenue > 0 ? Math.round((profit / cat.revenue) * 100) : 0;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:700;">${cat.name}</td>
      <td>${cat.count} ud</td>
      <td>${Math.round(cat.cost)} €</td>
      <td>${Math.round(cat.revenue)} €</td>
      <td style="color:${profit >= 0 ? "#10b981" : "#f43f5e"}; font-weight:bold;">
        ${profit >= 0 ? "+" : ""}${Math.round(profit)} €
      </td>
      <td style="font-weight:700;">${margin}%</td>
    `;
    statsTableBody.appendChild(tr);
  });

  // Render Canvas horizontal bar chart (revenues per category)
  drawStatsChart(categoryStats);

  // Render Chart 2: Unsold vs Sold units doughnut
  const unsoldUnits = Math.max(0, totalUnits - totalSoldUnits);
  const slicesUnits = [
    { name: "Vendidas", value: totalSoldUnits, color: "#10b981" },
    { name: "Sin Vender", value: unsoldUnits, color: "#a78bfa" }
  ];
  drawGenericPieChart("stats-pie-chart-units", "unidades", slicesUnits, "val", totalUnits, totalUnits);

  // Render Chart 3: Inversión en stock vs Ingresos reales (€)
  const slicesFinance = [
    { name: "Inversión en Stock", value: totalCost, color: "#3b82f6" },
    { name: "Ingresado Real (€)", value: totalRealIncome, color: "#10b981" }
  ];
  drawGenericPieChart("stats-pie-chart-finance", "total €", slicesFinance, "val", totalCost, totalCost);
}

// Draw custom modern chart in canvas
function drawStatsChart(categoryStats) {
  const canvas = document.getElementById("stats-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  // Handle HDPI displays (retina screens)
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  
  ctx.clearRect(0, 0, width, height);
  
  const cats = Object.values(categoryStats).sort((a,b) => b.revenue - a.revenue);
  if (cats.length === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos para graficar.", width/2, height/2);
    return;
  }
  
  const totalRevenueAll = statsFilteredItems.reduce((acc, it) => acc + ((it.enriched.secondHandPrice || 0) * (it.cantidad || 1)), 0);
  const maxVal = Math.max(...cats.map(c => c.revenue), 100);
  const paddingLeft = 110;
  const paddingRight = 60;
  const paddingTop = 25;
  const paddingBottom = 25;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barGap = 16;
  const numBars = Math.min(cats.length, 5); // top 5 categories
  const barHeight = (chartHeight - (barGap * (numBars - 1))) / numBars;
  
  for (let i = 0; i < numBars; i++) {
    const cat = cats[i];
    const y = paddingTop + i * (barHeight + barGap);
    
    // Category label
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    let label = cat.name;
    if (label.length > 14) label = label.slice(0, 12) + "...";
    ctx.fillText(label, paddingLeft - 12, y + barHeight / 2);
    
    // Bar dimensions
    const valWidth = (cat.revenue / maxVal) * chartWidth;
    
    // Track background
    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    ctx.beginPath();
    ctx.roundRect(paddingLeft, y, chartWidth, barHeight, 4);
    ctx.fill();
    
    // Gradient fill bar
    const grad = ctx.createLinearGradient(paddingLeft, y, paddingLeft + valWidth, y);
    grad.addColorStop(0, "#a78bfa"); // purple accent
    grad.addColorStop(1, "#10b981"); // neon green
    ctx.fillStyle = grad;
    
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(167, 139, 250, 0.25)";
    ctx.beginPath();
    ctx.roundRect(paddingLeft, y, Math.max(valWidth, 4), barHeight, 4);
    ctx.fill();
    ctx.shadowBlur = 0; // reset glow
    
    // Value text label
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    
    let textLabel = "";
    if (chartDisplayModes.categoryBar === "pct") {
      const pct = totalRevenueAll > 0 ? Math.round((cat.revenue / totalRevenueAll) * 100) : 0;
      textLabel = `${pct} %`;
    } else {
      textLabel = `${Math.round(cat.revenue)} €`;
    }
    
    ctx.fillText(textLabel, paddingLeft + valWidth + 10, y + barHeight / 2);
  }
}

// Reusable doughnut chart renderer for Canvas
function drawGenericPieChart(canvasId, centerLabel, slices, activeUnit = "val", centerValue = null, percentBase = null) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  const total = slices.reduce((acc, s) => acc + s.value, 0);

  if (slices.length === 0 || total === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin datos para graficar.", width / 2, height / 2);
    return;
  }

  // Layout: doughnut on the left, legend on the right
  const legendWidth = 175;
  const chartAreaWidth = Math.max(0, width - legendWidth);
  const cx = chartAreaWidth / 2;
  const cy = height / 2;
  const outerR = Math.max(10, Math.min(chartAreaWidth, height) / 2 - 16);
  const innerR = outerR * 0.58;

  if (outerR <= 10 || chartAreaWidth <= 20) {
    return;
  }

  let startAngle = -Math.PI / 2;

  slices.forEach((sliceData) => {
    const sliceAngle = total > 0 ? (sliceData.value / total) * 2 * Math.PI : 0;
    const color = sliceData.color;

    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    // Slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowBlur = 0;
    startAngle += sliceAngle;
  });

  // Doughnut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg2").trim() || "#1a1a2e";
  ctx.fill();

  // Center label - MUCH LARGER
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `bold ${Math.round(outerR * 0.42)}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const isCurrency = centerLabel.includes("€");
  
  const valToShow = centerValue !== null ? centerValue : total;
  const displayVal = isCurrency ? `${Math.round(valToShow)} €` : `${valToShow}`;
  
  ctx.fillText(displayVal, cx, cy - 7);
  ctx.font = `bold ${Math.round(outerR * 0.22)}px system-ui`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(centerLabel.replace(" €", ""), cx, cy + outerR * 0.22);

  // Legend
  const legendX = chartAreaWidth + 10;
  const lineH = Math.min(38, (height - 16) / slices.length);
  const startY = (height - lineH * slices.length) / 2;

  slices.forEach((sliceData, i) => {
    const y = startY + i * lineH + lineH / 2;

    // Color dot - LARGER
    ctx.beginPath();
    ctx.arc(legendX + 8, y - 6, 8, 0, 2 * Math.PI);
    ctx.fillStyle = sliceData.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = sliceData.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label - MUCH LARGER
    let label = sliceData.name.length > 18 ? sliceData.name.slice(0, 16) + "…" : sliceData.name;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 15px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, legendX + 22, y - 6);

    // Count / Pct - MUCH LARGER
    const pctBase = percentBase !== null ? percentBase : total;
    const pct = pctBase > 0 ? Math.round((sliceData.value / pctBase) * 100) : 0;
    const formattedVal = isCurrency ? `${Math.round(sliceData.value)} €` : `${sliceData.value} ud`;
    
    // Always show both
    const sublabel = `${formattedVal} · ${pct}%`;
    
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "14px monospace";
    ctx.fillText(sublabel, legendX + 22, y + 10);
  });
}

// -------------------------------------------------------
// SELL MODAL
// -------------------------------------------------------
let currentSellItem = null;

function openSellModal(item) {
  currentSellItem = item;
  const sellModal = document.getElementById("sell-modal");
  const sellModalItemName = document.getElementById("sell-modal-item-name");
  const sellUnitsInput = document.getElementById("sell-units-input");
  const sellPriceInput = document.getElementById("sell-price-input");
  const sellModalSummary = document.getElementById("sell-modal-summary");

  if (!sellModal) return;

  sellModalItemName.textContent = `"${getFullItemName(item)}"`;

  // Default: 1 unit at the suggested sale price
  const suggestedPrice = item.enriched.secondHandPrice || 0;
  sellUnitsInput.value = 1;
  sellPriceInput.value = suggestedPrice || "";
  sellPriceInput.placeholder = suggestedPrice > 0 ? `Sugerido: ${suggestedPrice} €` : "Precio de venta";

  function updateSummary() {
    const units = Math.max(1, parseInt(sellUnitsInput.value) || 1);
    const price = parseFloat(sellPriceInput.value) || suggestedPrice || 0;
    const total = units * price;
    const cost = item.enriched.purchasePrice || 0;
    const costTotal = units * cost;
    const profit = total - costTotal;
    const stockAfter = (item.cantidad || 1) - units;

    sellModalSummary.innerHTML = `
      <strong style="color:var(--text);">Resumen de la venta:</strong><br>
      ${units} × ${price > 0 ? price + " €" : "? €"} = <strong style="color:#10b981;">${total > 0 ? Math.round(total) + " €" : "?"}</strong><br>
      ${cost > 0 ? `Beneficio neto: <strong style="color:${profit >= 0 ? "#10b981" : "#f43f5e"}">${profit >= 0 ? "+" : ""}${Math.round(profit)} €</strong><br>` : ""}
      Stock tras la venta: <strong style="color:${stockAfter >= 0 ? "var(--text)" : "#f43f5e"};">${Math.max(0, stockAfter)} ud</strong>
      ${stockAfter < 0 ? `<br><span style="color:#f43f5e; font-size:0.7rem;">⚠️ No tienes suficiente stock</span>` : ""}
    `;
  }

  updateSummary();
  sellUnitsInput.addEventListener("input", updateSummary);
  sellPriceInput.addEventListener("input", updateSummary);

  sellModal.classList.remove("hidden");
}

// Sell modal button listeners
document.getElementById("sell-modal-close")?.addEventListener("click", () => {
  document.getElementById("sell-modal")?.classList.add("hidden");
});
document.getElementById("sell-modal-cancel")?.addEventListener("click", () => {
  document.getElementById("sell-modal")?.classList.add("hidden");
});

const _sellModalConfirmBtn = document.getElementById("sell-modal-confirm");
if (_sellModalConfirmBtn) {
  _sellModalConfirmBtn.addEventListener("click", async () => {
    if (!currentSellItem) return;
    const item = currentSellItem;

    const sellUnitsInput = document.getElementById("sell-units-input");
    const sellPriceInput = document.getElementById("sell-price-input");
    const units = Math.max(1, parseInt(sellUnitsInput.value) || 1);
    const pricePerUnit = parseFloat(sellPriceInput.value) || item.enriched.secondHandPrice || 0;
    const totalIncome = units * pricePerUnit;

    const stockAfter = (item.cantidad || 1) - units;
    if (stockAfter < 0) {
      showToast(`Stock insuficiente. Tienes ${item.cantidad || 1} unidades.`, "error");
      return;
    }

    if (sellModal) sellModal.classList.add("hidden");

    // New accumulated totals
    const newUnidadesVendidas = (item.unidadesVendidas || 0) + units;
    const newTotalIngresado = (item.totalIngresado || 0) + totalIncome;
    const newStock = stockAfter;

    // Optimistic UI update
    item.cantidad = newStock;
    item.unidadesVendidas = newUnidadesVendidas;
    item.totalIngresado = newTotalIngresado;
    renderItemsList();
    calculateStats();

    try {
      const response = await fetch("/api/notion/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          itemIds: item.itemIds || [item.id],
          cantidad: newStock,
          unidadesVendidas: newUnidadesVendidas,
          totalIngresado: newTotalIngresado,
        }),
      });

      if (!response.ok) throw new Error("Fallo al guardar en Notion");

      showToast(
        `✅ Vendida${units > 1 ? "s" : ""} ${units} ud de "${getFullItemName(item)}" por ${Math.round(totalIncome)} €`,
        "success"
      );
    } catch (err) {
      console.error(err);
      // Revert on error
      item.cantidad = (item.cantidad || 0) + units;
      item.unidadesVendidas = (item.unidadesVendidas || 0) - units;
      item.totalIngresado = (item.totalIngresado || 0) - totalIncome;
      renderItemsList();
      calculateStats();
      showToast("Error al registrar la venta en Notion.", "error");
    }

    currentSellItem = null;
  });
}

// Initial fetch
fetchNotionItems();
