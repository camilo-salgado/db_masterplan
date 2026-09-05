"use strict";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

let currentStep = 1;
let residentCount = 0;
let vehicleCount = 0;
let petCount = 0;
let apartmentIsVacant = false;
let apartmentAlreadyRegistered = false;
let apartmentCheckTimer = null;
let parkingCount = 0;

const OWNER_RESIDENT = "Propietario residente";

const HOUSE_LAYOUT = {
  "Bloque 01": Array.from({ length: 34 }, (_, i) => String(i + 1).padStart(3, "0")),
  "Bloque 02": Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(3, "0")),
  "Bloque 03": ["001", "002", "003", "004", "005", "006", "007", "07A", "008", "009", "010", "011", "012", "013", "014"],
  "Bloque 04": Array.from({ length: 6 }, (_, i) => String(i + 1).padStart(3, "0"))
};

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    $("#splash").classList.add("fade");
    setTimeout(() => {
      $("#splash").classList.add("hidden");
      $("#home").classList.remove("hidden");
    }, 700);
  }, 2200);

  $("#openForm").onclick = () => {
    $("#home").classList.add("hidden");
    $("#censusView").classList.remove("hidden");
    window.scrollTo(0, 0);
  };
  $("#openAdmin").onclick = () => location.href = "/admin.html";
  $("#backHome").onclick = () => location.href = "/";
  $("#prevStep").onclick = () => changeStep(-1);
  $("#nextStep").onclick = () => changeStep(1);
  $("#addResident").onclick = addResident;
  $("#addVehicle").onclick = addVehicle;
  $("#addPet").onclick = addPet;
  $("#addParking").onclick = addParking;

  $("#hasVehicles").onchange = (event) => {
    toggleArea("#vehiclesArea", event.target.value === "Sí", () => vehicleCount || addVehicle());
  };
  $("#hasPets").onchange = (event) => {
    toggleArea("#petsArea", event.target.value === "Sí", () => petCount || addPet());
  };

  $("#ownerUnknown").onchange = updateExternalOwnerVisibility;
  $('[name="tipoOcupacion"]').onchange = updateOccupancyFlow;
  $("#censusForm").onsubmit = submitForm;
  $("#finishButton").onclick = () => location.href = "/";

  configureHouseSelector();
  configureApartmentAvailabilityCheck();
  configureParkingAvailabilityCheck();
  configureVacantApartmentOption();
  addResident();
  updateOccupancyFlow();
  updateStep();
});

function isOwnerResident() {
  return $('[name="tipoOcupacion"]')?.value === OWNER_RESIDENT;
}

function getStepSequence() {
  return isOwnerResident() ? [1, 2, 4, 5] : [1, 2, 3, 4, 5];
}

function updateOccupancyFlow() {
  const ownerResident = isOwnerResident();
  const ownerArea = $("#residentOwnerArea");
  const ownerSelect = $("#ownerResidentSelect");

  ownerArea.style.display = ownerResident ? "block" : "none";
  ownerSelect.disabled = !ownerResident;
  ownerSelect.required = ownerResident;

  setExternalOwnerFieldsDisabled(ownerResident || $("#ownerUnknown").checked);

  if (ownerResident) {
    refreshResidentSelectors();
    if (currentStep === 3) currentStep = 2;
  } else {
    ownerSelect.value = "";
  }

  updateStep();
}

function updateExternalOwnerVisibility() {
  const hidden = $("#ownerUnknown").checked;
  $("#externalOwnerFields").style.display = hidden ? "none" : "block";
  setExternalOwnerFieldsDisabled(hidden || isOwnerResident());
}

function setExternalOwnerFieldsDisabled(disabled) {
  $$("input, select", $("#externalOwnerFields")).forEach((field) => {
    field.disabled = disabled;
    if (disabled && isOwnerResident()) field.value = "";
  });
}

function configureHouseSelector() {
  const block = $('[name="torre"]');
  const house = $('[name="apartamento"]');

  const refresh = () => {
    const houses = HOUSE_LAYOUT[block.value] || [];
    house.innerHTML = houses.length
      ? '<option value="">Seleccione la casa</option>' + houses.map((n) => `<option value="${n}">Casa ${n}</option>`).join("")
      : '<option value="">Seleccione primero la manzana</option>';
    house.disabled = !houses.length;
    apartmentAlreadyRegistered = false;
    const notice = $("#apartmentRegistrationNotice");
    if (notice) notice.style.display = "none";
    updateNavigationAvailability();
  };

  block.addEventListener("change", refresh);
  refresh();
}

