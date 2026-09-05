import { json, isAdmin } from "../_common.js";

export async function onRequestGet({ request, env }) {
  if (!await isAdmin(request, env)) {
    return json({ error: "No autorizado" }, 401);
  }

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return json({ error: "Falta el identificador." }, 400);

    const census = await env.DB.prepare(`
      SELECT *
      FROM censos
      WHERE id = ? AND eliminado_en IS NULL
    `).bind(id).first();

    if (!census) return json({ error: "No encontrado" }, 404);

    const [residents, vehicles, pets, parkings] = await Promise.all([
      env.DB.prepare(`
        SELECT * FROM residentes
        WHERE censo_id = ?
        ORDER BY apellidos, nombres
      `).bind(id).all(),
      env.DB.prepare(`SELECT * FROM vehiculos WHERE censo_id = ?`).bind(id).all(),
      env.DB.prepare(`SELECT * FROM mascotas WHERE censo_id = ?`).bind(id).all(),
      env.DB.prepare(`
        SELECT numero
        FROM parqueaderos
        WHERE censo_id = ?
          AND eliminado_en IS NULL
        ORDER BY CAST(numero AS INTEGER)
      `).bind(id).all()
    ]);

    const vacant = census.estado_apartamento === "Desocupado";

    return json({
      apartamento: {
        torre: census.torre,
        numero: census.apartamento,
        estado: census.estado_apartamento,
        tipo_ocupacion: census.tipo_ocupacion,
        parqueaderos: (parkings.results || [])
          .map((item) => item.numero)
          .join(", ") || census.parqueadero,
        radicado: census.radicado,
        creado_en: census.creado_en,
        actualizado_en: census.actualizado_en
      },
      responsable: vacant ? {} : {
        nombres: census.responsable_nombres,
        apellidos: census.responsable_apellidos,
        tipo_documento: census.responsable_tipo_documento,
        documento: census.responsable_documento,
        telefono: census.responsable_telefono,
        correo: census.responsable_correo
      },
      propietario: vacant ? {} : {
        conocimiento: census.propietario_conocimiento,
        nombres: census.propietario_nombres,
        apellidos: census.propietario_apellidos,
        tipo_documento: census.propietario_tipo_documento,
        documento: census.propietario_documento,
        fecha_nacimiento: census.propietario_fecha_nacimiento,
        sexo: census.propietario_sexo,
        telefono: census.propietario_telefono,
        correo: census.propietario_correo
      },
      residentes: residents.results || [],
      vehiculos: vehicles.results || [],
      mascotas: pets.results || []
    });
  } catch (error) {
    return json(
      { error: "No fue posible consultar el registro.", detail: error.message },
      500
    );
  }
}


