// Reservas de artículos a contactos de Notion (se carga antes de dashboard.js)

let reservations = [];
let reservationsError = "";

const reservationModal = document.getElementById("reservation-modal");
const reservationEls = {
  itemName: document.getElementById("reservation-item-name"),
  alert: document.getElementById("reservation-alert"),
  search: document.getElementById("reservation-contact-search"),
  list: document.getElementById("reservation-contact-list"),
  newToggle: document.getElementById("reservation-new-contact-toggle"),
  newForm: document.getElementById("reservation-new-contact"),
  newName: document.getElementById("reservation-new-name"),
  newPhone: document.getElementById("reservation-new-phone"),
  newEmail: document.getElementById("reservation-new-email"),
  newPhoneWrap: document.getElementById("reservation-new-phone-wrap"),
  newEmailWrap: document.getElementById("reservation-new-email-wrap"),
  newNotice: document.getElementById("reservation-new-notice"),
  newSave: document.getElementById("reservation-new-save"),
  units: document.getElementById("reservation-units"),
  price: document.getElementById("reservation-price"),
  summary: document.getElementById("reservation-summary"),
  cancel: document.getElementById("reservation-cancel"),
  confirm: document.getElementById("reservation-confirm"),
};

let reservationDraft = null; // { item, available, contacts, contactId }

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatEuros(value) {
  return `${Number(value || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
}

function describeDiscount(listPrice, agreedPrice, units) {
  if (!(listPrice > 0)) return "Sin precio de venta de referencia";
  const perUnit = listPrice - agreedPrice;
  if (Math.abs(perUnit) < 0.005) return "Sin descuento";
  const percent = Math.round((Math.abs(perUnit) / listPrice) * 1000) / 10;
  const label = perUnit > 0 ? "Descuento" : "Recargo";
  return `${label}: ${formatEuros(Math.abs(perUnit) * units)} (${percent.toLocaleString("es-ES")}%)`;
}

async function reservationRequest(url, body) {
  const response = await fetch(url, body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  } : undefined);
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) window.location.href = "/login.html";
  if (!response.ok) {
    const error = new Error(data.error || `Error ${response.status}`);
    error.data = data;
    throw error;
  }
  return data;
}

// Nunca lanza: el inventario debe cargar aunque las reservas fallen
async function loadReservations() {
  try {
    const data = await reservationRequest("/api/notion/reservations");
    reservations = data.reservations || [];
    reservationsError = "";
  } catch (error) {
    console.error(error);
    reservations = [];
    reservationsError = error.message;
  }
}

function getItemReservations(item) {
  const ids = item.itemIds || [item.id];
  return reservations.filter((r) => r.itemIds.some((id) => ids.includes(id)));
}

function getReservedUnits(item) {
  return getItemReservations(item).reduce((sum, r) => sum + r.units, 0);
}

// Unidades en stock que nadie tiene reservadas
function getAvailableUnits(item) {
  return Math.max(0, (item.cantidad ?? 1) - getReservedUnits(item));
}

// Cada fila del inventario admite una reserva, así que pueden ser menos que las libres
function getReservableUnits(item) {
  const isSingleSoldRow = item.enriched.vendido && (item.itemIds || []).length <= 1;
  return isSingleSoldRow ? 0 : item.unidadesReservables || 0;
}

const RESERVATION_COLUMN_NAMES = [
  "reservado a", "estado reserva", "unidades reservadas", "precio acordado",
  "precio referencia", "fecha reserva", "descuento €", "descuento %",
];

function isReservationColumn(name) {
  return RESERVATION_COLUMN_NAMES.includes(String(name).toLowerCase().trim());
}

function renderReservationBadge(item) {
  const reserved = getReservedUnits(item);
  if (reserved === 0) return "";
  const label = getAvailableUnits(item) === 0 ? "Reservado" : `${reserved} reservada${reserved > 1 ? "s" : ""}`;
  return `<span>•</span><span class="badge reserved">📌 ${label}</span>`;
}

function renderReservationList(item) {
  const list = getItemReservations(item);
  if (list.length === 0) return "";
  return `<div class="reservation-list">${list.map((r) => {
    const contactDetails = [r.contact?.phone, r.contact?.email].filter(Boolean).join(" · ");
    return `
      <div class="reservation-row">
        <div>
          <strong>${escapeText(r.contact?.name)}</strong>
          ${contactDetails ? `<span class="reservation-dim">${escapeText(contactDetails)}</span>` : ""}
          <div class="reservation-dim">
            ${r.units} ud × ${formatEuros(r.agreedPrice)} = <strong>${formatEuros(r.units * r.agreedPrice)}</strong>
            · ${describeDiscount(r.listPrice, r.agreedPrice, r.units)}
            ${r.date ? `· ${new Date(`${r.date}T00:00:00`).toLocaleDateString("es-ES")}` : ""}
          </div>
        </div>
        <div class="reservation-row-actions">
          <button class="btn-ghost" data-reservation-action="sell" data-reservation-id="${escapeText(r.id)}">Convertir en venta</button>
          <button class="btn-ghost" data-reservation-action="cancel" data-reservation-id="${escapeText(r.id)}">Cancelar reserva</button>
        </div>
      </div>`;
  }).join("")}</div>`;
}

function bindReservationActions(card, item) {
  card.querySelector('[data-action="reserve"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    openReservationModal(item);
  });

  card.querySelectorAll("[data-reservation-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const reservation = reservations.find((r) => r.id === button.dataset.reservationId);
      if (reservation) confirmReservationAction(reservation, button.dataset.reservationAction);
    });
  });
}

function confirmReservationAction(reservation, action) {
  const isSale = action === "sell";
  const who = reservation.contact?.name;
  openConfirmModal(
    isSale ? "Convertir en venta" : "Cancelar reserva",
    isSale
      ? `Se registrará la venta de ${reservation.units} ud a ${who} por ${formatEuros(reservation.units * reservation.agreedPrice)} y se descontará del stock.`
      : `Se cancelará la reserva de ${reservation.units} ud para ${who}. Las unidades volverán a estar disponibles.`,
    async () => {
      try {
        await reservationRequest("/api/notion/reservations", {
          action,
          itemIds: reservation.itemIds,
          contactId: reservation.contactId,
        });
        showToast(isSale ? "Venta registrada." : "Reserva cancelada.", "success");
      } catch (error) {
        console.error(error);
        showToast(escapeText(error.message), "error");
      }
      // Se recarga siempre: un fallo puede haber dejado cambios parciales
      await fetchNotionItems();
    }
  );
}

function setReservationAlert(message) {
  reservationEls.alert.textContent = message;
  reservationEls.alert.classList.toggle("hidden", !message);
}

function updateReservationSummary() {
  if (!reservationDraft) return;
  const { item, available, contactId } = reservationDraft;
  const units = Number(reservationEls.units.value);
  const priceText = reservationEls.price.value;
  const price = Number(priceText);
  const listPrice = item.enriched.secondHandPrice || 0;
  const validUnits = Number.isInteger(units) && units >= 1 && units <= available;
  const validPrice = priceText !== "" && price >= 0;

  reservationEls.summary.innerHTML = `
    <div>Puedes reservar: <strong>${available} ud</strong> · Precio de venta: <strong>${listPrice > 0 ? formatEuros(listPrice) : "sin definir"}</strong></div>
    ${validUnits && validPrice ? `
      <div>Total acordado: <strong>${formatEuros(units * price)}</strong></div>
      <div class="reservation-discount">${describeDiscount(listPrice, price, units)}</div>` : ""}
    ${!validUnits ? `<div class="reservation-discount">Las unidades deben estar entre 1 y ${available}.</div>` : ""}
    ${getAvailableUnits(item) > available ? `<div>Hay ${getAvailableUnits(item)} ud libres, pero cada fila del inventario admite una sola reserva activa.</div>` : ""}
  `;
  reservationEls.confirm.disabled = !(contactId && validUnits && validPrice);
}

function renderContactOptions() {
  if (!reservationDraft) return;
  const normalize = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const query = normalize(reservationEls.search.value);
  const matches = reservationDraft.contacts.filter((c) =>
    normalize(`${c.name} ${c.phone} ${c.email}`).includes(query)
  );

  if (matches.length === 0) {
    reservationEls.list.innerHTML = `<p class="reservation-dim">No hay contactos que coincidan.</p>`;
    return;
  }

  reservationEls.list.innerHTML = matches.map((c) => `
    <button type="button" class="reservation-contact ${c.id === reservationDraft.contactId ? "selected" : ""}" data-contact-id="${escapeText(c.id)}">
      <strong>${escapeText(c.name)}</strong>
      <span class="reservation-dim">${escapeText([c.phone, c.email].filter(Boolean).join(" · "))}</span>
    </button>`).join("");
}

function selectContact(contactId) {
  reservationDraft.contactId = contactId;
  renderContactOptions();
  updateReservationSummary();
}

function toggleNewContactForm(show) {
  reservationEls.newForm.classList.toggle("hidden", !show);
  reservationEls.newToggle.textContent = show ? "Cerrar nuevo contacto" : "+ Nuevo contacto";
  reservationEls.newNotice.innerHTML = "";
  if (show) {
    reservationEls.newName.value = reservationEls.search.value.trim();
    reservationEls.newPhone.value = "";
    reservationEls.newEmail.value = "";
    reservationEls.newName.focus();
  }
}

async function openReservationModal(item) {
  const available = getReservableUnits(item);
  const draft = { item, available, contacts: [], contactId: "" };
  reservationDraft = draft;

  reservationEls.itemName.textContent = getFullItemName(item);
  reservationEls.search.value = "";
  reservationEls.units.value = 1;
  reservationEls.units.max = available;
  reservationEls.price.value = item.enriched.secondHandPrice || "";
  reservationEls.list.innerHTML = `<p class="reservation-dim">Cargando contactos...</p>`;
  reservationEls.newToggle.disabled = true;
  toggleNewContactForm(false);
  // Si falta alguna base en Notion, el aviso explica cómo conectarla
  setReservationAlert(reservationsError);
  updateReservationSummary();
  reservationModal.classList.remove("hidden");

  try {
    const data = await reservationRequest("/api/notion/contacts");
    if (reservationDraft !== draft) return;
    draft.contacts = data.contacts;
    reservationEls.newPhoneWrap.classList.toggle("hidden", !data.fields.phone);
    reservationEls.newEmailWrap.classList.toggle("hidden", !data.fields.email);
    reservationEls.newToggle.disabled = false;
    renderContactOptions();
  } catch (error) {
    console.error(error);
    if (reservationDraft !== draft) return;
    reservationEls.list.innerHTML = "";
    setReservationAlert(error.message);
  }
}

function closeReservationModal() {
  reservationModal.classList.add("hidden");
  reservationDraft = null;
}

async function saveNewContact(force = false) {
  const draft = reservationDraft;
  const name = reservationEls.newName.value.trim();
  if (!name) {
    reservationEls.newNotice.textContent = "El nombre es obligatorio.";
    return;
  }

  reservationEls.newSave.disabled = true;
  reservationEls.newNotice.textContent = "Guardando...";
  try {
    const { contact } = await reservationRequest("/api/notion/contacts", {
      name,
      phone: reservationEls.newPhone.value.trim(),
      email: reservationEls.newEmail.value.trim(),
      force,
    });
    if (reservationDraft !== draft) return;
    draft.contacts.unshift(contact);
    reservationEls.search.value = "";
    toggleNewContactForm(false);
    selectContact(contact.id);
    showToast("Contacto añadido a Notion.", "success");
  } catch (error) {
    console.error(error);
    if (reservationDraft !== draft) return;
    const duplicate = error.data?.duplicate;
    reservationEls.newNotice.textContent = error.message;
    if (duplicate) {
      const addButton = (label, onClick) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn-text";
        button.textContent = label;
        button.addEventListener("click", onClick);
        reservationEls.newNotice.append(" ", button);
      };
      addButton("Usar el existente", () => {
        reservationEls.search.value = "";
        toggleNewContactForm(false);
        selectContact(duplicate.id);
      });
      addButton("Crear de todos modos", () => saveNewContact(true));
    }
  } finally {
    reservationEls.newSave.disabled = false;
  }
}

async function submitReservation() {
  const draft = reservationDraft;
  if (!draft) return;

  reservationEls.confirm.disabled = true;
  reservationEls.confirm.textContent = "Reservando...";
  setReservationAlert("");
  try {
    const result = await reservationRequest("/api/notion/reservations", {
      action: "create",
      itemIds: draft.item.itemIds || [draft.item.id],
      contactId: draft.contactId,
      units: Number(reservationEls.units.value),
      agreedPrice: Number(reservationEls.price.value),
    });
    draft.item.unidadesReservables = result.reservableUnits;
    closeReservationModal();
    showToast("Reserva guardada.", "success");
    await loadReservations();
    applyFilters();
  } catch (error) {
    console.error(error);
    setReservationAlert(error.message);
    updateReservationSummary();
  } finally {
    reservationEls.confirm.textContent = "Reservar";
  }
}

reservationEls.search.addEventListener("input", renderContactOptions);
reservationEls.list.addEventListener("click", (e) => {
  const option = e.target.closest("[data-contact-id]");
  if (option) selectContact(option.dataset.contactId);
});
reservationEls.newToggle.addEventListener("click", () => {
  toggleNewContactForm(reservationEls.newForm.classList.contains("hidden"));
});
reservationEls.newSave.addEventListener("click", () => saveNewContact());
reservationEls.units.addEventListener("input", updateReservationSummary);
reservationEls.price.addEventListener("input", updateReservationSummary);
reservationEls.cancel.addEventListener("click", closeReservationModal);
reservationEls.confirm.addEventListener("click", submitReservation);
