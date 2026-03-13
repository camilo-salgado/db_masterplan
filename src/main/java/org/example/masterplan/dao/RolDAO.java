package org.example.masterplan.dao;

import org.example.masterplan.config.DBConnection;
import org.example.masterplan.model.Rol;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class RolDAO {

    public List<Rol> listarRoles() {
        List<Rol> lista = new ArrayList<>();
        String sql = "SELECT * FROM rol"; // Sentencia para obtener la tabla Rol

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Rol rol = new Rol(
                        rs.getInt("id_rol"),
                        rs.getString("rol"),
                        rs.getString("descripcion"),
                        rs.getString("permisos")
                );
                lista.add(rol);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lista;
    }
}