function configureApartmentAvailabilityCheck() {
  const tower = $('[name="torre"]');
  const apartment = $('[name="apartamento"]');
  const step = $('.step[data-step="1"]');
  const notice = document.createElement("div");
  notice.id = "apartmentRegistrationNotice";
  notice.className = "repeat-card";
  notice.style.display = "none";
  notice.setAttribute("role", "alert");
  step.appendChild(notice);

  const schedule = () => {
    clearTimeout(apartmentCheckTimer);
    apartmentCheckTimer = setTimeout(checkApartmentAvailability, 350);
  };
  tower.addEventListener("change", schedule);
  apartment.addEventListener("change", schedule);
  apartment.addEventListener("blur", checkApartmentAvailability);
}

async function checkApartmentAvailability() {
  const tower = $('[name="torre"]')?.value.trim() || "";
  const apartment = $('[name="apartamento"]')?.value.trim() || "";
  const notice = $("#apartmentRegistrationNotice");
  apartmentAlreadyRegistered = false;
  updateNavigationAvailability();

  if (!tower || !apartment) {
    notice.style.display = "none";
    return true;
  }

  notice.style.display = "block";
  notice.innerHTML = '<h3>Verificando casa…</h3><p class="hint">Espere un momento.</p>';

  try {
    const params = new URLSearchParams({ torre: tower, apartamento: apartment });
    const response = await fetch(`/api/censo?${params}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No fue posible verificar la casa.");

    apartmentAlreadyRegistered = Boolean(data.registrado);
    notice.innerHTML = apartmentAlreadyRegistered
      ? `<h3 style="color:#b42318">Casa ya registrada</h3><p class="hint">${escapeHtml(tower)} – casa ${escapeHtml(apartment)} ya cuenta con un registro activo. Para actualizar la información, comuníquese con la administración.</p>`
      : '<h3 style="color:#158500">Casa disponible para registro</h3><p class="hint">Puede continuar con el diligenciamiento.</p>';
  } catch (error) {
    notice.innerHTML = `<h3>No fue posible verificar</h3><p class="hint">${escapeHtml(error.message)} Intente nuevamente.</p>`;
  }

  updateNavigationAvailability();
  return !apartmentAlreadyRegistered;
}

function configureParkingAvailabilityCheck() {
  // El bloque es opcional; el usuario agrega los parqueaderos que necesite.
}

function addParking() {
  parkingCount++;

  const card = document.createElement("div");
  card.className = "parking-entry repeat-card";
  card.innerHTML = `
    <button type="button" class="remove-btn">Eliminar</button>
    <h3>Parqueadero ${parkingCount}</h3>

    <label>
      Número de parqueadero
      <input
        data-parking-number
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength="4"
        placeholder="Ejemplo: 32"
      >
      <small>Escriba únicamente el número.</small>
    </label>

    <div
      class="field-notice hidden-block"
      data-parking-notice
      role="alert"
    ></div>
  `;

  const input = $("[data-parking-number]", card);
  const removeButton = $(".remove-btn", card);
  let timer = null;

  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
    clearTimeout(timer);

    if (
      input.value &&
      getParkingNumbers(card).includes(input.value.trim())
    ) {
      showParkingWarning(
        card,
        `El parqueadero ${input.value} ya fue agregado en este formulario.`
      );
      input.value = "";
      refreshVehicleParkingSelectors();
      return;
    }

    timer = setTimeout(
      () => checkParkingAvailability(card),
      450
    );

    refreshVehicleParkingSelectors();
  });

  input.addEventListener("blur", () => {
    checkParkingAvailability(card);
  });

  removeButton.onclick = () => {
    card.remove();
    refreshVehicleParkingSelectors();
  };

  $("#parkingsContainer").appendChild(card);
  input.focus();
}

function getParkingNumbers(excludedCard = null) {
  return $$(".parking-entry")
    .filter((card) => card !== excludedCard)
    .map((card) =>
      $("[data-parking-number]", card)?.value.trim()
    )
    .filter(Boolean);
}

function collectParkingNumbers() {
  return [...new Set(
    $$(".parking-entry")
      .map((card) =>
        $("[data-parking-number]", card)?.value.trim()
      )
      .filter(Boolean)
  )];
}

function showParkingWarning(card, message) {
  const notice = $("[data-parking-notice]", card);
  notice.textContent = message;
  notice.className = "field-notice parking-warning";
  notice.style.display = "block";
}

function showParkingAvailable(card, number) {
  const notice = $("[data-parking-notice]", card);
  notice.textContent = `Parqueadero ${number} disponible.`;
  notice.className = "field-notice parking-available";
  notice.style.display = "block";
}

async function checkParkingAvailability(card) {
  const input = $("[data-parking-number]", card);
  const number = input.value.trim();

  if (!number) {
    const notice = $("[data-parking-notice]", card);
    notice.style.display = "none";
    refreshVehicleParkingSelectors();
    return true;
  }

  if (getParkingNumbers(card).includes(number)) {
    showParkingWarning(
      card,
      `El parqueadero ${number} ya fue agregado en este formulario.`
    );
    input.value = "";
    refreshVehicleParkingSelectors();
    return false;
  }

  try {
    const response = await fetch(
      `/api/censo?parqueadero=${encodeURIComponent(number)}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "No fue posible verificar el parqueadero."
      );
    }

    if (data.ocupado) {
      showParkingWarning(
        card,
        `El parqueadero ${number} ya se encuentra registrado para otra casa. Verifique la información o comuníquese con la administración.`
      );

      input.value = "";
      refreshVehicleParkingSelectors();
      return false;
    }

    showParkingAvailable(card, number);
    refreshVehicleParkingSelectors();
    return true;
  } catch (error) {
    showParkingWarning(card, error.message);
    refreshVehicleParkingSelectors();
    return true;
  }
}

