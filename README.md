# La Villa de Marcos

Sistema web responsive para censo residencial.

## Incluye
- Splash con logo y fotografía del conjunto.
- Formulario por pasos.
- Residentes, vehículos y mascotas (perro/gato).
- Panel administrativo protegido por una sola contraseña.
- Estadísticas, búsqueda, detalle y eliminación lógica.
- Cloudflare Pages Functions + D1.

## Variables de entorno requeridas en Cloudflare Pages
- ADMIN_PASSWORD
- SESSION_SECRET

## Base de datos
Ejecutar `schema.sql` sobre la base D1.

## Publicación rápida
1. Subir este proyecto a GitHub.
2. Crear una base D1 llamada `villa-marcos-db`.
3. Ejecutar `schema.sql`.
4. Crear un proyecto de Cloudflare Pages conectado al repositorio.
5. Vincular D1 con el nombre de variable `DB`.
6. Crear variables `ADMIN_PASSWORD` y `SESSION_SECRET`.
7. Volver a desplegar.  
