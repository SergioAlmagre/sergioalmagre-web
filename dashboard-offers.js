// Pestaña "Ofertas" del dashboard (se carga después de dashboard.js)
(() => {
  const STATUS = {
    new: { label: "Nueva", css: "new" },
    countered: { label: "Contraoferta", css: "countered" },
    accepted: { label: "Aceptada", css: "accepted" },
    rejected: { label: "Rechazada", css: "rejected" },
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    tabBtn: $("tab-offers-btn"),
    badge: $("offers-badge"),
    stats: $("offers-stats"),
    search: $("offers-search"),
    product: $("offers-product"),
    sort: $("offers-sort"),
    refresh: $("offers-refresh"),
    alert: $("offers-alert"),
    emailWarning: $("offers-email-warning"),
    loader: $("offers-loader"),
    tableWrap: $("offers-table-wrap"),
    body: $("offers-body"),
    empty: $("offers-empty"),
    modal: $("offer-reply-modal"),
    summary: $("offer-reply-summary"),
    decisions: document.querySelectorAll("[data-offer-decision]"),
    counterWrap: $("offer-counter-wrap"),
    counter: $("offer-counter-price"),
    counterInfo: $("offer-counter-info"),
    note: $("offer-reply-note"),
    replyAlert: $("offer-reply-alert"),
    previewTo: $("offer-preview-to"),
    previewSubject: $("offer-preview-subject"),
    previewFrame: $("offer-preview-frame"),
    cancel: $("offer-reply-cancel"),
    save: $("offer-reply-save"),
    send: $("offer-reply-send"),
  };
  if (!els.tabBtn) return;

  let offers = [];
  let emailInfo = { canReply: false, canNotify: false };
  let statusFilter = "";
  let expandedId = null;
  let loaded = false;
  let reply = null; // { offer, decision }
  let previewTimer = null;
  let previewSeq = 0;

  const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const money = (v) => `${Number(v || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
  const pct = (list, price) => (list > 0 ? Math.round(((list - price) / list) * 1000) / 10 : 0);
  const norm = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "");

  async function api(body) {
    const response = await fetch("/api/notion/offers", body ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    } : undefined);
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) window.location.href = "/login.html";
    if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
    return data;
  }

  function setAlert(message) {
    els.alert.textContent = message;
    els.alert.classList.toggle("hidden", !message);
  }

  async function load() {
    els.loader.classList.remove("hidden");
    setAlert("");
    try {
      const data = await api();
      offers = data.offers || [];
      emailInfo = data.email || emailInfo;
      loaded = true;
    } catch (error) {
      console.error(error);
      setAlert(error.message);
    } finally {
      els.loader.classList.add("hidden");
    }
    render();
  }

  function updateBadge() {
    const pending = offers.filter((o) => o.decision === "new").length;
    els.badge.textContent = pending;
    els.badge.classList.toggle("hidden", pending === 0);
  }

  function renderStats() {
    const count = (d) => offers.filter((o) => o.decision === d).length;
    const chips = [["", "Todas", offers.length], ...Object.entries(STATUS).map(([k, s]) => [k, s.label, count(k)])];
    els.stats.innerHTML = chips.map(([key, label, n]) => `
      <button type="button" class="offers-chip ${key ? `offer-status-${STATUS[key].css}` : ""} ${statusFilter === key ? "active" : ""}" data-status="${key}">
        ${esc(label)} <strong>${n}</strong>
      </button>`).join("");
  }

  function renderProductOptions() {
    const current = els.product.value;
    const names = [...new Set(offers.map((o) => o.item).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    els.product.innerHTML = `<option value="">Todos los artículos</option>` +
      names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
    if (names.includes(current)) els.product.value = current;
  }

  function filtered() {
    const q = norm(els.search.value);
    const product = els.product.value;
    const list = offers.filter((o) =>
      (!statusFilter || o.decision === statusFilter) &&
      (!product || o.item === product) &&
      (!q || norm(`${o.name} ${o.email} ${o.phone} ${o.item} ${o.message}`).includes(q))
    );
    const sorters = {
      recent: (a, b) => new Date(b.date) - new Date(a.date),
      oldest: (a, b) => new Date(a.date) - new Date(b.date),
      discountDesc: (a, b) => pct(b.listPrice, b.offerPrice) - pct(a.listPrice, a.offerPrice),
      discountAsc: (a, b) => pct(a.listPrice, a.offerPrice) - pct(b.listPrice, b.offerPrice),
      totalDesc: (a, b) => b.offerPrice * b.units - a.offerPrice * a.units,
      item: (a, b) => a.item.localeCompare(b.item, "es") || new Date(b.date) - new Date(a.date),
    };
    return list.sort(sorters[els.sort.value] || sorters.recent);
  }

  function responseCell(o) {
    if (o.decision === "new") return `<span class="offers-dim">Pendiente</span>`;
    const price = o.decision === "accepted" ? o.offerPrice : o.decision === "countered" ? o.counterPrice : null;
    const mail = o.emailSent ? `<span title="Email enviado">✉️</span>` : `<span title="Sin email enviado" class="offers-dim">—</span>`;
    return `${price !== null ? `<strong>${money(price)}</strong>/ud · ` : ""}${mail}`;
  }

  function renderRows() {
    const list = filtered();
    els.empty.classList.toggle("hidden", list.length > 0 || !loaded);
    els.tableWrap.classList.toggle("hidden", list.length === 0);
    els.body.innerHTML = list.map((o) => {
      const d = pct(o.listPrice, o.offerPrice);
      const s = STATUS[o.decision];
      const isOpen = expandedId === o.id;
      const row = `
        <tr class="offers-row ${isOpen ? "open" : ""} ${o.decision === "new" ? "is-new" : ""}" data-id="${esc(o.id)}">
          <td class="offers-nowrap">${esc(fmtDate(o.date))}</td>
          <td><strong>${esc(o.item)}</strong></td>
          <td>${esc(o.name)}<div class="offers-dim">${esc(o.email)}</div></td>
          <td class="num">${o.units}</td>
          <td class="num">${money(o.listPrice)}</td>
          <td class="num"><strong>${money(o.offerPrice)}</strong></td>
          <td class="num ${d >= 20 ? "offers-high" : ""}">${d.toLocaleString("es-ES")} %</td>
          <td class="num">${money(o.offerPrice * o.units)}</td>
          <td><span class="offer-status offer-status-${s.css}">${s.label}</span></td>
          <td class="offers-nowrap">${responseCell(o)}</td>
          <td><button type="button" class="btn-ghost offers-reply-btn" data-reply="${esc(o.id)}">Responder</button></td>
        </tr>`;
      if (!isOpen) return row;
      return row + `
        <tr class="offers-detail"><td colspan="11">
          <div class="offers-detail-grid">
            <div><span class="offers-label">Teléfono</span>${o.phone ? `<a href="tel:${esc(o.phone)}">${esc(o.phone)}</a>` : "—"}</div>
            <div><span class="offers-label">Email</span><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></div>
            <div><span class="offers-label">Idioma</span>${o.lang === "en" ? "Inglés" : "Español"}</div>
            <div><span class="offers-label">Respondida</span>${o.replyDate ? esc(fmtDate(o.replyDate)) : "—"}</div>
          </div>
          <div class="offers-message"><span class="offers-label">Mensaje del ofertante</span>${o.message ? esc(o.message).replace(/\n/g, "<br>") : `<span class="offers-dim">Sin mensaje</span>`}</div>
          ${o.reply ? `<div class="offers-message"><span class="offers-label">Tu mensaje</span>${esc(o.reply).replace(/\n/g, "<br>")}</div>` : ""}
          <div class="offers-detail-actions">
            <button type="button" class="btn-ghost" data-copy-email="${esc(o.email)}">Copiar email</button>
            ${o.decision !== "new" ? `<button type="button" class="btn-ghost" data-reset="${esc(o.id)}">Volver a Nueva</button>` : ""}
            <button type="button" class="btn-ghost offers-danger" data-archive="${esc(o.id)}">Eliminar</button>
          </div>
        </td></tr>`;
    }).join("");
  }

  function render() {
    updateBadge();
    renderStats();
    renderProductOptions();
    els.emailWarning.classList.toggle("hidden", !loaded || (emailInfo.canReply && emailInfo.canNotify));
    renderRows();
  }

  // ---------------------------------------------------------------------
  // Modal de respuesta
  // ---------------------------------------------------------------------

  function setReplyAlert(message) {
    els.replyAlert.textContent = message;
    els.replyAlert.classList.toggle("hidden", !message);
  }

  function updateCounterInfo() {
    const { offer } = reply;
    const price = Number(els.counter.value);
    els.counterInfo.textContent = price > 0
      ? `Total ${money(price * offer.units)} · ${pct(offer.listPrice, price).toLocaleString("es-ES")} % de descuento sobre el publicado`
      : "";
  }

  function canSubmit() {
    return reply.decision !== "countered" || Number(els.counter.value) > 0;
  }

  function updateButtons() {
    const ok = canSubmit();
    els.save.disabled = !ok;
    els.send.disabled = !ok || !emailInfo.canReply;
    els.send.title = emailInfo.canReply ? "" : "Configura RESEND_API_KEY para enviar correos";
  }

  function selectDecision(decision) {
    reply.decision = decision;
    els.decisions.forEach((b) => b.classList.toggle("active", b.dataset.offerDecision === decision));
    els.counterWrap.classList.toggle("hidden", decision !== "countered");
    if (decision === "countered") {
      if (!els.counter.value) {
        els.counter.value = reply.offer.counterPrice || Math.round((reply.offer.listPrice + reply.offer.offerPrice) / 2);
      }
      updateCounterInfo();
    }
    updateButtons();
    schedulePreview();
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(loadPreview, 300);
  }

  async function loadPreview() {
    if (!reply || !canSubmit()) return;
    const seq = ++previewSeq;
    try {
      const data = await api({
        action: "preview",
        offerId: reply.offer.id,
        decision: reply.decision,
        counterPrice: Number(els.counter.value),
        note: els.note.value,
      });
      if (seq !== previewSeq) return;
      els.previewSubject.textContent = data.subject;
      els.previewFrame.srcdoc = data.html;
    } catch (error) {
      if (seq === previewSeq) setReplyAlert(error.message);
    }
  }

  function openReply(offer) {
    reply = { offer, decision: offer.decision === "new" ? "accepted" : offer.decision };
    const d = pct(offer.listPrice, offer.offerPrice);
    els.summary.innerHTML = `
      <table class="offers-mini">
        <tr><td>Artículo</td><td><strong>${esc(offer.item)}</strong></td></tr>
        <tr><td>Ofertante</td><td>${esc(offer.name)} · ${esc(offer.email)}${offer.phone ? ` · ${esc(offer.phone)}` : ""}</td></tr>
        <tr><td>Publicado</td><td>${money(offer.listPrice)}/ud</td></tr>
        <tr><td>Oferta</td><td><strong>${money(offer.offerPrice)}/ud</strong> × ${offer.units} = ${money(offer.offerPrice * offer.units)} (${d.toLocaleString("es-ES")} % dto.)</td></tr>
        ${offer.message ? `<tr><td>Mensaje</td><td>${esc(offer.message)}</td></tr>` : ""}
      </table>`;
    els.counter.value = offer.counterPrice || "";
    els.note.value = offer.reply || "";
    els.previewTo.textContent = `${offer.name} <${offer.email}> · ${offer.lang === "en" ? "inglés" : "español"}`;
    els.previewSubject.textContent = "";
    els.previewFrame.srcdoc = "";
    setReplyAlert(emailInfo.canReply ? "" : "El envío de correos aún no está configurado: puedes guardar la respuesta, pero no enviarla.");
    els.modal.classList.remove("hidden");
    selectDecision(reply.decision);
  }

  function closeReply() {
    els.modal.classList.add("hidden");
    reply = null;
    clearTimeout(previewTimer);
  }

  async function submitReply(send) {
    if (!reply || !canSubmit()) return;
    const current = reply;
    const button = send ? els.send : els.save;
    const label = button.textContent;
    button.disabled = true;
    button.textContent = send ? "Enviando..." : "Guardando...";
    setReplyAlert("");
    try {
      await api({
        action: "respond",
        offerId: current.offer.id,
        decision: current.decision,
        counterPrice: Number(els.counter.value),
        note: els.note.value,
        send,
      });
      closeReply();
      showToast(send ? `Respuesta enviada a ${esc(current.offer.email)}.` : "Respuesta guardada.", "success");
      await load();
    } catch (error) {
      console.error(error);
      setReplyAlert(error.message);
    } finally {
      button.textContent = label;
      if (reply) updateButtons();
    }
  }

  async function setStatusNew(offer) {
    try {
      await api({ action: "respond", offerId: offer.id, decision: "new", send: false });
      showToast("Oferta marcada como nueva.", "success");
      await load();
    } catch (error) {
      showToast(esc(error.message), "error");
    }
  }

  function archive(offer) {
    openConfirmModal(
      "Eliminar oferta",
      `Se eliminará la oferta de ${offer.name} por "${offer.item}". Quedará en la papelera de Notion durante 30 días.`,
      async () => {
        try {
          await api({ action: "archive", offerId: offer.id });
          showToast("Oferta eliminada.", "success");
          await load();
        } catch (error) {
          showToast(esc(error.message), "error");
        }
      }
    );
  }

  // ---------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------

  els.stats.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-status]");
    if (!chip) return;
    statusFilter = chip.dataset.status;
    renderStats();
    renderRows();
  });
  [els.search, els.product, els.sort].forEach((el) => el.addEventListener("input", renderRows));
  els.refresh.addEventListener("click", load);

  els.body.addEventListener("click", (e) => {
    const find = (id) => offers.find((o) => o.id === id);
    const replyBtn = e.target.closest("[data-reply]");
    if (replyBtn) return openReply(find(replyBtn.dataset.reply));
    const archiveBtn = e.target.closest("[data-archive]");
    if (archiveBtn) return archive(find(archiveBtn.dataset.archive));
    const resetBtn = e.target.closest("[data-reset]");
    if (resetBtn) return setStatusNew(find(resetBtn.dataset.reset));
    const copyBtn = e.target.closest("[data-copy-email]");
    if (copyBtn) {
      navigator.clipboard.writeText(copyBtn.dataset.copyEmail).then(() => showToast("Email copiado."));
      return;
    }
    if (e.target.closest("a, button")) return;
    const row = e.target.closest(".offers-row");
    if (row) {
      expandedId = expandedId === row.dataset.id ? null : row.dataset.id;
      renderRows();
    }
  });

  els.decisions.forEach((b) => b.addEventListener("click", () => selectDecision(b.dataset.offerDecision)));
  els.counter.addEventListener("input", () => {
    updateCounterInfo();
    updateButtons();
    schedulePreview();
  });
  els.note.addEventListener("input", schedulePreview);
  els.cancel.addEventListener("click", closeReply);
  els.save.addEventListener("click", () => submitReply(false));
  els.send.addEventListener("click", () => submitReply(true));

  els.tabBtn.addEventListener("click", () => {
    if (!loaded) load();
    else render();
  });

  // El enlace del correo de aviso abre directamente esta pestaña
  if (window.location.hash === "#ofertas") els.tabBtn.click();
  else load(); // Para mostrar el contador de ofertas nuevas
})();