async function verifyAllParkings() {
  for (const card of $$(".parking-entry")) {
    await checkParkingAvailability(card);
  }

  return collectParkingNumbers();
}

function refreshVehicleParkingSelectors() {
  const numbers = collectParkingNumbers();

  $$(".vehicle-card").forEach((card) => {
    const select = $('[data-field="parqueadero"]', card);
    if (!select) return;

    const current = select.value;
    select.innerHTML =
      '<option value="">Sin parqueadero asignado</option>' +
      numbers.map((number) =>
        `<option value="${escapeHtml(number)}">Parqueadero ${escapeHtml(number)}</option>`
      ).join("");

    if (numbers.includes(current)) {
      select.value = current;
    }
  });
}

function updateNavigationAvailability() {
  $("#nextStep").disabled = apartmentAlreadyRegistered;
  $("#submitForm").disabled = apartmentAlreadyRegistered;
}

function configureVacantApartmentOption() {
  const status = $('[name="estadoApartamento"]');
  const occupancy = $('[name="tipoOcupacion"]');
  const step = $('.step[data-step="1"]');
  const notice = document.createElement("div");
  notice.id = "vacantApartmentNotice";
  notice.className = "repeat-card";
  notice.style.display = "none";
  notice.innerHTML = '<h3>Casa desocupada</h3><p class="hint">No es necesario registrar residentes, propietario, vehículos ni animales de compañía.</p>';
  step.appendChild(notice);

  status.addEventListener("change", () => {
    apartmentIsVacant = status.value === "Desocupado";
    currentStep = 1;
    occupancy.disabled = apartmentIsVacant;
    occupancy.required = !apartmentIsVacant;
    if (apartmentIsVacant) occupancy.value = "";
    notice.style.display = apartmentIsVacant ? "block" : "none";
    updateOccupancyFlow();
    updateStep();
  });
}

function toggleArea(selector, show, callback) {
  const area = $(selector);
  area.style.display = show ? "block" : "none";
  if (show && callback) callback();
}

