package org.example.masterplan.controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.masterplan.model.Actividad;
import org.example.masterplan.dao.ActividadDAO;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


/**
 * Servlet encargado de gestionar las operaciones CRUD de la entidad Actividad.
 *
 * <p>Este servlet responde a la ruta base <code>/actividad/*</code> y permite:
 * <ul>
 *     <li>Crear actividades (POST)</li>
 *     <li>Listar actividades (GET)</li>
 *     <li>Actualizar actividades existentes (PUT)</li>
 *     <li>Eliminar actividades (DELETE)</li>
 * </ul>
 *
 * <p>Soporta subrutas para operaciones que requieren un identificador,
 * por ejemplo: <code>/actividad/{id}</code>.
 */
@WebServlet("/actividad/*")
public class ActividadServlet extends HttpServlet {

    /**
     * Objeto DAO responsable de la comunicación con la base de datos
     * para la entidad Actividad.
     */
    private final ActividadDAO dao = new ActividadDAO();

    /**
     * Maneja la creación de una nueva actividad.
     *
     * <p>Este método recibe los datos enviados desde un formulario HTML
     * mediante el método HTTP POST, construye un objeto {@link Actividad}
     * y lo inserta en la base de datos.</p>
     *
     * <p>En caso de éxito, redirige a la página principal.
     * En caso de error, redirige a una página de error.</p>
     *
     * @param req  solicitud HTTP que contiene los parámetros del formulario
     * @param resp respuesta HTTP utilizada para redirección
     * @throws IOException si ocurre un error durante la redirección
     */
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Actividad actividad = new Actividad(
                99, // Ejemplo de idActividad (esto deberia auto incrementarse)
                2,  // Ejemplo de idUsuario
                req.getParameter("titulo"),
                req.getParameter("descripcion"),
                LocalDate.parse(req.getParameter("fechaInicio")),
                LocalTime.parse(req.getParameter("horaInicio")),
                LocalTime.parse("01:00:00")
        );

        System.out.println("Actividad: " + actividad);
        boolean ok = dao.insertarActividad(actividad);

        // En caso de que sea exitoso, inserta la informacion ingresada por el usuario en la base de datos
        if (ok)
            resp.sendRedirect(req.getContextPath() + "/index.jsp"); // Devuelve a la pagina principal
        else
            resp.sendRedirect(req.getContextPath() + "/error.jsp");
    }

    /**
     * Maneja la obtención de todas las actividades registradas.
     *
     * <p>Consulta la base de datos a través del DAO y almacena la lista
     * de actividades como atributo de la solicitud para ser utilizada
     * en una vista JSP.</p>
     *
     * @param req  solicitud HTTP
     * @param resp respuesta HTTP
     * @throws ServletException si ocurre un error al reenviar la solicitud
     * @throws IOException si ocurre un error de entrada/salida
     */
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        List<Actividad> actividades = dao.listarActividades();
        System.out.println("actividades: ");
        for(Actividad act: actividades)
            System.out.println(act);

        req.setAttribute("actividades", actividades);
        req.getRequestDispatcher("/actividades.jsp").forward(req, resp);
    }

    /**
     * Maneja la actualización de una actividad existente.
     *
     * <p>El ID de la actividad se obtiene desde la URL
     * (<code>/actividad/{id}</code>). Los datos actualizados se leen
     * desde el cuerpo de la solicitud en formato
     * <code>x-www-form-urlencoded</code>.</p>
     *
     * <p>Si la actualización es exitosa, redirige a la página principal.
     * En caso contrario, redirige a una página de error.</p>
     *
     * @param req  solicitud HTTP que contiene el ID y los datos a actualizar
     * @param resp respuesta HTTP
     * @throws IOException si ocurre un error de entrada/salida
     */
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // Para obtener ID desde la URL: /actividad/99
        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "ID requerido");
            return;
        }

        int idActividad;
        try {
            idActividad = Integer.parseInt(pathInfo.substring(1));
            System.out.println("idActividad en doPut: " + idActividad);
        }
        catch (NumberFormatException e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "ID inválido");
            return;
        }

        // Para leer body (x-www-form-urlencoded)
        String body = req.getReader().lines().reduce("", String::concat);

        Map<String, String> params = Arrays.stream(body.split("&"))
                .map(p -> p.split("=", 2))
                .collect(Collectors.toMap(
                        p -> URLDecoder.decode(p[0], StandardCharsets.UTF_8),
                        p -> URLDecoder.decode(p[1], StandardCharsets.UTF_8)
                ));
        System.out.println("params: " + params);

        Actividad actividad = new Actividad(
                idActividad,
                2,
                params.get("titulo"),
                params.get("descripcion"),
                LocalDate.parse(params.get("fechaInicio")),   /*  */
                LocalTime.parse(params.get("horaInicio")),    /*  */
                LocalTime.parse("01:00:00") // La duracion no deberia ser posible modificar
        );
        System.out.println("Actividad a actualizar: " + actividad);

        boolean ok = dao.actualizarActividad(actividad);
        if (ok)
            resp.sendRedirect(req.getContextPath() + "/index.jsp");
        else
            resp.sendRedirect(req.getContextPath() + "/error.jsp");
    }

    /**
     * Maneja la eliminación de una actividad existente.
     *
     * <p>El ID de la actividad se obtiene desde la URL
     * (<code>/actividad/{id}</code>).</p>
     *
     * <p>Respuestas posibles:</p>
     * <ul>
     *     <li>204 (No Content): actividad eliminada correctamente</li>
     *     <li>400 (Bad Request): ID inválido o no proporcionado</li>
     *     <li>404 (Not Found): actividad no encontrada</li>
     * </ul>
     *
     * @param req  solicitud HTTP que contiene el ID de la actividad
     * @param resp respuesta HTTP
     * @throws IOException si ocurre un error de entrada/salida
     */
    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {

        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("ID requerido");
            return;
        }

        int idActividad;
        try {
            idActividad = Integer.parseInt(pathInfo.substring(1));
            System.out.println("idActividad: " + idActividad);
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("ID inválido");
            return;
        }

        boolean deleted = dao.eliminarActividad(idActividad);
        if (deleted)
            resp.setStatus(HttpServletResponse.SC_NO_CONTENT); // 204
        else {
            resp.setStatus(HttpServletResponse.SC_NOT_FOUND); // 404
            resp.getWriter().write("Actividad no encontrada");
        }
    }
}
