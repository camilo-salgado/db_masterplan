<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reportes de actividades</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body class="bg-light p-4">

<!-- Encabezado -->
<div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-4">
    <img src="${pageContext.request.contextPath}/logo.png"
         alt="Logo" style="height: 65px;">

    <h1 style="color: #4258c7;" class="fw-bold fst-italic">MasterPlan</h1>

    <a href="${pageContext.request.contextPath}/logout"
       class="btn btn-outline-danger">Cerrar Sesión</a>
</div>

<form action="${pageContext.request.contextPath}/generarReporte"
      method="post">

    <!-- Contenedor que centra todo -->
    <div class="d-flex justify-content-center">

        <div class="w-auto">

            <div class="mb-4">
                <h3 class="fw-bold">Generación de Reportes</h3>
            </div>

            <!-- Fechas -->
            <div class="row mb-3 align-items-center">
                <div class="col-auto d-flex align-items-center">
                    <label for="desde" class="col-form-label me-2"
                           style="width: 120px; color: #4258c7;">Desde:</label>
                    <input type="date" class="form-control"
                           id="desde" name="desde"
                           style="width: 160px;" required>
                </div>

                <div class="col-auto d-flex align-items-center">
                    <label for="hasta" class="col-form-label me-2"
                           style="width: 120px; color: #4258c7;">Hasta:</label>
                    <input type="date" class="form-control"
                           id="hasta" name="hasta"
                           style="width: 160px;" required>
                </div>
            </div>

            <!-- Filtros -->
            <div class="row mb-3 align-items-center">

                <div class="col-auto d-flex align-items-center">
                    <label for="estado" class="col-form-label me-2"
                           style="width: 120px; color: #4258c7;">Actividad:</label>
                    <select class="form-select"
                            id="estado" name="estado"
                            required style="width: 200px;">
                        <option value="TODAS">Todas</option>
                        <option value="COMPLETA">Completas</option>
                        <option value="INCOMPLETA">Incompletas</option>
                    </select>
                </div>

                <div class="col-auto d-flex align-items-center">
                    <label for="prioridad" class="col-form-label me-2"
                           style="width: 120px; color: #4258c7;">Prioridad:</label>
                    <select class="form-select"
                            id="prioridad" name="prioridad"
                            style="width: 200px;">
                        <option value="">Todas</option>
                        <option value="ALTA">Alta</option>
                        <option value="MEDIA">Media</option>
                        <option value="BAJA">Baja</option>
                    </select>
                </div>
            </div>

            <!-- Botones -->
            <div class="d-flex justify-content-center mt-4 gap-2">
                <button type="submit"
                        class="btn btn-primary"
                        style="background-color: #4258c7;">
                    Exportar PDF
                </button>

                <a href="${pageContext.request.contextPath}/index.jsp"
                   class="btn btn-secondary"
                   style="background-color: #4258c7;">
                    Volver
                </a>
            </div>

        </div>
    </div>
</form>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
