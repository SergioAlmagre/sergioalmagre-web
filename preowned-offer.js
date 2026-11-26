// Formulario público "Hacer una oferta" (lo abre preowned.js con window.openOfferModal)
(() => {
  const t = (key, vars) => (window.I18n ? window.I18n.t(key, vars) : key);
  const modal = document.getElementById("offer-modal");
  if (!modal) return;

  const els = {
    form: document.getElementById("offer-form"),
    item: document.getElementById("offer-item-name"),
    listed: document.getElementById("offer-listed"),
    units: document.getElementById("offer-units"),
    unitsWrap: document.getElementById("offer-units-wrap"),
    price: document.getElementById("offer-price"),
    summary: document.getElementById("offer-summary"),
    status: document.getElementById("offer-status"),
    submit: document.getElementById("offer-submit"),
    close: document.getElementById("offer-close"),
    done: document.getElementById("offer-done"),
    doneText: document.getElementById("offer-done-text"),
    doneClose: document.getElementById("offer-done-close"),
  };

  let current = null;
  let openedAt = 0;

  const money = (value) =>
    `${Number(value || 0).toLocaleString(window.I18n?.locale === "en" ? "en-GB" : "es-ES", { maximumFractionDigits: 2 })} €`;

  function available(item) {
    return Math.max(1, (item.cantidad || 1) - (item.reservedUnits || 0));
  }

  function updateSummary() {
    if (!current) return;
    const units = Number(els.units.value) || 1;
    const price = Number(els.price.value);
    const list = current.secondHandPrice || 0;
    if (!(price > 0)) {
      els.summary.textContent = "";
      return;
    }
    const parts = [t("store.offerTotal", { total: money(price * units) })];
    if (list > 0 && price < list) {
      parts.push(t("store.offerDiscount", { percentage: Math.round(((list - price) / list) * 100) }));
    }
    els.summary.textContent = parts.join(" · ");
  }

  function showStatus(message) {
    els.status.textContent = message;
    els.status.classList.toggle("hidden", !message);
  }

  function open(item) {
    if (!item) return;
    current = item;
    openedAt = Date.now();
    els.form.reset();
    els.form.classList.remove("hidden");
    els.done.classList.add("hidden");
    showStatus("");
    els.item.textContent = item.title;
    els.listed.textContent = t("store.offerListed", { price: money(item.secondHandPrice) });
    const max = available(item);
    els.units.max = max;
    els.units.value = 1;
    els.unitsWrap.classList.toggle("hidden", max <= 1);
    els.price.max = Math.max(1, Math.ceil(item.secondHandPrice || 1000000));
    updateSummary();
    modal.classList.remove("hidden");
    setTimeout(() => document.getElementById("offer-name").focus(), 50);
  }

  function close() {
    modal.classList.add("hidden");
    current = null;
  }

  const ERROR_KEYS = {
    invalid_data: "store.offerErrorInvalid",
    consent_required: "store.offerErrorConsent",
    unavailable: "store.offerErrorUnavailable",
    too_many_units: "store.offerErrorUnits",
    rate_limited: "store.offerErrorRate",
    duplicate: "store.offerErrorDuplicate",
  };

  async function submit(event) {
    event.preventDefault();
    if (!current) return;
    if (!els.form.reportValidity()) return;

    const data = new FormData(els.form);
    const email = String(data.get("email") || "").trim();
    els.submit.disabled = true;
    els.submit.textContent = t("store.offerSending");
    showStatus("");

    try {
      const response = await fetch("/api/public/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: current.id,
          name: data.get("name"),
          email,
          phone: data.get("phone"),
          units: Number(data.get("units")) || 1,
          price: Number(data.get("price")),
          message: data.get("message"),
          consent: data.get("consent") === "on",
          website: data.get("website"),
          elapsed: Date.now() - openedAt,
          lang: window.I18n?.locale === "en" ? "en" : "es",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        showStatus(t(ERROR_KEYS[result.code] || "store.offerErrorServer"));
        return;
      }
      els.form.classList.add("hidden");
      els.doneText.textContent = t("store.offerSuccess", { email });
      els.done.classList.remove("hidden");
    } catch (_) {
      showStatus(t("store.offerErrorServer"));
    } finally {
      els.submit.disabled = false;
      els.submit.textContent = t("store.offerSubmit");
    }
  }

  els.form.addEventListener("submit", submit);
  els.units.addEventListener("input", updateSummary);
  els.price.addEventListener("input", updateSummary);
  els.close.addEventListener("click", close);
  els.doneClose.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  // Escape cierra primero este formulario y no el detalle del producto que hay debajo
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      e.stopImmediatePropagation();
      close();
    }
  }, true);
  window.addEventListener("languagechange", () => {
    if (current) {
      els.listed.textContent = t("store.offerListed", { price: money(current.secondHandPrice) });
      updateSummary();
    }
  });

  window.openOfferModal = open;
})();