function changeStep(delta) {
  if (apartmentIsVacant || apartmentAlreadyRegistered) return;
  const sequence = getStepSequence();
  const index = Math.max(0, sequence.indexOf(currentStep));
  const nextIndex = Math.min(sequence.length - 1, Math.max(0, index + delta));
  currentStep = sequence[nextIndex];
  updateStep();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateCompleteForm() {
  const sequence = apartmentIsVacant ? [1] : getStepSequence();
  for (const stepNumber of sequence) {
    const step = $(`.step[data-step="${stepNumber}"]`);
    for (const element of $$('input, select, textarea', step)) {
      if (element.disabled) continue;
      if (!element.checkValidity()) {
        currentStep = stepNumber;
        updateStep();
        setTimeout(() => {
          element.reportValidity();
          element.focus();
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        return false;
      }
    }
  }

  if (!apartmentIsVacant && $$(".resident-card").length === 0) {
    currentStep = 2; updateStep();
    alert("Agregue por lo menos una persona residente.");
    return false;
  }

  if (!apartmentIsVacant && $$('[data-role="responsable"]:checked').length !== 1) {
    currentStep = 2; updateStep();
    alert("Debe seleccionar una sola persona como responsable de la casa.");
    return false;
  }

  if (!apartmentIsVacant && isOwnerResident() && !$("#ownerResidentSelect").value) {
    currentStep = 2; updateStep();
    alert("Debe seleccionar el propietario titular entre las personas residentes.");
    $("#ownerResidentSelect").focus();
    return false;
  }

  return true;
}

function updateStep() {
  $$(".step").forEach((step) => step.classList.toggle("active", Number(step.dataset.step) === currentStep));

  if (apartmentIsVacant) {
    $("#stepLabel").textContent = "Registro de casa desocupada";
    $("#progressPercent").textContent = "100%";
    $("#progressBar").style.width = "100%";
    $("#prevStep").style.visibility = "hidden";
    $("#nextStep").classList.add("hidden");
    $("#submitForm").classList.remove("hidden");
    $("#submitForm").textContent = "Registrar casa desocupada";
    return;
  }

  const sequence = getStepSequence();
  if (!sequence.includes(currentStep)) currentStep = sequence[0];
  const position = sequence.indexOf(currentStep) + 1;
  const percentage = Math.round((position / sequence.length) * 100);

  $("#stepLabel").textContent = `Paso ${position} de ${sequence.length}`;
  $("#progressPercent").textContent = `${percentage}%`;
  $("#progressBar").style.width = `${percentage}%`;
  $("#prevStep").style.visibility = position === 1 ? "hidden" : "visible";
  $("#nextStep").classList.toggle("hidden", position === sequence.length);
  $("#submitForm").classList.toggle("hidden", position !== sequence.length);
  $("#submitForm").textContent = "Guardar información";
}

function removeCard(button, type) {
  button.closest(".repeat-card").remove();
  if (type === "resident") residentCount--;
  if (type === "vehicle") vehicleCount--;
  if (type === "pet") petCount--;
  refreshResidentSelectors();
}

function addResident() {
  residentCount++;
  const card = document.createElement("div");
  card.className = "repeat-card resident-card";
  card.innerHTML = `
    <button type="button" class="remove-btn">Eliminar</button>
    <h3>Residente ${residentCount}</h3>
    <label class="responsible-choice">
      <input type="radio" name="responsableApartamento" data-role="responsable" value="${residentCount}">
      <span><strong>Designar como responsable de la casa</strong><small>Solo una persona residente puede ser seleccionada.</small></span>
    </label>
    <div class="grid two">
      <label>Nombres<input data-field="nombres" required></label>
      <label>Apellidos<input data-field="apellidos" required></label>
      <label>Tipo de documento<select data-field="tipoDocumento" required>
        <option value="">Seleccione</option><option>Cédula de ciudadanía</option><option>Tarjeta de identidad</option><option>Cédula de extranjería</option><option>Pasaporte</option><option>Permiso por Protección Temporal</option><option>Otro</option>
      </select></label>
      <label>Número de documento<input data-field="documento" required></label>
      <label>Fecha de nacimiento<input type="date" data-field="fechaNacimiento" required></label>
      <label>Sexo<select data-field="sexo" required><option value="">Seleccione</option><option>Femenino</option><option>Masculino</option><option>Prefiere no responder</option></select></label>
      <label>Parentesco o relación con el responsable<select data-field="parentesco" required>
        <option value="">Seleccione</option><option>Responsable</option><option>Cónyuge o pareja</option><option>Hijo o hija</option><option>Padre o madre</option><option>Hermano o hermana</option><option>Otro familiar</option><option>Persona sin parentesco</option><option>Otro</option>
      </select></label>
      <label>Actividad principal<select data-field="actividad" required>
        <option value="">Seleccione</option><option>Trabaja</option><option>Estudia</option><option>Trabaja y estudia</option><option>Labores del hogar</option><option>Pensionado</option><option>Busca empleo</option><option>Menor de edad</option><option>Otra</option>
      </select></label>
      <label>Teléfono <span>(opcional)</span><input data-field="telefono"></label>
      <label>Correo <span>(opcional)</span><input type="email" data-field="correo"></label>
    </div>`;

  const responsible = $('[data-role="responsable"]', card);
  const relationship = $('[data-field="parentesco"]', card);
  responsible.onchange = () => { if (responsible.checked) relationship.value = "Responsable"; };
  $$('[data-field="nombres"], [data-field="apellidos"], [data-field="documento"]', card).forEach((field) => field.addEventListener("input", refreshResidentSelectors));
  $(".remove-btn", card).onclick = (event) => removeCard(event.target, "resident");
  $("#residentsContainer").appendChild(card);
  refreshResidentSelectors();
}

function residentOptions() {
  return $$(".resident-card").map((card) => {
    const names = $('[data-field="nombres"]', card).value.trim();
    const surnames = $('[data-field="apellidos"]', card).value.trim();
    const document = $('[data-field="documento"]', card).value.trim();
    return document ? { document, label: `${names} ${surnames}`.trim() || document } : null;
  }).filter(Boolean);
}

function fillResidentSelect(select, placeholder) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` + residentOptions().map((item) => `<option value="${escapeHtml(item.document)}">${escapeHtml(item.label)} — ${escapeHtml(item.document)}</option>`).join("");
  select.value = current;
}

function refreshResidentSelectors() {
  fillResidentSelect($("#ownerResidentSelect"), "Seleccione un residente");
  $$('.vehicle-card [data-field="propietarioDocumento"]').forEach((select) => fillResidentSelect(select, "Seleccione un residente"));
  $$('.pet-card [data-field="acudienteDocumento"]').forEach((select) => fillResidentSelect(select, "Seleccione un residente"));
}

function addVehicle() {
  vehicleCount++;
  const card = document.createElement("div");
  card.className = "repeat-card vehicle-card";
  card.innerHTML = `
    <button type="button" class="remove-btn">Eliminar</button><h3>Vehículo ${vehicleCount}</h3>
    <div class="grid two">
      <label>Tipo<select data-field="tipo" required><option value="">Seleccione</option><option>Automóvil</option><option>Motocicleta</option><option>Bicicleta</option><option>Otro</option></select></label>
      <label class="plate-label">Placa<input data-field="placa" maxlength="10"></label>
      <label>Marca<input data-field="marca" required></label>
      <label>Línea o referencia <span>(opcional)</span><input data-field="linea"></label>
      <label>Modelo o año <span>(opcional)</span><input data-field="modelo"></label>
      <label>Color<input data-field="color" required></label>
      <label>Residente asociado al vehículo<select data-field="propietarioDocumento" required><option value="">Seleccione un residente</option></select></label>
      <label>Observaciones <span>(opcional)</span><textarea data-field="observaciones"></textarea></label>
    </div>`;
  const type = $('[data-field="tipo"]', card);
  const plateLabel = $(".plate-label", card);
  const plate = $('[data-field="placa"]', card);
  type.onchange = () => {
    const bicycle = type.value === "Bicicleta";
    plateLabel.style.display = bicycle ? "none" : "flex";
    plate.required = !bicycle;
    if (bicycle) plate.value = "";
  };
  $(".remove-btn", card).onclick = (event) => removeCard(event.target, "vehicle");
  $("#vehiclesContainer").appendChild(card);
  refreshResidentSelectors();
  refreshVehicleParkingSelectors();
}

function addPet() {
  petCount++;
  const card = document.createElement("div");
  card.className = "repeat-card pet-card";
  card.innerHTML = `
    <button type="button" class="remove-btn">Eliminar</button><h3>Mascota ${petCount}</h3>
    <div class="grid two">
      <label>Acudiente residente<select data-field="acudienteDocumento" required><option value="">Seleccione un residente</option></select></label>
      <label>Nombre de la mascota<input data-field="nombre" required></label>
      <label>Especie<select data-field="especie" required><option value="">Seleccione</option><option>Perro</option><option>Gato</option><option>Otro</option></select></label>
      <label>Sexo<select data-field="sexo" required><option value="">Seleccione</option><option>Macho</option><option>Hembra</option></select></label>
      <label>Raza<input data-field="raza" required></label><label>Color<input data-field="color" required></label>
      <label>Edad<input type="number" min="0" data-field="edad" required></label>
      <label>Unidad<select data-field="unidadEdad" required><option>Años</option><option>Meses</option></select></label>
      <label>Esterilizado<select data-field="esterilizado" required><option>Sí</option><option>No</option></select></label>
      <label>Tiene microchip<select data-field="microchip" required><option>No</option><option>Sí</option></select></label>
      <label class="micro-number" style="display:none">Número de microchip<input data-field="numeroMicrochip"></label>
      <label>Observaciones <span>(opcional)</span><textarea data-field="observaciones"></textarea></label>
    </div>`;
  const microchip = $('[data-field="microchip"]', card);
  const label = $(".micro-number", card);
  const number = $('[data-field="numeroMicrochip"]', card);
  microchip.onchange = () => {
    const has = microchip.value === "Sí";
    label.style.display = has ? "flex" : "none";
    number.required = has;
  };
  $(".remove-btn", card).onclick = (event) => removeCard(event.target, "pet");
  $("#petsContainer").appendChild(card);
  refreshResidentSelectors();
}

function collectCards(selector) {
  return $$(selector).map((card) => {
    const data = {};
    $$('[data-field]', card).forEach((element) => data[element.dataset.field] = element.value.trim());
    if (card.classList.contains("resident-card")) data.esResponsable = $('[data-role="responsable"]', card)?.checked ? "1" : "0";
    return data;
  });
}

async function submitForm(event) {
  event.preventDefault();
  const apartmentAvailable = await checkApartmentAvailability();
  if (!apartmentAvailable || apartmentAlreadyRegistered) {
    currentStep = 1; updateStep();
    $("#apartmentRegistrationNotice")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const parkings = await verifyAllParkings();
  if (!validateCompleteForm()) return;

  const formData = new FormData(event.target);
  const status = formData.get("estadoApartamento");
  const vacant = status === "Desocupado";
  const residents = vacant ? [] : collectCards(".resident-card");
  const vehicles = !vacant && formData.get("tieneVehiculos") === "Sí"
    ? collectCards(".vehicle-card").map((vehicle) => {
        const resident = residents.find(
          (item) => item.documento === vehicle.propietarioDocumento
        );

        return {
          ...vehicle,
          parqueadero: parkings.includes(vehicle.parqueadero)
            ? vehicle.parqueadero
            : "",
          propietarioNombres: resident
            ? `${resident.nombres} ${resident.apellidos}`.trim()
            : "Residente no identificado",
          propietarioApellidos: ""
        };
      })
    : [];

  let owner = {};
  if (!vacant && isOwnerResident()) {
    const selected = residents.find((item) => item.documento === $("#ownerResidentSelect").value);
    owner = selected ? {
      conocimiento: "Propietario residente",
      nombres: selected.nombres, apellidos: selected.apellidos,
      tipoDocumento: selected.tipoDocumento, documento: selected.documento,
      fechaNacimiento: selected.fechaNacimiento, sexo: selected.sexo,
      telefono: selected.telefono, correo: selected.correo
    } : {};
  } else if (!vacant && $("#ownerUnknown").checked) {
    owner = { conocimiento: "No conoce la información del propietario" };
  } else if (!vacant) {
    owner = {
      conocimiento: "Información opcional",
      nombres: formData.get("propietarioNombres"), apellidos: formData.get("propietarioApellidos"),
      tipoDocumento: formData.get("propietarioTipoDocumento"), documento: formData.get("propietarioDocumento"),
      fechaNacimiento: formData.get("propietarioFechaNacimiento"), sexo: formData.get("propietarioSexo"),
      telefono: formData.get("propietarioTelefono"), correo: formData.get("propietarioCorreo")
    };
  }

  const payload = {
    apartamento: {
      torre: formData.get("torre"),
      numero: formData.get("apartamento"),
      estado: status,
      tipoOcupacion: vacant
        ? "Desocupado"
        : formData.get("tipoOcupacion"),
      parqueaderos: parkings
    },
    propietario: owner,
    residentes: residents,
    mascotas: !vacant && formData.get("tieneMascotas") === "Sí" ? collectCards(".pet-card") : [],
    vehiculos: vehicles
  };

  const button = $("#submitForm");
  button.disabled = true;
  button.textContent = vacant ? "Registrando casa..." : "Guardando...";
  try {
    const response = await fetch("/api/censo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No fue posible guardar la información.");
    $("#radicado").textContent = `Radicado: ${data.radicado}`;
    $("#resultModal h2").textContent = vacant ? "Casa registrada" : "Registro completado";
    const omittedParkings = Array.isArray(data.parqueaderosOmitidos)
      ? data.parqueaderosOmitidos
      : [];

    $("#resultModal p").textContent = omittedParkings.length
      ? `La información fue registrada. Los parqueaderos ${omittedParkings.join(", ")} ya estaban ocupados y fueron omitidos.`
      : vacant
        ? `La casa fue registrada correctamente como desocupada.`
        : "Muchas gracias. Su información fue registrada correctamente.";
    $("#resultModal").classList.remove("hidden");
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = apartmentIsVacant ? "Registrar casa desocupada" : "Guardar información";
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
