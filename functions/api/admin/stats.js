import { json, isAdmin } from "../_common.js";

const TOTAL_APARTMENTS = 85;

export async function onRequestGet({ request, env }) {
  if (!await isAdmin(request, env)) {
    return json({ error: "No autorizado" }, 401);
  }

  try {
    const [
      apartments,
      residents,
      vehicles,
      pets,
      occupied,
      vacant,
      towers,
      vehicleApartments,
      petApartments,
      parkings,
      dates,
      recent
    ] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS n FROM censos WHERE eliminado_en IS NULL"
      ).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM residentes r
        JOIN censos c ON c.id = r.censo_id
        WHERE c.eliminado_en IS NULL
      `).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM vehiculos v
        JOIN censos c ON c.id = v.censo_id
        WHERE c.eliminado_en IS NULL
      `).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM mascotas m
        JOIN censos c ON c.id = m.censo_id
        WHERE c.eliminado_en IS NULL
      `).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM censos
        WHERE eliminado_en IS NULL
          AND estado_apartamento = 'Ocupado'
      `).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM censos
        WHERE eliminado_en IS NULL
          AND estado_apartamento = 'Desocupado'
      `).first(),

      env.DB.prepare(`
        SELECT
          torre,
          COUNT(*) AS total,
          SUM(CASE WHEN estado_apartamento = 'Ocupado' THEN 1 ELSE 0 END) AS ocupados,
          SUM(CASE WHEN estado_apartamento = 'Desocupado' THEN 1 ELSE 0 END) AS desocupados
        FROM censos
        WHERE eliminado_en IS NULL
        GROUP BY torre
        ORDER BY torre
      `).all(),

      env.DB.prepare(`
        SELECT COUNT(DISTINCT c.id) AS n
        FROM censos c
        JOIN vehiculos v ON v.censo_id = c.id
        WHERE c.eliminado_en IS NULL
      `).first(),

      env.DB.prepare(`
        SELECT COUNT(DISTINCT c.id) AS n
        FROM censos c
        JOIN mascotas m ON m.censo_id = c.id
        WHERE c.eliminado_en IS NULL
      `).first(),

      env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM parqueaderos p
        JOIN censos c ON c.id = p.censo_id
        WHERE p.eliminado_en IS NULL
          AND c.eliminado_en IS NULL
      `).first(),

      env.DB.prepare(`
        SELECT
          MIN(creado_en) AS primero,
          MAX(creado_en) AS ultimo
        FROM censos
        WHERE eliminado_en IS NULL
      `).first(),

      env.DB.prepare(`
        SELECT id, torre, apartamento, creado_en
        FROM censos
        WHERE eliminado_en IS NULL
        ORDER BY datetime(creado_en) DESC
        LIMIT 5
      `).all()
    ]);

    const registered = Number(apartments?.n || 0);
    const occupiedCount = Number(occupied?.n || 0);
    const residentCount = Number(residents?.n || 0);

    return json({
      totalApartamentos: TOTAL_APARTMENTS,
      apartamentos: registered,
      residentes: residentCount,
      vehiculos: Number(vehicles?.n || 0),
      mascotas: Number(pets?.n || 0),
      ocupados: occupiedCount,
      desocupados: Number(vacant?.n || 0),
      pendientes: Math.max(0, TOTAL_APARTMENTS - registered),
      porcentaje: Number(((registered / TOTAL_APARTMENTS) * 100).toFixed(1)),
      promedioResidentes: occupiedCount
        ? Number((residentCount / occupiedCount).toFixed(2))
        : 0,
      apartamentosConVehiculo: Number(vehicleApartments?.n || 0),
      apartamentosConMascota: Number(petApartments?.n || 0),
      parqueaderos: Number(parkings?.n || 0),
      primerRegistro: dates?.primero || null,
      ultimoRegistro: dates?.ultimo || null,
      torres: towers?.results || [],
      recientes: recent?.results || []
    });
  } catch (error) {
    return json(
      { error: "No fue posible cargar las estadísticas.", detail: error.message },
      500
    );
  }
}
