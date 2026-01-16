<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Gestión de roles y permisos</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body class="bg-light p-4">

<!-- Encabezado -->
<div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-4">
    <img src="${pageContext.request.contextPath}/logo.png" alt="Logo" style="height: 65px;">
    <h1 style="color: #4258c7;" class="fw-bold fst-italic">MasterPlan</h1>
    <a href="${pageContext.request.contextPath}/logout" class="btn btn-outline-danger">Cerrar Sesión</a>
</div>

<form action="${pageContext.request.contextPath}/actualizarRoles" method="get">
    <div class="d-flex justify-content-center">
        <div class="w-auto">
            <h3 class="fw-bold">Roles y permisos</h3>

            <!-- Buscar usuario -->
            <div class="row mb-3">
                <div class="d-flex align-items-center">
                    <label for="nombre" class="form-label me-2" style="width: 120px; color: #4258c7;">Nombre:</label>
                    <input type="text" class="form-control me-2" id="nombre" name="nombre"
                           style="width: 300px;"> <!-- required -->
                    <button type="submit" class="btn" style="background-color: #4258c7; color: white;">
                        Buscar
                    </button>
                </div>
            </div>

            <!-- Tabla de usuarios -->
            <div class="table-responsive">
                <table class="table table-bordered table-striped align-middle">
                    <thead class="table-primary text-center">
                    <tr>
                        <th>Nombres</th>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Permisos</th>
                    </tr>
                    </thead>
                    <tbody>
                    <c:forEach var="usuario" items="${usuarios}">
                        <tr>
                            <td>${usuario.nombres}</td>
                            <td>${usuario.usuario}</td>

                            <td>
                                <c:set var="rolUsuario" />
                                <c:forEach var="rol" items="${roles}">
                                    <c:if test="${rol.idRol == usuario.idRol}">
                                        <c:set var="rolUsuario" value="${rol}" />
                                    </c:if>
                                </c:forEach>
                                    ${rolUsuario.nombre}
                            </td>
                            <td>
                                <ul>
                                    <c:forEach var="permisos" items="${rolUsuario.permisos}">
                                        <li>${permisos}</li>
                                    </c:forEach>
                                </ul>
                            </td>
<%--                            <td>--%>
<%--                                <ul class="mb-0">--%>
<%--                                    <c:forEach var="permisos" items="${fn:split(rol.permisos, ',')}">--%>
<%--                                        <li>${permiso}</li>--%>
<%--                                    </c:forEach>--%>
<%--                                </ul>--%>
<%--                            </td>--%>
                        </tr>
                    </c:forEach>
                    </tbody>
                </table>
            </div>

            <!-- Edición de roles y permisos -->
            <h3 class="fw-bold">Edición de roles y permisos</h3>

            <div class="row mb-3 align-items-center">
                <label for="usuarioEdit" class="col-auto col-form-label pe-2"
                       style="width: 120px; color: #4258c7;">Usuario:</label>
                <div class="col">
                    <span id="usuarioEdit"
                          style="display: inline-block; width: 300px; padding: 0.375rem 0.75rem; color: #212529;
                                 background-color: #f8f9fa; border: 1px solid #ced4da; border-radius: 0.375rem;">
                        ${usuarioSeleccionado.usuario}
                    </span>
                </div>
            </div>

            <div class="col-auto d-flex align-items-center mb-3">
                <label for="rol" class="col-form-label me-2" style="width: 120px; color: #4258c7;">Rol:</label>
                <select class="form-select" id="rol" name="rol" style="width: 200px;">
<%--                    <c:forEach var="rol" items="${roles}">--%>
<%--                        <option value="${rol.idRol}" <c:if test="${rol.nombre == usuarioSeleccionado.rol}">selected</c:if>>--%>
<%--                                ${rol.nombre}--%>
<%--                        </option>--%>
<%--                    </c:forEach>--%>
                </select>
            </div>

            <label class="col-auto col-form-label pe-2" style="width: 120px; color: #4258c7;">Permisos:</label>
            <div class="d-flex justify-content-center mb-3">
                <div>
                    <c:forEach var="permiso" items="${rolesPermisos}">
                        <div class="form-check mb-2 text-center">
                            <input class="form-check-input" type="checkbox" name="permisos"
                                   value="${permiso}"
                                   <c:if test="${fn:contains(usuarioSeleccionado.permisos, permiso)}">checked</c:if>>
                            <label class="form-check-label">${permiso}</label>
                        </div>
                    </c:forEach>
                </div>
            </div>

            <div class="d-flex justify-content-center mt-4 gap-2">
                <button type="submit" class="btn btn-primary"
                        style="background-color: #4258c7; color: white;">Actualizar</button>
                <a href="${pageContext.request.contextPath}/index.jsp"
                   class="btn btn-secondary"
                   style="background-color: #4258c7; color: white;">Volver</a>
            </div>

        </div>
    </div>
</form>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
