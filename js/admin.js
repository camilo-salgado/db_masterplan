"use strict";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const requestOptions = { credentials: "same-origin", cache: "no-store" };
let allRecords = [];
let currentRecordId = null;
let currentRecordData = null;

const ADMIN_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
let adminIdleTimer = null;
let adminSecurityStarted = false;
let loadingDashboard = false;
let currentRecordMode = "apartments";
let dashboardClockTimer = null;

function displayManzana(value) {
  return String(value ?? "").replace(/^Bloque\s+/i, "Manzana ");
}

document.addEventListener("DOMContentLoaded", () => {
  $("#loginForm").onsubmit = login;
  $("#logoutButton").onclick = logout;
  $("#searchInput").oninput = renderRecords;
  $("#towerFilter").onchange = renderRecords;
    $("#statusFilter").onchange = renderRecords;
  $("#clearApartmentFilters").onclick = clearApartmentFilters;
  $("#closeDetail").onclick = () => $("#detailModal").classList.add("hidden");

  $("#editRecordButton").onclick = () => {
    if (currentRecordId) openEditRecord(currentRecordId);
  };

  $("#closeEditModal").onclick = closeEditRecord;
  $("#cancelEditRecord").onclick = closeEditRecord;
  $("#editRecordForm").onsubmit = saveEditedRecord;
  $("#editAddResident").onclick = () => addEditResident();
  $("#editAddVehicle").onclick = () => addEditVehicle();
  $("#editAddPet").onclick = () => addEditPet();
  $("#editStatus").onchange = updateEditVacantState;
  $("#exportExcelButton").onclick = openExportModal;
  $("#closeExportModal").onclick = closeExportModal;
  $("#cancelExport").onclick = closeExportModal;
  $("#exportForm").onsubmit = exportExcel;
  $("#viewAllRecent").onclick = () => {
    const button = $('.nav[data-mode="apartments"]');
    openRecordsMode("apartments", button);
  };

  $$(".nav[data-view]").forEach((button) => {
    button.onclick = () => switchView(button.dataset.view, button);
  });

  $$(".nav[data-mode]").forEach((button) => {
    button.onclick = () => openRecordsMode(button.dataset.mode, button);
  });

  updateDashboardClock();
  dashboardClockTimer = setInterval(updateDashboardClock, 30000);
  checkSession();
});

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...requestOptions,
    ...options,
    cache: "no-store"
  });

  const isAuthEndpoint =
    url.includes("/api/admin/login") ||
    url.includes("/api/admin/logout") ||
    url.includes("/api/admin/session");

  if (response.status === 401 && !isAuthEndpoint) {
    await forceAdminLogout(
      "La sesión administrativa venció. Ingrese nuevamente."
    );
  }

  return response;
}

async function checkSession() {
  $("#dashboardView").classList.add("hidden");
  $("#loginView").classList.remove("hidden");

  try {
    const response = await apiFetch("/api/admin/session");

    if (response.ok) {
      await showDashboard();
    startAdminSecurity();
      return;
    }

    $("#password").value = "";
  } catch {
    showLoginError("No fue posible verificar la sesión.");
  }
}

async function login(event) {
  event.preventDefault();
  showLoginError("");

  const button = $("#loginForm button[type='submit']");
  button.disabled = true;
  button.textContent = "Ingresando...";

  try {
    const response = await apiFetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: $("#password").value })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showLoginError(data.error || "Contraseña incorrecta.");
      return;
    }

    const session = await apiFetch("/api/admin/session");
    if (!session.ok) {
      showLoginError("La sesión no pudo iniciarse. Actualice la página e intente de nuevo.");
      return;
    }

    await showDashboard();
  } catch {
    showLoginError("No fue posible conectar con el servidor.");
  } finally {
    button.disabled = false;
    button.textContent = "Ingresar";
  }
}

function showLoginError(message) {
  $("#loginError").textContent = message;
}

async function logout() {
  stopAdminSecurity();
  await fetch("/api/admin/logout", {
    method: "POST",
    cache: "no-store"
  }).catch(() => null);

  location.replace("/admin.html");
}

async function forceAdminLogout(message = "") {
  stopAdminSecurity();

  await fetch("/api/admin/logout", {
    method: "POST",
    cache: "no-store"
  }).catch(() => null);

  $("#dashboardView").classList.add("hidden");
  $("#loginView").classList.remove("hidden");
  $("#password").value = "";

  if (message) {
    showLoginError(message);
  }

  window.scrollTo({ top: 0, behavior: "auto" });
}

function resetAdminIdleTimer() {
  if (!adminSecurityStarted) return;

  clearTimeout(adminIdleTimer);
  adminIdleTimer = setTimeout(() => {
    forceAdminLogout(
      "La sesión se cerró automáticamente por 15 minutos de inactividad."
    );
  }, ADMIN_IDLE_TIMEOUT_MS);
}

function startAdminSecurity() {
  if (adminSecurityStarted) {
    resetAdminIdleTimer();
    return;
  }

  adminSecurityStarted = true;

  const events = [
    "click",
    "keydown",
    "touchstart",
    "pointerdown",
    "scroll"
  ];

  events.forEach((eventName) => {
    window.addEventListener(
      eventName,
      resetAdminIdleTimer,
      { passive: true }
    );
  });

  /*
   * Si la pestaña vuelve a estar visible, comprobamos la sesión
   * en el servidor antes de seguir mostrando información.
   */
  document.addEventListener("visibilitychange", verifyAdminSessionOnReturn);

  resetAdminIdleTimer();
}

function stopAdminSecurity() {
  adminSecurityStarted = false;
  clearTimeout(adminIdleTimer);
  adminIdleTimer = null;
}

async function verifyAdminSessionOnReturn() {
  if (
    document.visibilityState !== "visible" ||
    !adminSecurityStarted
  ) {
    return;
  }

  try {
    const response = await fetch("/api/admin/session", {
      cache: "no-store"
    });

    if (!response.ok) {
      await forceAdminLogout(
        "La sesión administrativa venció. Ingrese nuevamente."
      );
    }
  } catch {
    /*
     * Un corte temporal de conexión no expone el panel a un usuario nuevo.
     * Las API protegidas continuarán exigiendo una sesión válida.
     */
  }
}

