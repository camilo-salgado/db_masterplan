import { json, isAdmin } from "../_common.js";

export async function onRequestGet({ request, env }) {
  if (!await isAdmin(request, env)) {
    return json({ error: "No autorizado" }, 401);
  }

  try {
    const query = await env.DB.prepare(`
      SELECT
        c.id,
        c.radicado,
        c.torre,
        c.apartamento,
        c.piso,
        c.estado_apartamento,
        c.tipo_ocupacion,
        c.responsable_nombres,
        c.responsable_apellidos,
        c.responsable_documento,
        c.responsable_telefono,
        c.propietario_nombres,
        c.propietario_apellidos,
        c.creado_en,
        c.actualizado_en,
        COALESCE(
          (
            SELECT GROUP_CONCAT(p.numero, ', ')
            FROM parqueaderos p
            WHERE p.censo_id = c.id
              AND p.eliminado_en IS NULL
          ),
          c.parqueadero
        ) AS parqueaderos,
        (
          SELECT COUNT(*)
          FROM residentes r
          WHERE r.censo_id = c.id
        ) AS total_residentes,
        (
          SELECT GROUP_CONCAT(nombre_completo, ' | ')
          FROM (
            SELECT r.nombres || ' ' || r.apellidos AS nombre_completo
            FROM residentes r
            WHERE r.censo_id = c.id
            ORDER BY r.apellidos, r.nombres
          )
        ) AS residentes,
        (
          SELECT GROUP_CONCAT(v.placa, ', ')
          FROM vehiculos v
          WHERE v.censo_id = c.id
            AND COALESCE(v.placa, '') <> ''
        ) AS placas,
        (
          SELECT COUNT(*)
          FROM vehiculos v
          WHERE v.censo_id = c.id
        ) AS total_vehiculos,
        (
          SELECT COUNT(*)
          FROM mascotas m
          WHERE m.censo_id = c.id
        ) AS total_mascotas,
        (
          SELECT GROUP_CONCAT(m.nombre, ', ')
          FROM mascotas m
          WHERE m.censo_id = c.id
        ) AS mascotas
      FROM censos c
      WHERE c.eliminado_en IS NULL
      ORDER BY
        c.torre,
        c.apartamento
    `).all();

    return json(query.results || []);
  } catch (error) {
    return json(
      { error: "No fue posible consultar los registros.", detail: error.message },
      500
    );
  }
}
