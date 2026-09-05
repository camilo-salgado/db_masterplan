import { json, isAdmin } from "../_common.js";

export async function onRequestGet({ request, env }) {
  if (!await isAdmin(request, env)) {
    return json({ error: "No autorizado" }, 401);
  }

  try {
    const [apartments, residents, vehicles, pets] = await Promise.all([
      env.DB.prepare(`
        SELECT
          radicado,
          torre,
          piso,
          apartamento,
          estado_apartamento,
          tipo_ocupacion,
          COALESCE(
            (
              SELECT GROUP_CONCAT(p.numero, ', ')
              FROM parqueaderos p
              WHERE p.censo_id = censos.id
                AND p.eliminado_en IS NULL
            ),
            parqueadero
          ) AS parqueadero,
          responsable_nombres,
          responsable_apellidos,
          responsable_tipo_documento,
          responsable_documento,
          responsable_telefono,
          responsable_correo,
          propietario_conocimiento,
          propietario_nombres,
          propietario_apellidos,
          propietario_tipo_documento,
          propietario_documento,
          propietario_fecha_nacimiento,
          propietario_sexo,
          propietario_telefono,
          propietario_correo,
          creado_en,
          actualizado_en
        FROM censos
        WHERE eliminado_en IS NULL
        ORDER BY torre, apartamento
      `).all(),

      env.DB.prepare(`
        SELECT
          c.torre,
          c.piso,
          c.apartamento,
          c.radicado,
          c.estado_apartamento,
          r.nombres,
          r.apellidos,
          r.tipo_documento,
          r.documento,
          r.fecha_nacimiento,
          r.sexo,
          r.parentesco,
          r.actividad,
          r.telefono,
          r.correo,
          r.es_responsable
        FROM residentes r
        INNER JOIN censos c ON c.id = r.censo_id
        WHERE c.eliminado_en IS NULL
        ORDER BY c.torre, c.apartamento, r.apellidos, r.nombres
      `).all(),

      env.DB.prepare(`
        SELECT
          c.torre,
          c.piso,
          c.apartamento,
          c.radicado,
          c.estado_apartamento,
          v.tipo,
          v.placa,
          v.marca,
          v.linea,
          v.modelo,
          v.color,
          v.parqueadero,
          v.propietario_nombres,
          v.propietario_apellidos,
          v.observaciones
        FROM vehiculos v
        INNER JOIN censos c ON c.id = v.censo_id
        WHERE c.eliminado_en IS NULL
        ORDER BY c.torre, c.apartamento, v.tipo, v.placa
      `).all(),

      env.DB.prepare(`
        SELECT
          c.torre,
          c.piso,
          c.apartamento,
          c.radicado,
          c.estado_apartamento,
          m.acudiente_documento,
          m.nombre,
          m.especie,
          m.sexo,
          m.raza,
          m.color,
          m.edad,
          m.unidad_edad,
          m.esterilizado,
          m.microchip,
          m.numero_microchip,
          m.observaciones
        FROM mascotas m
        INNER JOIN censos c ON c.id = m.censo_id
        WHERE c.eliminado_en IS NULL
        ORDER BY c.torre, c.apartamento, m.nombre
      `).all()
    ]);

    return json({
      apartamentos: apartments.results || [],
      residentes: residents.results || [],
      vehiculos: vehicles.results || [],
      mascotas: pets.results || []
    });
  } catch (error) {
    return json(
      {
        error: "No fue posible preparar la exportación.",
        detail: error.message
      },
      500
    );
  }
}
