<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib uri="jakarta.tags.core" prefix="c" %>
<%@ taglib uri="jakarta.tags.functions" prefix="fn" %>
<%--
Esta importaciones podria crear incompatibilidad en el futuro entonces mejor no usar
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
--%>

<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Actividades en curso</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>


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
                <th>Fecha</th>
                <th>Hora</th>
                <th>Duracion</th>
<%--                <th>Prioridad</th>--%>
<%--                <th>Estado</th>--%>
            </tr>
            </thead>
            <tbody>

            <!-- Se agregan los datos de manera dinamica -->
            <c:forEach var="act" items="${actividades}">
                <tr>
                    <td>${act.titulo}</td>
                    <td>${act.descripcion}</td>
                    <td>${act.fecha}</td>
                    <td>${act.hora}</td>
                    <td>${act.duracion}</td>
                </tr>
                <%--                    <td>--%>
<%--                        <span class="badge--%>
<%--                            ${act.prioridad == 'Alta' ? 'bg-danger' :--%>
<%--                              act.prioridad == 'Media' ? 'bg-warning' : 'bg-success'}">--%>
<%--                                ${act.prioridad}--%>
<%--                        </span>--%>
<%--                    </td>--%>
<%--                    <td>--%>
<%--                        <span class="badge bg-success">--%>
<%--                                ${act.estado}--%>
<%--                        </span>--%>
<%--                    </td>--%>
            </c:forEach>
            </tbody>
        </table>
        <p>Total actividades: ${actividades.size()}</p>
    </div>
</div>

<div class="d-flex justify-content-center mt-4 gap-2">
    <a href="${pageContext.request.contextPath}/index.jsp"
       class="btn btn-secondary"
       style="background-color: #4258c7;">
        Volver
    </a>
</div>

</body>
</html>
