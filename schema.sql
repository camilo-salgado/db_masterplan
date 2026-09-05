CREATE TABLE IF NOT EXISTS censos (
  id TEXT PRIMARY KEY,
  radicado TEXT UNIQUE NOT NULL,
  torre TEXT NOT NULL,
  apartamento TEXT NOT NULL,
  piso INTEGER NOT NULL,
  estado_apartamento TEXT NOT NULL,
  tipo_ocupacion TEXT NOT NULL,
  parqueadero TEXT,
  responsable_nombres TEXT NOT NULL,
  responsable_apellidos TEXT NOT NULL,
  responsable_tipo_documento TEXT NOT NULL,
  responsable_documento TEXT NOT NULL,
  responsable_telefono TEXT NOT NULL,
  responsable_correo TEXT NOT NULL,
  propietario_conocimiento TEXT,
  propietario_nombres TEXT,
  propietario_apellidos TEXT,
  propietario_tipo_documento TEXT,
  propietario_documento TEXT,
  propietario_fecha_nacimiento TEXT,
  propietario_sexo TEXT,
  propietario_telefono TEXT,
  propietario_correo TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  eliminado_en TEXT
);

CREATE INDEX IF NOT EXISTS idx_censos_apto
ON censos(torre, apartamento);

CREATE INDEX IF NOT EXISTS idx_censos_documento
ON censos(responsable_documento);

CREATE INDEX IF NOT EXISTS idx_censos_piso
ON censos(torre, piso, apartamento);

CREATE TABLE IF NOT EXISTS residentes (
  id TEXT PRIMARY KEY,
  censo_id TEXT NOT NULL,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  tipo_documento TEXT NOT NULL,
  documento TEXT NOT NULL,
  fecha_nacimiento TEXT NOT NULL,
  sexo TEXT NOT NULL,
  parentesco TEXT NOT NULL,
  actividad TEXT NOT NULL,
  telefono TEXT,
  correo TEXT,
  es_responsable INTEGER NOT NULL DEFAULT 0 CHECK (es_responsable IN (0, 1)),
  FOREIGN KEY (censo_id) REFERENCES censos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_residentes_censo
ON residentes(censo_id);

CREATE INDEX IF NOT EXISTS idx_residentes_documento
ON residentes(documento);

CREATE UNIQUE INDEX IF NOT EXISTS uq_responsable_por_censo
ON residentes(censo_id)
WHERE es_responsable = 1;


CREATE TABLE IF NOT EXISTS parqueaderos (
  id TEXT PRIMARY KEY,
  censo_id TEXT NOT NULL,
  numero TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  eliminado_en TEXT,
  FOREIGN KEY (censo_id) REFERENCES censos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parqueaderos_censo
ON parqueaderos(censo_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_parqueaderos_numero_activo
ON parqueaderos(numero)
WHERE eliminado_en IS NULL;

CREATE TABLE IF NOT EXISTS vehiculos (
  id TEXT PRIMARY KEY,
  censo_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  placa TEXT,
  marca TEXT NOT NULL,
  linea TEXT,
  modelo TEXT,
  color TEXT NOT NULL,
  parqueadero TEXT,
  propietario_nombres TEXT NOT NULL,
  propietario_apellidos TEXT NOT NULL,
  observaciones TEXT,
  FOREIGN KEY (censo_id) REFERENCES censos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_censo
ON vehiculos(censo_id);

CREATE INDEX IF NOT EXISTS idx_vehiculos_placa
ON vehiculos(placa);

CREATE TABLE IF NOT EXISTS mascotas (
  id TEXT PRIMARY KEY,
  censo_id TEXT NOT NULL,
  acudiente_documento TEXT NOT NULL,
  nombre TEXT NOT NULL,
  especie TEXT NOT NULL CHECK (especie IN ('Perro', 'Gato', 'Otro')),
  sexo TEXT NOT NULL,
  raza TEXT NOT NULL,
  color TEXT NOT NULL,
  edad TEXT NOT NULL,
  unidad_edad TEXT NOT NULL,
  esterilizado TEXT NOT NULL,
  microchip TEXT NOT NULL,
  numero_microchip TEXT,
  observaciones TEXT,
  FOREIGN KEY (censo_id) REFERENCES censos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mascotas_censo
ON mascotas(censo_id);

