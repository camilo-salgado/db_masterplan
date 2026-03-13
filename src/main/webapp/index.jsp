<%@ page contentType="text/html; charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Index</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body class="bg-light p-4">

<!-- Encabezado -->
<div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
    <img src="${pageContext.request.contextPath}/logo.png" alt="Logo" style="height: 65px;">
    <h1 style="color: #4258c7;" class="fw-bold fst-italic">MasterPlan</h1>
    <a href="logout" class="btn btn-outline-danger">Cerrar Sesión</a>
</div>

<!-- Barra de navegación -->
<nav class="navbar navbar-light bg-white border border-dark mb-4 d-inline-block rounded">
    <div class="container-fluid p-0">
        <ul class="navbar-nav d-flex flex-row">
            <li class="nav-item">
                <a class="nav-link fw-bold text-dark px-3" href="test.jsp">Inicio</a>
            </li>
            <li class="nav-item border-start">
                <a class="nav-link fw-bold text-dark px-3" href="test.jsp">Acerca de nosotros</a>
            </li>
            <li class="nav-item border-start">
                <a class="nav-link fw-bold text-dark px-3" href="test.jsp">Ayuda</a>
            </li>
<%--            <li class="nav-item border-start">--%>
<%--                <a class="nav-link fw-bold text-dark px-3" href="actividades.jsp">Actividades en curso</a>--%>
<%--            </li>--%>
            <a class="nav-link fw-bold text-dark px-3"
               href="${pageContext.request.contextPath}/actividad">
                Actividades en curso
            </a>
            <li class="nav-item border-start">
                <a class="nav-link fw-bold text-dark px-3" href="registrar_actividad.jsp">Registrar actividad</a>
            </li>
            <li class="nav-item border-start">
                <a class="nav-link fw-bold text-dark px-3" href="modificar_actividad.jsp">Modificar actividad</a>
            </li>
            <li class="nav-item border-start">
                <a class="nav-link fw-bold text-dark px-3" href="consultar_actividad.jsp">Consultar actividad</a>
            </li>
            <li class="nav-item border-start">
                <a class="nav-link fw-bold text-dark px-3" href="reporte_actividad.jsp">Generar reportes</a>
            </li>
            <li class="nav-item border-start">
                <a class="nav-link fw-bold text-dark px-3" href="gestion_rolesypermisos.jsp">Gestionar roles y permisos</a>
            </li>
        </ul>
    </div>
</nav>

<!-- Título -->
<div class="text-center mb-4">
    <h2 class="fw-bold" style="color: #4258c7;">Actividades en curso</h2>
</div>

<!-- Tabla de actividades -->
<div class="container">
    <div class="table-responsive">
        <table class="table table-bordered table-striped align-middle text-center">
            <thead class="table-secondary">
            <tr>
                <th>Título</th>
                <th>Descripción</th>
                <th>Fecha inicio</th>
                <th>Hora inicio</th>
                <th>Fecha fin</th>
                <th>Hora fin</th>
                <th>Prioridad</th>
                <th>Estado</th>
            </tr>
            </thead>
            <tbody>
            <!-- Ejemplo estático (luego se reemplaza con datos reales) -->
            <tr>
                <td>Control de flujo en la tobera</td>
                <td>Predicción de zonas críticas de temperatura</td>
                <td>28/06/2025</td>
                <td>08:00</td>
                <td>28/06/2025</td>
                <td>16:00</td>
                <td><span class="badge bg-danger">Alta</span></td>
                <td><span class="badge bg-success">En curso</span></td>
            </tr>
            </tbody>
        </table>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<script>
    function mostrarMensaje() {
        alert("Los reportes han sido generados");
    }
</script>

</body>
</html>