async function showDashboard() {
  if (loadingDashboard) return;
  loadingDashboard = true;

  $("#loginView").classList.add("hidden");
  $("#dashboardView").classList.remove("hidden");
  setAdminMessage("Cargando información...", "info");

  try {
    const results = await Promise.allSettled([loadStats(), loadRecords()]);
    const failures = results.filter((result) => result.status === "rejected");

    if (failures.length) {
      setAdminMessage(failures[0].reason?.message || "No fue posible cargar toda la información.", "error");
    } else {
      setAdminMessage("", "info");
    }
  } finally {
    loadingDashboard = false;
  }
}

let adminMessageTimer = null;

function setAdminMessage(message, type = "info") {
  const box = $("#adminMessage");

  if (adminMessageTimer) {
    clearTimeout(adminMessageTimer);
    adminMessageTimer = null;
  }

  if (!message) {
    box.className = "admin-message hidden";
    box.textContent = "";
    return;
  }

  const safeType = ["info", "error", "message-success"].includes(type)
    ? type
    : "info";

  box.className = `admin-message admin-toast ${safeType}`;
  box.textContent = message;

  if (safeType === "message-success") {
    adminMessageTimer = setTimeout(() => {
      box.className = "admin-message hidden";
      box.textContent = "";
    }, 4000);
  }
}

function setActiveNav(button) {
  $$(".sidebar-nav .nav").forEach((item) => item.classList.remove("active"));
  if (button) button.classList.add("active");
}

function switchView(view, button) {
  $("#summaryView").classList.toggle("hidden", view !== "summary");
  $("#recordsView").classList.toggle("hidden", view === "summary");
  setActiveNav(button);
}

function openRecordsMode(mode, button) {
  currentRecordMode = mode || "apartments";
  $("#summaryView").classList.add("hidden");
  $("#recordsView").classList.remove("hidden");
  setActiveNav(button);

  const config = {
    apartments: {
      title: "Casas",
      description: "Consulta y administra la información censada de cada casa.",
      placeholder: "Casa, residente, documento, teléfono, placa, parqueadero o mascota"
    },
    residents: {
      title: "Residentes",
      description: "Consulta las casas que cuentan con personas residentes registradas.",
      placeholder: "Nombre, documento, teléfono o casa"
    },
    vehicles: {
      title: "Vehículos",
      description: "Consulta las casas que tienen vehículos registrados.",
      placeholder: "Placa, casa, residente o marca"
    },
    pets: {
      title: "Animales de compañía",
      description: "Consulta las casas que tienen animales de compañía registrados.",
      placeholder: "Nombre de mascota, casa o residente"
    }
  }[currentRecordMode];

  $("#recordsViewTitle").textContent = config.title;
  $("#recordsViewDescription").textContent = config.description;
  $("#searchInput").placeholder = config.placeholder;

  const isApartments = currentRecordMode === "apartments";
  $("#apartmentModuleSummary").classList.toggle("hidden", !isApartments);
  $("#statusFilterWrap").classList.toggle("hidden", !isApartments);

  if (!isApartments) {
    $("#statusFilter").value = "";
  }

  renderRecords();
}

function updateDashboardClock() {
  const now = new Date();

  $("#dashboardDate").textContent = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);

  $("#dashboardTime").textContent = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit"
  }).format(now);
}


function openExportModal() {
  $("#exportModal").classList.remove("hidden");
}

function closeExportModal() {
  $("#exportModal").classList.add("hidden");
}

function filterExportData(data, scope) {
  const matches = (item) => {
    if (scope === "all") return true;
    if (scope === "occupied") return item.estado_apartamento === "Ocupado";
    if (scope === "vacant") return item.estado_apartamento === "Desocupado";
    return item.torre === scope;
  };

  return {
    apartamentos: (data.apartamentos || []).filter(matches),
    residentes: (data.residentes || []).filter(matches),
    vehiculos: (data.vehiculos || []).filter(matches),
    mascotas: (data.mascotas || []).filter(matches)
  };
}

function exportScopeLabel(scope) {
  const labels = {
    all: "Todo el conjunto",
    "Bloque 01": "Manzana 01",
    "Bloque 02": "Manzana 02",
    "Bloque 03": "Manzana 03",
    "Bloque 04": "Manzana 04",
    occupied: "Casas ocupadas",
    vacant: "Casas desocupadas"
  };

  return labels[scope] || "Todo el conjunto";
}

