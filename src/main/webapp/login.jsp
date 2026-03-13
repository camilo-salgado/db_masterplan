<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login - MasterPlan</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body class="bg-light d-flex justify-content-center align-items-center vh-100">

<div class="card shadow p-4" style="width: 380px;">

    <!-- Titulo -->
    <div class="text-center mb-4">
        <h2 class="fw-bold fst-italic" style="color:#4258c7;">MasterPlan</h2>
        <h5 class="mt-2">Iniciar Sesión</h5>
    </div>

    <!-- Formulario -->
    <form method="post" action="<%= request.getContextPath() %>/login">

        <div class="mb-3">
            <label class="form-label" style="color:#4258c7;">Usuario</label>
            <input type="text"
                   name="usuario"
                   class="form-control"
                   placeholder="Ingrese su usuario"
                   required>
        </div>

        <div class="mb-3">
            <label class="form-label" style="color:#4258c7;">Contraseña</label>
            <input type="password"
                   name="password"
                   class="form-control"
                   placeholder="Ingrese su contraseña"
                   required>
        </div>

        <div class="d-grid mt-4">
            <button type="submit"
                    class="btn btn-primary"
                    style="background-color:#4258c7;">
                Ingresar
            </button>
        </div>

    </form>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

</body>
</html>