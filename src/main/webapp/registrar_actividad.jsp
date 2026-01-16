<%@ page contentType="text/html; charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nueva Actividad</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body class="bg-light p-4">

<!-- Encabezado -->
<div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-4">
    <%--    <img src="<%= request.getContextPath() %>/imagenes/logo.png" alt="Logo" style="height: 65px;">--%>
    <h1 style="color: #4258c7;" class="fw-bold fst-italic">MasterPlan</h1>
    <a href="<%= request.getContextPath() %>/logout" class="btn btn-outline-danger">Cerrar Sesión</a>
</div>

<!-- FORMULARIO -->
<form method="post" action="<%= request.getContextPath() %>/actividad">

    <div class="d-flex justify-content-center">
        <div class="w-auto">

            <div class="mb-4">
                <h3 class="fw-bold">Registrar nueva actividad</h3>
            </div>

            <div class="row mb-3 align-items-center">
                <label class="col-auto col-form-label pe-2"
                       style="width: 120px; color: #4258c7;">Título:</label>
                <div class="col">
                    <input type="text" name="titulo" class="form-control"
                           style="width: 300px;" required>
                </div>
            </div>

            <div class="row mb-3 align-items-center">
                <label class="col-auto col-form-label pe-2"
                       style="width: 120px; color: #4258c7;">Descripción:</label>
                <div class="col">
                    <textarea name="descripcion" class="form-control"
                              rows="2" style="width: 300px;" required></textarea>
                </div>
            </div>

            <div class="row mb-3 align-items-center">
                <div class="col-auto d-flex align-items-center">
                    <label class="col-form-label me-2"
                           style="width: 120px; color: #4258c7;">Fecha inicio:</label>
                    <input type="date" name="fechaInicio" class="form-control"
                           style="width: 160px;" required>
                </div>

                <div class="col-auto d-flex align-items-center">
                    <label class="col-form-label me-2"
                           style="width: 100px; color: #4258c7;">Hora inicio:</label>
                    <input type="time" name="horaInicio" class="form-control"
                           style="width: 120px;" required>
                </div>
            </div>

            <div class="row mb-3 align-items-center">
                <div class="col-auto d-flex align-items-center">
                    <label class="col-form-label me-2"
                           style="width: 120px; color: #4258c7;">Fecha fin:</label>
                    <input type="date" name="fechaFin" class="form-control"
                           style="width: 160px;" required>
                </div>

                <div class="col-auto d-flex align-items-center">
                    <label class="col-form-label me-2"
                           style="width: 100px; color: #4258c7;">Hora fin:</label>
                    <input type="time" name="horaFin" class="form-control"
                           style="width: 120px;" required>
                </div>
            </div>

            <div class="row mb-3 align-items-center">
                <div class="col-auto d-flex align-items-center">
                    <label class="col-form-label me-2"
                           style="width: 120px; color: #4258c7;">Prioridad:</label>
                    <select name="prioridad" class="form-select"
                            style="width: 200px;" required>
                        <option selected disabled value="">Selecciona una opción</option>
                        <option value="ALTA">Alta</option>
                        <option value="MEDIA">Media</option>
                        <option value="BAJA">Baja</option>
                    </select>
                </div>

                <div class="col-auto d-flex align-items-center">
                    <label class="col-form-label me-2"
                           style="width: 120px; color: #4258c7;">Pieza:</label>
                    <input type="file" name="archivo" class="form-control"
                           style="width: 300px;" accept=".pdf">
                </div>
            </div>

            <div class="form-text mt-3">
                * Al guardar, la actividad se registrará en el sistema.
            </div>

            <div class="d-flex justify-content-center mt-4 gap-2">
                <button type="submit" class="btn btn-primary"
                        style="background-color: #4258c7;">
                    Guardar
                </button>

                <a href="<%= request.getContextPath() %>/index.jsp"
                   class="btn btn-secondary"
                   style="background-color: #4258c7;">
                    Cancelar
                </a>
            </div>

        </div>
    </div>
</form>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