function normalizeAdminParking(value) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function adminText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export async function onRequestPut({ request, env }) {
  if (!await isAdmin(request, env)) {
    return json({ error: "No autorizado" }, 401);
  }

  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return json({ error: "Falta el identificador del registro." }, 400);
    }

    const current = await env.DB.prepare(`
      SELECT *
      FROM censos
      WHERE id = ?
        AND eliminado_en IS NULL
    `).bind(id).first();

    if (!current) {
      return json({ error: "El registro ya no existe." }, 404);
    }

    const body = await request.json();
    const apartment = body.apartamento || {};
    const owner = body.propietario || {};
    const vacant = apartment.estado === "Desocupado";

    const residents = Array.isArray(body.residentes)
      ? body.residentes
      : [];

    const vehicles = Array.isArray(body.vehiculos)
      ? body.vehiculos
      : [];

    const pets = Array.isArray(body.mascotas)
      ? body.mascotas
      : [];

    let responsible = {
      nombres: "Casa",
      apellidos: "Desocupada",
      tipo_documento: "No aplica",
      documento: `DES-${current.torre}-${current.apartamento}`,
      telefono: "No aplica",
      correo: "no-aplica@villa-marcos.local"
    };

    if (!vacant) {
      if (!residents.length) {
        return json(
          { error: "Debe existir por lo menos una persona residente." },
          400
        );
      }

      const selected = residents.filter(
        (resident) => Number(resident.es_responsable) === 1
      );

      if (selected.length !== 1) {
        return json(
          {
            error:
              "Debe seleccionar exactamente una persona como responsable de la casa."
          },
          400
        );
      }

      responsible = selected[0];

      if (
        !responsible.nombres ||
        !responsible.apellidos ||
        !(responsible.tipo_documento || responsible.tipoDocumento) ||
        !responsible.documento
      ) {
        return json(
          {
            error:
              "El responsable debe tener nombres, apellidos, tipo y número de documento."
          },
          400
        );
      }
    }

    const requestedParkings = [
      ...new Set(
        (Array.isArray(apartment.parqueaderos)
          ? apartment.parqueaderos
          : []
        )
          .map(normalizeAdminParking)
          .filter(Boolean)
      )
    ];

    // No permitir apropiarse de un parqueadero de otra casa.
    for (const parking of requestedParkings) {
      const occupied = await env.DB.prepare(`
        SELECT p.censo_id, c.torre, c.apartamento
        FROM parqueaderos p
        INNER JOIN censos c ON c.id = p.censo_id
        WHERE p.numero = ?
          AND p.eliminado_en IS NULL
          AND c.eliminado_en IS NULL
          AND p.censo_id <> ?
        LIMIT 1
      `).bind(parking, id).first();

      if (occupied) {
        return json(
          {
            error:
              `El parqueadero ${parking} ya se encuentra registrado para otra casa.`
          },
          409
        );
      }
    }

    const statements = [];

    statements.push(
      env.DB.prepare(`
        UPDATE censos
        SET
          estado_apartamento = ?,
          tipo_ocupacion = ?,
          parqueadero = ?,
          responsable_nombres = ?,
          responsable_apellidos = ?,
          responsable_tipo_documento = ?,
          responsable_documento = ?,
          responsable_telefono = ?,
          responsable_correo = ?,
          propietario_conocimiento = ?,
          propietario_nombres = ?,
          propietario_apellidos = ?,
          propietario_tipo_documento = ?,
          propietario_documento = ?,
          propietario_fecha_nacimiento = ?,
          propietario_sexo = ?,
          propietario_telefono = ?,
          propietario_correo = ?,
          actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
          AND eliminado_en IS NULL
      `).bind(
        vacant ? "Desocupado" : "Ocupado",
        vacant
          ? "Desocupado"
          : adminText(apartment.tipoOcupacion),
        requestedParkings.join(", "),
        adminText(responsible.nombres),
        adminText(responsible.apellidos),
        adminText(
          responsible.tipo_documento ||
          responsible.tipoDocumento
        ),
        adminText(responsible.documento),
        adminText(responsible.telefono),
        adminText(responsible.correo),
        vacant ? "" : adminText(owner.conocimiento),
        vacant ? "" : adminText(owner.nombres),
        vacant ? "" : adminText(owner.apellidos),
        vacant ? "" : adminText(owner.tipoDocumento),
        vacant ? "" : adminText(owner.documento),
        vacant ? "" : adminText(owner.fechaNacimiento),
        vacant ? "" : adminText(owner.sexo),
        vacant ? "" : adminText(owner.telefono),
        vacant ? "" : adminText(owner.correo),
        id
      )
    );

    // Liberar los parqueaderos actuales antes de reconstruirlos.
    statements.push(
      env.DB.prepare(`
        UPDATE parqueaderos
        SET eliminado_en = CURRENT_TIMESTAMP
        WHERE censo_id = ?
          AND eliminado_en IS NULL
      `).bind(id)
    );

    for (const parking of requestedParkings) {
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

    // Reconstruir la información dependiente de la casa.
    statements.push(
      env.DB.prepare(`
        DELETE FROM residentes
        WHERE censo_id = ?
      `).bind(id),

      env.DB.prepare(`
        DELETE FROM vehiculos
        WHERE censo_id = ?
      `).bind(id),

      env.DB.prepare(`
        DELETE FROM mascotas
        WHERE censo_id = ?
      `).bind(id)
    );

    if (!vacant) {
      for (const resident of residents) {
        statements.push(
          env.DB.prepare(`
            INSERT INTO residentes (
              id,
              censo_id,
              nombres,
              apellidos,
              tipo_documento,
              documento,
              fecha_nacimiento,
              sexo,
              parentesco,
              actividad,
              telefono,
              correo,
              es_responsable
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            id,
            adminText(resident.nombres),
            adminText(resident.apellidos),
            adminText(
              resident.tipo_documento ||
              resident.tipoDocumento
            ),
            adminText(resident.documento),
            adminText(
              resident.fecha_nacimiento ||
              resident.fechaNacimiento
            ),
            adminText(resident.sexo),
            adminText(resident.parentesco),
            adminText(resident.actividad),
            adminText(resident.telefono),
            adminText(resident.correo),
            Number(resident.es_responsable) === 1 ? 1 : 0
          )
        );
      }

      for (const vehicle of vehicles) {
        const vehicleParking =
          normalizeAdminParking(vehicle.parqueadero);

        statements.push(
          env.DB.prepare(`
            INSERT INTO vehiculos (
              id,
              censo_id,
              tipo,
              placa,
              marca,
              linea,
              modelo,
              color,
              parqueadero,
              propietario_nombres,
              propietario_apellidos,
              observaciones
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            id,
            adminText(vehicle.tipo),
            adminText(vehicle.placa).toUpperCase(),
            adminText(vehicle.marca),
            adminText(vehicle.linea),
            adminText(vehicle.modelo),
            adminText(vehicle.color),
            requestedParkings.includes(vehicleParking)
              ? vehicleParking
              : "",
            adminText(vehicle.propietario_nombres),
            adminText(vehicle.propietario_apellidos),
            adminText(vehicle.observaciones, 500)
          )
        );
      }

      for (const pet of pets) {
        statements.push(
          env.DB.prepare(`
            INSERT INTO mascotas (
              id,
              censo_id,
              acudiente_documento,
              nombre,
              especie,
              sexo,
              raza,
              color,
              edad,
              unidad_edad,
              esterilizado,
              microchip,
              numero_microchip,
              observaciones
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            id,
            adminText(pet.acudiente_documento),
            adminText(pet.nombre),
            adminText(pet.especie),
            adminText(pet.sexo),
            adminText(pet.raza),
            adminText(pet.color),
            adminText(pet.edad),
            adminText(pet.unidad_edad),
            adminText(pet.esterilizado),
            adminText(pet.microchip),
            adminText(pet.numero_microchip),
            adminText(pet.observaciones, 500)
          )
        );
      }
    }

    await env.DB.batch(statements);

    return json({
      ok: true,
      actualizado: true
    });
  } catch (error) {
    const detail = String(error?.message || "");

    if (
      detail.includes("parqueaderos.numero") ||
      detail.includes("uq_parqueaderos_numero_activo")
    ) {
      return json(
        {
          error:
            "Uno de los parqueaderos fue asignado a otra casa mientras se guardaban los cambios."
        },
        409
      );
    }

    return json(
      {
        error: "No fue posible actualizar la casa.",
        detail
      },
      500
    );
  }
}

export async function onRequestDelete({ request, env }) {
  if (!await isAdmin(request, env)) {
    return json({ error: "No autorizado" }, 401);
  }

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return json({ error: "Falta el identificador." }, 400);

    await env.DB.batch([
      env.DB.prepare(`
        UPDATE parqueaderos
        SET eliminado_en = CURRENT_TIMESTAMP
        WHERE censo_id = ?
          AND eliminado_en IS NULL
      `).bind(id),

      env.DB.prepare(`
        UPDATE censos
        SET eliminado_en = CURRENT_TIMESTAMP,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(id)
    ]);

    return json({ ok: true });
  } catch (error) {
    return json(
      { error: "No fue posible eliminar el registro.", detail: error.message },
      500
    );
  }
}
