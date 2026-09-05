import { json, cleanText } from "./_common.js";

const HOUSE_LAYOUT = {
  "Bloque 01": Array.from({ length: 34 }, (_, i) => String(i + 1).padStart(3, "0")),
  "Bloque 02": Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(3, "0")),
  "Bloque 03": ["001", "002", "003", "004", "005", "006", "007", "07A", "008", "009", "010", "011", "012", "013", "014"],
  "Bloque 04": Array.from({ length: 6 }, (_, i) => String(i + 1).padStart(3, "0"))
};

function displayManzana(value) {
  return String(value ?? "").replace(/^Bloque\s+/i, "Manzana ");
}

function validHouse(block, house) {
  return Boolean(HOUSE_LAYOUT[block]?.includes(house));
}

function normalizeParking(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 4);
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const parking = normalizeParking(url.searchParams.get("parqueadero"));

    if (parking) {
      const existingParking = await env.DB.prepare(`
        SELECT c.torre, c.apartamento
        FROM parqueaderos p
        INNER JOIN censos c ON c.id = p.censo_id
        WHERE p.numero = ?
          AND p.eliminado_en IS NULL
          AND c.eliminado_en IS NULL

        UNION ALL

        SELECT torre, apartamento
        FROM censos
        WHERE parqueadero = ?
          AND eliminado_en IS NULL

        LIMIT 1
      `).bind(parking, parking).first();

      return json({
        ocupado: Boolean(existingParking),
        parqueadero: parking
      });
    }

    const tower = cleanText(url.searchParams.get("torre"));
    const apartment = cleanText(url.searchParams.get("apartamento"));
    if (!tower || !apartment) return json({ error: "Debe indicar la manzana y la casa." }, 400);
    if (!validHouse(tower, apartment)) return json({ error: "La casa seleccionada no pertenece a la manzana indicada." }, 400);

    const existing = await env.DB.prepare(`
      SELECT id, estado_apartamento FROM censos
      WHERE torre = ? AND apartamento = ? AND eliminado_en IS NULL LIMIT 1
    `).bind(tower, apartment).first();

    return json({ registrado: Boolean(existing), torre: tower, apartamento: apartment, estado: existing?.estado_apartamento || null });
  } catch (error) {
    return json({ error: "No fue posible realizar la verificación.", detail: error.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const apartment = body?.apartamento || {};
    if (!apartment.torre || !apartment.numero || !apartment.estado) return json({ error: "Debe completar manzana, casa y estado." }, 400);

    const block = cleanText(apartment.torre);
    const house = cleanText(apartment.numero);
    if (!validHouse(block, house)) return json({ error: "La casa seleccionada no pertenece a la manzana indicada." }, 400);

    const floor = 0;
    const vacant = apartment.estado === "Desocupado";
    const residents = Array.isArray(body.residentes) ? body.residentes : [];

    if (!vacant) {
      if (!residents.length) return json({ error: "Debe registrar por lo menos una persona residente." }, 400);
      const responsibles = residents.filter((resident) => String(resident.esResponsable) === "1");
      if (responsibles.length !== 1) return json({ error: "Debe seleccionar una sola persona como responsable de la casa." }, 400);
      if (apartment.tipoOcupacion === "Propietario residente") {
        const ownerDocument = cleanText(body?.propietario?.documento);
        if (!ownerDocument || !residents.some((resident) => cleanText(resident.documento) === ownerDocument)) {
          return json({ error: "Debe seleccionar el propietario titular entre las personas residentes." }, 400);
        }
      }
    }

    const duplicateApartment = await env.DB.prepare(`SELECT id FROM censos WHERE torre = ? AND apartamento = ? AND eliminado_en IS NULL LIMIT 1`).bind(cleanText(apartment.torre), cleanText(apartment.numero)).first();
    if (duplicateApartment) return json({ error: `La ${displayManzana(cleanText(apartment.torre))} - casa ${cleanText(apartment.numero)} ya se encuentra registrada. Para actualizar la información, comuníquese con la administración.` }, 409);

    const requestedParkings = [
      ...new Set(
        (Array.isArray(apartment.parqueaderos)
          ? apartment.parqueaderos
          : [apartment.parqueadero]
        )
          .map(normalizeParking)
          .filter(Boolean)
      )
    ];

    const availableParkings = [];
    const omittedParkings = [];

    for (const parking of requestedParkings) {
      const occupied = await env.DB.prepare(`
        SELECT p.id
        FROM parqueaderos p
        INNER JOIN censos c ON c.id = p.censo_id
        WHERE p.numero = ?
          AND p.eliminado_en IS NULL
          AND c.eliminado_en IS NULL

        UNION ALL

        SELECT id
        FROM censos
        WHERE parqueadero = ?
          AND eliminado_en IS NULL

        LIMIT 1
      `).bind(parking, parking).first();

      if (occupied) {
        omittedParkings.push(parking);
      } else {
        availableParkings.push(parking);
      }
    }

    const parkingSummary = availableParkings.join(", ");

    const id = crypto.randomUUID();
    const filingNumber = `VM-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
    const owner = body.propietario || {};
    const responsible = vacant ? {
      nombres: "Casa", apellidos: "Desocupada", tipoDocumento: "No aplica",
      documento: `DES-${apartment.torre}-${apartment.numero}`, telefono: "No aplica", correo: "no-aplica@villa-marcos.local"
    } : residents.find((resident) => String(resident.esResponsable) === "1");

    function buildStatements() {
      const statements = [env.DB.prepare(`
        INSERT INTO censos (
          id, radicado, torre, apartamento, piso, estado_apartamento, tipo_ocupacion, parqueadero,
          responsable_nombres, responsable_apellidos, responsable_tipo_documento, responsable_documento,
          responsable_telefono, responsable_correo, propietario_conocimiento, propietario_nombres,
          propietario_apellidos, propietario_tipo_documento, propietario_documento, propietario_fecha_nacimiento,
          propietario_sexo, propietario_telefono, propietario_correo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, filingNumber, cleanText(apartment.torre), cleanText(apartment.numero), floor,
        cleanText(apartment.estado), vacant ? "Desocupado" : cleanText(apartment.tipoOcupacion), parkingSummary,
        cleanText(responsible.nombres), cleanText(responsible.apellidos), cleanText(responsible.tipoDocumento),
        cleanText(responsible.documento), cleanText(responsible.telefono), cleanText(responsible.correo),
        cleanText(owner.conocimiento), cleanText(owner.nombres), cleanText(owner.apellidos), cleanText(owner.tipoDocumento),
        cleanText(owner.documento), cleanText(owner.fechaNacimiento), cleanText(owner.sexo), cleanText(owner.telefono), cleanText(owner.correo)
      )];

      for (const parking of availableParkings) {
        statements.push(
          env.DB.prepare(`
            INSERT INTO parqueaderos (
              id,
              censo_id,
              numero
            )
            VALUES (?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            id,
            parking
          )
        );
      }

      if (!vacant) {
        for (const resident of residents) {
          statements.push(env.DB.prepare(`
            INSERT INTO residentes (id, censo_id, nombres, apellidos, tipo_documento, documento, fecha_nacimiento, sexo, parentesco, actividad, telefono, correo, es_responsable)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(crypto.randomUUID(), id, cleanText(resident.nombres), cleanText(resident.apellidos), cleanText(resident.tipoDocumento), cleanText(resident.documento), cleanText(resident.fechaNacimiento), cleanText(resident.sexo), cleanText(resident.parentesco), cleanText(resident.actividad), cleanText(resident.telefono), cleanText(resident.correo), String(resident.esResponsable) === "1" ? 1 : 0));
        }

        for (const vehicle of body.vehiculos || []) {
          statements.push(env.DB.prepare(`
            INSERT INTO vehiculos (id, censo_id, tipo, placa, marca, linea, modelo, color, parqueadero, propietario_nombres, propietario_apellidos, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(crypto.randomUUID(), id, cleanText(vehicle.tipo), cleanText(vehicle.placa).toUpperCase(), cleanText(vehicle.marca), cleanText(vehicle.linea), cleanText(vehicle.modelo), cleanText(vehicle.color),
            availableParkings.includes(normalizeParking(vehicle.parqueadero))
              ? normalizeParking(vehicle.parqueadero)
              : "",
            cleanText(vehicle.propietarioNombres), cleanText(vehicle.propietarioApellidos), cleanText(vehicle.observaciones)));
        }

        for (const pet of body.mascotas || []) {
          statements.push(env.DB.prepare(`
            INSERT INTO mascotas (id, censo_id, acudiente_documento, nombre, especie, sexo, raza, color, edad, unidad_edad, esterilizado, microchip, numero_microchip, observaciones)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(crypto.randomUUID(), id, cleanText(pet.acudienteDocumento), cleanText(pet.nombre), cleanText(pet.especie), cleanText(pet.sexo), cleanText(pet.raza), cleanText(pet.color), cleanText(pet.edad), cleanText(pet.unidadEdad), cleanText(pet.esterilizado), cleanText(pet.microchip), cleanText(pet.numeroMicrochip), cleanText(pet.observaciones)));
        }
      }
      return statements;
    }

    try {
      await env.DB.batch(buildStatements());
    } catch (error) {
      const detail = String(error?.message || "");

      if (
        detail.includes("parqueaderos.numero") ||
        detail.includes("uq_parqueaderos_numero_activo")
      ) {
        return json(
          {
            error:
              "Uno de los parqueaderos fue registrado por otra casa mientras se enviaba el formulario. Intente nuevamente."
          },
          409
        );
      }

      throw error;
    }

    return json({
      ok: true,
      radicado: filingNumber,
      piso: floor,
      estado: apartment.estado,
      parqueaderosRegistrados: availableParkings,
      parqueaderosOmitidos: omittedParkings
    });
  } catch (error) {
    const detail = String(error?.message || "");
    if (detail.includes("censos.torre") || detail.includes("uq_censos_torre")) return json({ error: "Esta casa ya se encuentra registrada. Para actualizar la información, comuníquese con la administración." }, 409);
    return json({ error: "No fue posible guardar la información.", detail }, 500);
  }
}