async function exportExcel(event) {
  event?.preventDefault();

  const selectedScope =
    new FormData($("#exportForm")).get("exportScope") || "all";

  const button = $("#confirmExport");
  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = "Preparando...";
  setAdminMessage(
    "Preparando el archivo de Excel. Espere un momento...",
    "info"
  );

  try {
    if (typeof XLSX === "undefined") {
      throw new Error(
        "No fue posible cargar el componente de Excel. Verifique la conexión a internet y recargue la página."
      );
    }

    const response = await apiFetch("/api/admin/exportar");
    const rawData = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error(
        "La sesión administrativa venció. Ingrese nuevamente."
      );
    }

    if (!response.ok) {
      throw new Error(
        rawData.error ||
        "No fue posible preparar la información para Excel."
      );
    }

    const data = filterExportData(rawData, selectedScope);

    if (!data.apartamentos.length) {
      throw new Error(
        "No hay registros disponibles para el filtro seleccionado."
      );
    }

    const workbook = XLSX.utils.book_new();
    const scopeLabel = exportScopeLabel(selectedScope);
    const generatedAt = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "long",
      timeStyle: "short"
    }).format(new Date());

    workbook.Props = {
      Title: `Caracterización residencial - ${scopeLabel}`,
      Subject:
        "Exportación administrativa de casas, residentes, vehículos y animales de compañía",
      Author: "Urbanización La Villa de Marcos",
      Company: "La Villa de Marcos",
      CreatedDate: new Date()
    };

    const occupied = data.apartamentos.filter(
      (item) => item.estado_apartamento === "Ocupado"
    ).length;

    const vacant = data.apartamentos.filter(
      (item) => item.estado_apartamento === "Desocupado"
    ).length;

    addExcelSheet(workbook, "Resumen", [
      {
        "Conjunto": "La Villa de Marcos",
        "Filtro aplicado": scopeLabel,
        "Fecha de exportación": generatedAt,
        "Casas registradas": data.apartamentos.length,
        "Casas ocupadas": occupied,
        "Casas desocupadas": vacant,
        "Residentes": data.residentes.length,
        "Vehículos": data.vehiculos.length,
        "Animales de compañía": data.mascotas.length
      }
    ]);

    addExcelSheet(
      workbook,
      "Casas",
      data.apartamentos.map((item) => ({
        "Radicado": item.radicado,
        "Manzana": displayManzana(item.torre),
        "Casa": item.apartamento,
        "Estado": item.estado_apartamento,
        "Tipo de ocupación": item.tipo_ocupacion,
        "Parqueadero": item.parqueadero,
        "Responsable - nombres": item.responsable_nombres,
        "Responsable - apellidos": item.responsable_apellidos,
        "Tipo de documento": item.responsable_tipo_documento,
        "Documento": item.responsable_documento,
        "Teléfono": item.responsable_telefono,
        "Correo": item.responsable_correo,
        "Propietario - conocimiento": item.propietario_conocimiento,
        "Propietario - nombres": item.propietario_nombres,
        "Propietario - apellidos": item.propietario_apellidos,
        "Propietario - tipo de documento": item.propietario_tipo_documento,
        "Propietario - documento": item.propietario_documento,
        "Propietario - fecha de nacimiento": item.propietario_fecha_nacimiento,
        "Propietario - edad calculada": calculateAge(item.propietario_fecha_nacimiento),
        "Propietario - sexo": item.propietario_sexo,
        "Propietario - teléfono": item.propietario_telefono,
        "Propietario - correo": item.propietario_correo,
        "Fecha de registro": formatBogotaDateTime(item.creado_en),
        "Última actualización": formatBogotaDateTime(item.actualizado_en)
      }))
    );

    addExcelSheet(
      workbook,
      "Residentes",
      data.residentes.map((item) => ({
        "Manzana": displayManzana(item.torre),
        "Casa": item.apartamento,
        "Estado de la casa": item.estado_apartamento,
        "Radicado": item.radicado,
        "Nombres": item.nombres,
        "Apellidos": item.apellidos,
        "Tipo de documento": item.tipo_documento,
        "Documento": item.documento,
        "Fecha de nacimiento": item.fecha_nacimiento,
        "Edad calculada": calculateAge(item.fecha_nacimiento),
        "Responsable de la casa": Number(item.es_responsable) === 1 ? "Sí" : "No",
        "Sexo": item.sexo,
        "Parentesco": item.parentesco,
        "Actividad principal": item.actividad,
        "Teléfono": item.telefono,
        "Correo": item.correo
      }))
    );

    addExcelSheet(
      workbook,
      "Vehículos",
      data.vehiculos.map((item) => ({
        "Manzana": displayManzana(item.torre),
        "Casa": item.apartamento,
        "Estado de la casa": item.estado_apartamento,
        "Radicado": item.radicado,
        "Tipo": item.tipo,
        "Placa": item.placa,
        "Marca": item.marca,
        "Línea o referencia": item.linea,
        "Modelo o año": item.modelo,
        "Color": item.color,
        "Parqueadero": item.parqueadero,
        "Residente asociado": [
          item.propietario_nombres,
          item.propietario_apellidos
        ].filter(Boolean).join(" "),
        "Observaciones": item.observaciones
      }))
    );

    addExcelSheet(
      workbook,
      "Animales",
      data.mascotas.map((item) => ({
        "Manzana": displayManzana(item.torre),
        "Casa": item.apartamento,
        "Estado de la casa": item.estado_apartamento,
        "Radicado": item.radicado,
        "Documento del acudiente": item.acudiente_documento,
        "Nombre": item.nombre,
        "Especie": item.especie,
        "Sexo": item.sexo,
        "Raza": item.raza,
        "Color": item.color,
        "Edad": item.edad,
        "Unidad de edad": item.unidad_edad,
        "Esterilizado": item.esterilizado,
        "Microchip": item.microchip,
        "Número de microchip": item.numero_microchip,
        "Observaciones": item.observaciones
      }))
    );

    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    const safeScope = scopeLabel
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    XLSX.writeFile(
      workbook,
      `La_Villa_de_Marcos_${safeScope}_${date}.xlsx`,
      { compression: true }
    );

    closeExportModal();
    setAdminMessage(
      "El archivo de Excel se generó correctamente.",
      "message-success"
    );
  } catch (error) {
    setAdminMessage(
      error.message || "No fue posible exportar la información.",
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function addExcelSheet(workbook, name, rows) {
  const safeRows = rows.length ? rows : [{ "Información": "No hay registros disponibles" }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  const headers = Object.keys(safeRows[0]);

  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(0, safeRows.length), c: Math.max(0, headers.length - 1) }
    })
  };

  worksheet["!cols"] = headers.map((header) => {
    const maxContent = safeRows.reduce((max, row) => {
      return Math.max(max, String(row[header] ?? "").length);
    }, header.length);

    return { wch: Math.min(40, Math.max(12, maxContent + 2)) };
  });

  XLSX.utils.book_append_sheet(workbook, worksheet, name);
}

