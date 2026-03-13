package org.example.masterplan.controller;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.masterplan.model.Rol;
import org.example.masterplan.dao.RolDAO;
import org.example.masterplan.model.Usuario;
import org.example.masterplan.dao.UsuarioDAO;

import java.io.IOException;
import java.util.List;

@WebServlet("/actualizarRoles")
public class RolServlet extends HttpServlet {

    private final RolDAO rolDAO = new RolDAO();
    private final UsuarioDAO usuarioDAO = new UsuarioDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        List<Usuario> usuarios = usuarioDAO.listarUsuarios();
        List<Rol> roles = rolDAO.listarRoles();

        System.out.println("usuarios: " + usuarios);
        System.out.println("roles: " + roles);

        req.setAttribute("usuarios", usuarios); // pasamos la lista al JSP
        req.setAttribute("roles", roles);
        req.getRequestDispatcher("/gestion_rolesypermisos.jsp").forward(req, resp);
    }
}