async function loadStats() {
  const response = await apiFetch("/api/admin/stats");
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("La sesión administrativa venció. Cierre sesión e ingrese nuevamente.");
  }

  if (!response.ok) {
    throw new Error(data.error || "No fue posible cargar las estadísticas.");
  }

  const total = Number(data.totalApartamentos || 85);
  const registered = Number(data.apartamentos || 0);
  const occupied = Number(data.ocupados || 0);
  const vacant = Number(data.desocupados || 0);
  const pending = Number(data.pendientes ?? Math.max(0, total - registered));
  const residents = Number(data.residentes || 0);
  const vehicles = Number(data.vehiculos || 0);
  const pets = Number(data.mascotas || 0);
  const progress = Math.min(100, Number(data.porcentaje || 0));

  const occupiedPct = total ? (occupied / total) * 100 : 0;
  const vacantPct = total ? (vacant / total) * 100 : 0;
  const pendingPct = total ? (pending / total) * 100 : 0;
  const registeredPct = occupiedPct + vacantPct;

  $("#statTotalApartments").textContent = total;
  $("#statOccupied").textContent = occupied;
  $("#statVacant").textContent = vacant;
  $("#statResidents").textContent = residents;
  $("#statVehicles").textContent = vehicles;
  $("#statPets").textContent = pets;

  $("#occupiedPercent").textContent = `${occupiedPct.toFixed(1)}% del conjunto`;
  $("#vacantPercent").textContent = `${vacantPct.toFixed(1)}% del conjunto`;
  $("#residentAverageTop").textContent =
    `Promedio: ${Number(data.promedioResidentes || 0).toFixed(2)} por casa`;
  $("#vehicleApartmentPercent").textContent = registered
    ? `${((Number(data.apartamentosConVehiculo || 0) / registered) * 100).toFixed(1)}% de casas registradas`
    : "0% de casas registradas";

  $("#censusProgressPercent").textContent = `${progress.toFixed(1)}%`;
  $("#mainRadial").style.setProperty("--progress-angle", `${progress * 3.6}deg`);
  $("#progressRegistered").textContent = `${registered} casas`;
  $("#statPending").textContent = `${pending} casas`;

  $("#distributionDonut").style.background =
    `conic-gradient(
      #16aeb0 0 ${occupiedPct}%,
      #77c81d ${occupiedPct}% ${registeredPct}%,
      #d8ddda ${registeredPct}% 100%
    )`;

  $("#distOccupied").textContent = `${occupied} (${occupiedPct.toFixed(1)}%)`;
  $("#distVacant").textContent = `${vacant} (${vacantPct.toFixed(1)}%)`;
  $("#distPending").textContent = `${pending} (${pendingPct.toFixed(1)}%)`;

  const towerCapacities = {
    "Bloque 01": 34,
    "Bloque 02": 30,
    "Bloque 03": 15,
    "Bloque 04": 6
  };

  const towerMap = Object.fromEntries(
    (data.torres || []).map((tower) => [tower.torre, tower])
  );

  $("#towerStats").innerHTML = Object.entries(towerCapacities)
    .map(([towerName, capacity], index) => {
      const tower = towerMap[towerName] || {};
      const towerRegistered = Number(tower.total || 0);
      const towerOccupied = Number(tower.ocupados || 0);
      const towerVacant = Number(tower.desocupados || 0);
      const towerPending = Math.max(0, capacity - towerRegistered);
      const towerProgress = capacity
        ? Math.min(100, (towerRegistered / capacity) * 100)
        : 0;

      const theme = ["tower-teal", "tower-green", "tower-brown"][index];

      return `
        <article class="tower-mini-card ${theme}">
          <div class="tower-mini-head">${escapeHtml(displayManzana(towerName))}</div>
          <div class="tower-building-photo">
            <img src="/assets/conjunto.jpg" alt="Vista del Conjunto La Villa de Marcos">
          </div>
          <strong>${capacity}</strong>
          <span>Casas</span>

          <div class="tower-mini-stats">
            <p><i class="dot dot-teal"></i>Registrados <strong>${towerRegistered}</strong></p>
            <p><i class="dot dot-lime"></i>Desocupados <strong>${towerVacant}</strong></p>
            <p><i class="dot dot-gray"></i>Pendientes <strong>${towerPending}</strong></p>
          </div>

          <div class="tower-ring" style="--progress-angle:${towerProgress * 3.6}deg">
            <div><strong>${towerProgress.toFixed(1)}%</strong><span>Avance</span></div>
          </div>
        </article>
      `;
    })
    .join("");

  $("#summaryResidentsAvg").textContent =
    Number(data.promedioResidentes || 0).toFixed(2);

  const vehicleApts = Number(data.apartamentosConVehiculo || 0);
  const petApts = Number(data.apartamentosConMascota || 0);

  $("#summaryVehicleApartments").textContent =
    `${vehicleApts}${registered ? ` (${((vehicleApts / registered) * 100).toFixed(1)}%)` : ""}`;

  $("#summaryPetApartments").textContent =
    `${petApts}${registered ? ` (${((petApts / registered) * 100).toFixed(1)}%)` : ""}`;

  $("#summaryParkings").textContent = Number(data.parqueaderos || 0);
  $("#summaryFilings").textContent = registered;

  $("#recentRecords").innerHTML = (data.recientes || []).length
    ? data.recientes.map((record) => `
        <button type="button" class="recent-row" onclick="viewRecord('${record.id}')">
          <span class="recent-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6M9 19h4"/></svg></span>
          <span>${escapeHtml(displayManzana(record.torre))} · Casa ${escapeHtml(record.apartamento)}</span>
          <time>${escapeHtml(formatBogotaDateTime(record.creado_en))}</time>
        </button>
      `).join("")
    : '<p class="empty-dashboard">Aún no hay registros.</p>';

  $("#statusLastRecord").textContent = data.ultimoRegistro
    ? formatBogotaDateTime(data.ultimoRegistro)
    : "Sin registros";

  $("#statusPending").textContent = `${pending} casas`;

  $("#statusDays").textContent = data.primerRegistro
    ? `${daysSince(data.primerRegistro)} días`
    : "0 días";
}

function daysSince(value) {
  if (!value) return 0;

  const utcValue = String(value).includes("T")
    ? String(value)
    : `${String(value).replace(" ", "T")}Z`;

  const start = new Date(utcValue);
  if (Number.isNaN(start.getTime())) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - start.getTime()) / 86400000)
  );
}

async function loadRecords() {
  const response = await apiFetch("/api/admin/registros");
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new Error("La sesión administrativa venció. Cierre sesión e ingrese nuevamente.");
  }
  if (!response.ok) {
    throw new Error(data.error || "No fue posible cargar los registros.");
  }

  allRecords = Array.isArray(data) ? data : [];
  renderRecords();
}

function clearApartmentFilters() {
  $("#searchInput").value = "";
  $("#towerFilter").value = "";
  $("#statusFilter").value = "";
  renderRecords();
}

function updateApartmentModuleSummary(filtered) {
  const registered = allRecords.length;
  const occupied = allRecords.filter(
    (record) => record.estado_apartamento === "Ocupado"
  ).length;
  const vacant = allRecords.filter(
    (record) => record.estado_apartamento === "Desocupado"
  ).length;

  $("#moduleRegistered").textContent = registered;
  $("#moduleOccupied").textContent = occupied;
  $("#moduleVacant").textContent = vacant;
  $("#moduleVisible").textContent = filtered.length;
}

function updateActiveFilters() {
  const items = [];

  const tower = $("#towerFilter").value;
  const status = $("#statusFilter").value;
  const search = $("#searchInput").value.trim();

  if (tower) items.push(displayManzana(tower));
  if (status) items.push(status);
  if (search) items.push(`Búsqueda: ${search}`);

  const box = $("#activeFilters");

  if (!items.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = `
    <span>Filtros activos:</span>
    ${items.map((item) =>
      `<strong>${escapeHtml(item)}</strong>`
    ).join("")}
  `;
}

function renderRecords() {
  const search = $("#searchInput").value.toLowerCase().trim();
  const tower = $("#towerFilter").value;
  const status = $("#statusFilter").value;

  const filtered = allRecords.filter((record) => {
    const matchesSearch =
      !search ||
      JSON.stringify(record).toLowerCase().includes(search);

    const matchesTower =
      !tower ||
      record.torre === tower;

    const matchesStatus =
      currentRecordMode !== "apartments" ||
      !status ||
      record.estado_apartamento === status;

    const matchesMode =
      currentRecordMode === "apartments" ||
      (currentRecordMode === "residents" &&
        Number(record.total_residentes || 0) > 0) ||
      (currentRecordMode === "vehicles" &&
        Number(record.total_vehiculos || 0) > 0) ||
      (currentRecordMode === "pets" &&
        Number(record.total_mascotas || 0) > 0);

    return (
      matchesSearch &&
      matchesTower &&
      matchesStatus &&
      matchesMode
    );
  });

  if (currentRecordMode === "apartments") {
    updateApartmentModuleSummary(filtered);
  }

  updateActiveFilters();

  if (!filtered.length) {
    $("#recordsList").innerHTML = `
      <div class="records-empty-state">
        <div class="records-empty-icon">⌕</div>
        <h3>No encontramos resultados</h3>
        <p>Pruebe cambiando la búsqueda o eliminando alguno de los filtros.</p>
      </div>
    `;
    return;
  }

  $("#recordsList").innerHTML = filtered.map((record) => {
    const vacant =
      record.estado_apartamento === "Desocupado";

    const names = record.residentes
      ? record.residentes.split(" | ")
      : [];

    const ownerName = [
      record.propietario_nombres,
      record.propietario_apellidos
    ].filter(Boolean).join(" ");

    const responsibleName = [
      record.responsable_nombres,
      record.responsable_apellidos
    ].filter(Boolean).join(" ");

    const parkingText =
      record.parqueaderos?.trim()
        ? record.parqueaderos
        : "Sin parqueadero";

    return `
      <article class="apartment-admin-card ${vacant ? "is-vacant" : "is-occupied"}">
        <div class="apartment-card-accent"></div>

        <div class="apartment-card-main">
          <div class="apartment-card-heading">
            <div>
              <span class="apartment-location">
                ${escapeHtml(displayManzana(record.torre))}
              </span>
              <h3>Casa ${escapeHtml(record.apartamento)}</h3>
            </div>

            <span class="apartment-status ${vacant ? "vacant" : "occupied"}">
              ${escapeHtml(record.estado_apartamento)}
            </span>
          </div>

          <div class="apartment-primary-info">
            ${
              vacant
                ? `<div class="apartment-vacant-message">
                    <strong>Unidad registrada como desocupada</strong>
                    <span>No registra residentes, vehículos ni animales de compañía.</span>
                  </div>`
                : `
                  <div class="apartment-person">
                    <span>Responsable</span>
                    <strong>${escapeHtml(responsibleName || "Sin dato")}</strong>
                    <small>${escapeHtml(record.responsable_documento || "Documento sin registrar")}</small>
                  </div>

                  <div class="apartment-person">
                    <span>Propietario</span>
                    <strong>${escapeHtml(ownerName || "Información no suministrada")}</strong>
                    <small>${escapeHtml(record.tipo_ocupacion || "Tipo de ocupación sin dato")}</small>
                  </div>
                `
            }
          </div>

          <div class="apartment-card-metrics">
            <div>
              <span>Residentes</span>
              <strong>${Number(record.total_residentes || 0)}</strong>
            </div>
            <div>
              <span>Vehículos</span>
              <strong>${Number(record.total_vehiculos || 0)}</strong>
            </div>
            <div>
              <span>Mascotas</span>
              <strong>${Number(record.total_mascotas || 0)}</strong>
            </div>
            <div class="metric-parking">
              <span>Parqueadero(s)</span>
              <strong>${escapeHtml(parkingText)}</strong>
            </div>
          </div>

          ${
            !vacant && names.length
              ? `<div class="apartment-resident-preview">
                  <span>Residentes:</span>
                  <p>${names.map((name) =>
                    escapeHtml(name)
                  ).join(" · ")}</p>
                </div>`
              : ""
          }

          <div class="apartment-card-footer">
            <div class="apartment-registration-meta">
              <span>Radicado: <strong>${escapeHtml(record.radicado || "—")}</strong></span>
              <span>Registrado: ${escapeHtml(formatBogotaDateTime(record.creado_en))}</span>
            </div>

            <div class="apartment-admin-actions">
              <button
                class="view-btn apartment-view-btn"
                onclick="viewRecord('${record.id}')"
              >
                Ver ficha completa
              </button>

              <button
                class="apartment-edit-btn"
                onclick="openEditRecord('${record.id}')"
              >
                Editar
              </button>

              <button
                class="delete-btn"
                onclick="deleteRecord('${record.id}')"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

window.viewRecord = async (id) => {
  const response = await apiFetch(`/api/admin/registro?id=${encodeURIComponent(id)}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    alert(data.error || "No fue posible abrir el registro.");
    return;
  }

  currentRecordId = id;
  currentRecordData = data;

  $("#detailContent").innerHTML = `
    <h2>${escapeHtml(displayManzana(data.apartamento.torre))} · Casa ${escapeHtml(data.apartamento.numero)}</h2>
    ${detailSection("Información de la casa", data.apartamento)}
    ${Object.keys(data.responsable || {}).length ? detailSection("Responsable", data.responsable) : ""}
    ${Object.keys(data.propietario || {}).length ? detailSection("Propietario", data.propietario) : ""}
    ${residentCards(data.residentes)}
    ${vehicleCards(data.vehiculos)}
    ${petCards(data.mascotas)}
  `;

  $("#detailModal").classList.remove("hidden");
};


function closeEditRecord() {
  $("#editModal").classList.add("hidden");
  $("#editRecordError").classList.add("hidden");
}

async function openEditRecord(id) {
  const response = await apiFetch(
    `/api/admin/registro?id=${encodeURIComponent(id)}`
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    alert(data.error || "No fue posible cargar la información para editar.");
    return;
  }

  currentRecordId = id;
  currentRecordData = data;

  $("#editRecordId").value = id;
  $("#editTower").value = displayManzana(data.apartamento?.torre || "");
  $("#editApartment").value = data.apartamento?.numero || "";
  $("#editStatus").value = data.apartamento?.estado || "Ocupado";
  $("#editOccupation").value = data.apartamento?.tipo_ocupacion || "";
  $("#editParkings").value = data.apartamento?.parqueaderos || "";

  $("#editOwnerNames").value = data.propietario?.nombres || "";
  $("#editOwnerLastNames").value = data.propietario?.apellidos || "";
  $("#editOwnerDocType").value = data.propietario?.tipo_documento || "";
  $("#editOwnerDocument").value = data.propietario?.documento || "";
  $("#editOwnerBirthDate").value = data.propietario?.fecha_nacimiento || "";
  $("#editOwnerSex").value = data.propietario?.sexo || "";
  $("#editOwnerPhone").value = data.propietario?.telefono || "";
  $("#editOwnerEmail").value = data.propietario?.correo || "";

  $("#editApartmentLabel").textContent =
    `${displayManzana(data.apartamento?.torre || "")} · Casa ${data.apartamento?.numero || ""}`;

  $("#editResidentsContainer").innerHTML = "";
  $("#editVehiclesContainer").innerHTML = "";
  $("#editPetsContainer").innerHTML = "";

  (data.residentes || []).forEach((item) => addEditResident(item));
  (data.vehiculos || []).forEach((item) => addEditVehicle(item));
  (data.mascotas || []).forEach((item) => addEditPet(item));

  updateEditVacantState();
  $("#detailModal").classList.add("hidden");
  $("#editModal").classList.remove("hidden");
}

window.openEditRecord = openEditRecord;

function updateEditVacantState() {
  const vacant = $("#editStatus").value === "Desocupado";
  $("#editResidentsSection").classList.toggle("edit-disabled-section", vacant);

  $("#editResidentsSection")
    .querySelectorAll("input, select, button")
    .forEach((element) => {
      element.disabled = vacant;
    });

  if (vacant) {
    $("#editOccupation").value = "Desocupado";
  } else if ($("#editOccupation").value === "Desocupado") {
    $("#editOccupation").value = "";
  }
}

function editOption(value, current) {
  return `<option value="${escapeHtml(value)}" ${String(value) === String(current || "") ? "selected" : ""}>${escapeHtml(value)}</option>`;
}

function addEditResident(item = {}) {
  const card = document.createElement("article");
  card.className = "edit-entity-card edit-resident-card";

  card.innerHTML = `
    <div class="edit-card-head">
      <label class="edit-responsible-radio">
        <input
          type="radio"
          name="editResponsibleResident"
          ${Number(item.es_responsable) === 1 ? "checked" : ""}
        >
        Responsable de la casa
      </label>
      <button type="button" class="remove-btn edit-remove">Eliminar</button>
    </div>

    <div class="grid two">
      <label>Nombres<input data-key="nombres" value="${escapeHtml(item.nombres || "")}" required></label>
      <label>Apellidos<input data-key="apellidos" value="${escapeHtml(item.apellidos || "")}" required></label>

      <label>Tipo de documento
        <select data-key="tipo_documento" required>
          <option value="">Seleccione</option>
          ${["Cédula de ciudadanía","Tarjeta de identidad","Cédula de extranjería","Pasaporte","Permiso por Protección Temporal","Otro"].map(v => editOption(v, item.tipo_documento)).join("")}
        </select>
      </label>

      <label>Número de documento<input data-key="documento" value="${escapeHtml(item.documento || "")}" required></label>
      <label>Fecha de nacimiento<input data-key="fecha_nacimiento" type="date" value="${escapeHtml(item.fecha_nacimiento || "")}" required></label>

      <label>Sexo
        <select data-key="sexo" required>
          <option value="">Seleccione</option>
          ${["Femenino","Masculino","Prefiere no responder"].map(v => editOption(v, item.sexo)).join("")}
        </select>
      </label>

      <label>Relación / parentesco
        <select data-key="parentesco" required>
          <option value="">Seleccione</option>
          ${["Responsable","Cónyuge o pareja","Hijo o hija","Padre o madre","Hermano o hermana","Otro familiar","Persona sin parentesco","Otro"].map(v => editOption(v, item.parentesco)).join("")}
        </select>
      </label>

      <label>Actividad principal
        <select data-key="actividad" required>
          <option value="">Seleccione</option>
          ${["Trabaja","Estudia","Trabaja y estudia","Labores del hogar","Pensionado","Busca empleo","Menor de edad","Otra"].map(v => editOption(v, item.actividad)).join("")}
        </select>
      </label>

      <label>Teléfono <span>(opcional)</span><input data-key="telefono" value="${escapeHtml(item.telefono || "")}"></label>
      <label>Correo <span>(opcional)</span><input data-key="correo" type="email" value="${escapeHtml(item.correo || "")}"></label>
    </div>
  `;

  $(".edit-remove", card).onclick = () => card.remove();
  $("#editResidentsContainer").appendChild(card);
  updateEditVacantState();
}

function addEditVehicle(item = {}) {
  const card = document.createElement("article");
  card.className = "edit-entity-card edit-vehicle-card";

  card.innerHTML = `
    <div class="edit-card-head">
      <h4>Vehículo</h4>
      <button type="button" class="remove-btn edit-remove">Eliminar</button>
    </div>

    <div class="grid two">
      <label>Tipo
        <select data-key="tipo" required>
          <option value="">Seleccione</option>
          ${["Automóvil","Motocicleta","Bicicleta","Otro"].map(v => editOption(v, item.tipo)).join("")}
        </select>
      </label>
      <label>Placa <span>(opcional)</span><input data-key="placa" value="${escapeHtml(item.placa || "")}"></label>
      <label>Marca<input data-key="marca" value="${escapeHtml(item.marca || "")}" required></label>
      <label>Línea / referencia<input data-key="linea" value="${escapeHtml(item.linea || "")}"></label>
      <label>Modelo / año<input data-key="modelo" value="${escapeHtml(item.modelo || "")}"></label>
      <label>Color<input data-key="color" value="${escapeHtml(item.color || "")}" required></label>
      <label>Parqueadero <span>(opcional)</span><input data-key="parqueadero" value="${escapeHtml(item.parqueadero || "")}"></label>
      <label>Residente asociado<input data-key="propietario_nombres" value="${escapeHtml(item.propietario_nombres || "")}"></label>
      <label class="edit-full-field">Observaciones <span>(opcional)</span><textarea data-key="observaciones">${escapeHtml(item.observaciones || "")}</textarea></label>
    </div>
  `;

  $(".edit-remove", card).onclick = () => card.remove();
  $("#editVehiclesContainer").appendChild(card);
}

function addEditPet(item = {}) {
  const card = document.createElement("article");
  card.className = "edit-entity-card edit-pet-card";

  card.innerHTML = `
    <div class="edit-card-head">
      <h4>Animal de compañía</h4>
      <button type="button" class="remove-btn edit-remove">Eliminar</button>
    </div>

    <div class="grid two">
      <label>Documento del acudiente<input data-key="acudiente_documento" value="${escapeHtml(item.acudiente_documento || "")}" required></label>
      <label>Nombre<input data-key="nombre" value="${escapeHtml(item.nombre || "")}" required></label>
      <label>Especie
        <select data-key="especie" required>
          <option value="">Seleccione</option>
          ${["Perro","Gato","Otro"].map(v => editOption(v, item.especie)).join("")}
        </select>
      </label>
      <label>Sexo
        <select data-key="sexo" required>
          <option value="">Seleccione</option>
          ${["Macho","Hembra","No determinado"].map(v => editOption(v, item.sexo)).join("")}
        </select>
      </label>
      <label>Raza<input data-key="raza" value="${escapeHtml(item.raza || "")}" required></label>
      <label>Color<input data-key="color" value="${escapeHtml(item.color || "")}" required></label>
      <label>Edad<input data-key="edad" value="${escapeHtml(item.edad || "")}" required></label>
      <label>Unidad
        <select data-key="unidad_edad" required>
          <option value="">Seleccione</option>
          ${["Meses","Años"].map(v => editOption(v, item.unidad_edad)).join("")}
        </select>
      </label>
      <label>Esterilizado
        <select data-key="esterilizado" required>
          ${["Sí","No","No sabe"].map(v => editOption(v, item.esterilizado)).join("")}
        </select>
      </label>
      <label>Tiene microchip
        <select data-key="microchip" required>
          ${["Sí","No","No sabe"].map(v => editOption(v, item.microchip)).join("")}
        </select>
      </label>
      <label>Número de microchip <span>(opcional)</span><input data-key="numero_microchip" value="${escapeHtml(item.numero_microchip || "")}"></label>
      <label class="edit-full-field">Observaciones <span>(opcional)</span><textarea data-key="observaciones">${escapeHtml(item.observaciones || "")}</textarea></label>
    </div>
  `;

  $(".edit-remove", card).onclick = () => card.remove();
  $("#editPetsContainer").appendChild(card);
}

function collectEditCards(selector) {
  return $$(selector).map((card) => {
    const item = {};

    $$("[data-key]", card).forEach((field) => {
      item[field.dataset.key] = field.value.trim();
    });

    if (card.classList.contains("edit-resident-card")) {
      item.es_responsable =
        $('input[name="editResponsibleResident"]', card)?.checked ? 1 : 0;
    }

    return item;
  });
}

function showEditError(message) {
  const box = $("#editRecordError");
  box.textContent = message;
  box.classList.remove("hidden");
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function saveEditedRecord(event) {
  event.preventDefault();
  $("#editRecordError").classList.add("hidden");

  const id = $("#editRecordId").value;
  const vacant = $("#editStatus").value === "Desocupado";

  const residents = vacant
    ? []
    : collectEditCards(".edit-resident-card");

  if (!vacant) {
    if (!residents.length) {
      showEditError("Debe existir por lo menos una persona residente.");
      return;
    }

    const responsibles = residents.filter(
      (resident) => Number(resident.es_responsable) === 1
    );

    if (responsibles.length !== 1) {
      showEditError(
        "Debe seleccionar exactamente una persona como responsable de la casa."
      );
      return;
    }
  }

  const parkings = [
    ...new Set(
      $("#editParkings").value
        .split(",")
        .map((value) => value.replace(/\D/g, "").trim())
        .filter(Boolean)
    )
  ];

  const payload = {
    id,
    apartamento: {
      estado: $("#editStatus").value,
      tipoOcupacion: vacant ? "Desocupado" : $("#editOccupation").value,
      parqueaderos: parkings
    },
    propietario: vacant ? {} : {
      conocimiento: "Actualizado por administración",
      nombres: $("#editOwnerNames").value.trim(),
      apellidos: $("#editOwnerLastNames").value.trim(),
      tipoDocumento: $("#editOwnerDocType").value,
      documento: $("#editOwnerDocument").value.trim(),
      fechaNacimiento: $("#editOwnerBirthDate").value,
      sexo: $("#editOwnerSex").value,
      telefono: $("#editOwnerPhone").value.trim(),
      correo: $("#editOwnerEmail").value.trim()
    },
    residentes: residents,
    vehiculos: vacant ? [] : collectEditCards(".edit-vehicle-card"),
    mascotas: vacant ? [] : collectEditCards(".edit-pet-card")
  };

  const button = $("#saveEditRecord");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Guardando...";

  try {
    const response = await apiFetch(
      `/api/admin/registro?id=${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showEditError(
        data.error || "No fue posible guardar los cambios."
      );
      return;
    }

    closeEditRecord();
    setAdminMessage(
      "La información de la casa se actualizó correctamente.",
      "message-success"
    );

    await Promise.all([loadStats(), loadRecords()]);
    await viewRecord(id);
  } catch (error) {
    showEditError(
      error.message || "No fue posible guardar los cambios."
    );
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}


window.deleteRecord = async (id) => {
  if (!confirm("¿Está seguro de eliminar este registro?")) return;

  const response = await apiFetch(`/api/admin/registro?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    alert(data.error || "No fue posible eliminar el registro.");
    return;
  }

  await Promise.all([loadStats(), loadRecords()]);
};


function residentCards(items = []) {
  return `<div class="detail-section"><h3>Residentes (${items.length})</h3>${items.length
    ? items.map((item) => `
        <article class="entity-card ${Number(item.es_responsable) === 1 ? "entity-responsible" : ""}">
          <div class="entity-icon">👤</div>
          <div>
            <h4>
              ${escapeHtml(`${item.nombres || ""} ${item.apellidos || ""}`.trim())}
              ${Number(item.es_responsable) === 1 ? '<span class="responsible-badge">Responsable</span>' : ""}
            </h4>
            <p>${escapeHtml(item.tipo_documento || "Documento")} · ${escapeHtml(item.documento || "Sin dato")}</p>
            <p>Edad: ${escapeHtml(calculateAge(item.fecha_nacimiento) || "No disponible")} · ${escapeHtml(item.sexo || "Sin dato")}</p>
            <p>${escapeHtml(item.parentesco || "Sin relación registrada")} · ${escapeHtml(item.actividad || "Sin actividad registrada")}</p>
          </div>
        </article>
      `).join("")
    : "<p>No registra residentes.</p>"}</div>`;
}

function vehicleCards(items = []) {
  return `<div class="detail-section"><h3>Vehículos (${items.length})</h3>${items.length
    ? items.map((item) => `<article class="entity-card"><div class="entity-icon">${item.tipo === "Motocicleta" ? "🏍️" : item.tipo === "Bicicleta" ? "🚲" : "🚗"}</div><div><h4>${escapeHtml(`${item.marca || "Vehículo"} ${item.linea || ""}`.trim())}</h4><p>Placa: <strong>${escapeHtml(item.placa || "No aplica")}</strong> · ${escapeHtml(item.color || "Sin color")}</p><p>Residente asociado: ${escapeHtml(item.propietario_nombres || "No registrado")}</p></div></article>`).join("")
    : "<p>No registra vehículos.</p>"}</div>`;
}

function petCards(items = []) {
  return `<div class="detail-section"><h3>Animales de compañía (${items.length})</h3>${items.length
    ? items.map((item) => `<article class="entity-card"><div class="entity-icon">${item.especie === "Perro" ? "🐶" : item.especie === "Gato" ? "🐱" : "🐾"}</div><div><h4>${escapeHtml(item.nombre || "Animal de compañía")}</h4><p>${escapeHtml(item.especie || "Otra especie")} · ${escapeHtml(item.raza || "Sin raza")} · ${escapeHtml(item.edad || "")} ${escapeHtml(item.unidad_edad || "")}</p><p>Documento del acudiente: ${escapeHtml(item.acudiente_documento || "No registrado")}</p></div></article>`).join("")
    : "<p>No registra animales de compañía.</p>"}</div>`;
}

function detailSection(title, object) {
  return `<div class="detail-section"><h3>${title}</h3><div class="detail-grid">${pairs(object)}</div></div>`;
}

function listSection(title, items = []) {
  return `<div class="detail-section"><h3>${title} (${items.length})</h3>${items.length
    ? items.map((item) => `<div class="repeat-card detail-grid">${pairs(item)}</div>`).join("")
    : `<p>No registra ${title.toLowerCase()}.</p>`}</div>`;
}

function pairs(object) {
  return Object.entries(object || {})
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => {
      const displayedValue = key === "torre"
        ? displayManzana(value)
        : isDateTimeField(key)
          ? formatBogotaDateTime(value)
          : value;

      return `<div><small>${escapeHtml(label(key))}</small><p>${escapeHtml(displayedValue)}</p></div>`;
    })
    .join("");
}

function isDateTimeField(key) {
  return ["creado_en", "actualizado_en", "eliminado_en"].includes(key);
}

function formatBogotaDateTime(value) {
  if (!value) return "";

  /*
   * D1/SQLite guarda CURRENT_TIMESTAMP en UTC con formato:
   * YYYY-MM-DD HH:MM:SS
   * Se agrega "Z" para interpretarlo como UTC y luego se muestra
   * en la zona horaria de Colombia.
   */
  const utcValue = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T") + "Z";

  const date = new Date(utcValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function calculateAge(dateValue) {
  if (!dateValue) return "";

  const birthDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";

  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    todayParts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  let age = values.year - birthDate.getFullYear();
  const monthDifference = values.month - (birthDate.getMonth() + 1);

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && values.day < birthDate.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : "";
}

function label(key) {
  const labels = {
    torre: "Manzana",
    numero: "Casa",
    estado: "Estado de la casa",
    tipo_ocupacion: "Tipo de ocupación",
    parqueaderos: "Parqueadero(s)",
    radicado: "Radicado",
    creado_en: "Fecha de registro",
    actualizado_en: "Última actualización"
  };
  return labels[key] || key.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
