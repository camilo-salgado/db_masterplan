package org.example.masterplan.dao;

import org.example.masterplan.config.DBConnection;
import org.example.masterplan.model.Actividad;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ActividadDAO implements IActividadDAO {

    public boolean insertarActividad(Actividad actividad) {

        String sql = """
            INSERT INTO actividad
            (id_actividad, id_usuario, titulo, descripcion, fecha, hora, duracion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """;

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, actividad.getIdActividad());
            ps.setInt(2, actividad.getIdUsuario());
            ps.setString(3, actividad.getTitulo());
            ps.setString(4, actividad.getDescripcion());
            ps.setDate(5, java.sql.Date.valueOf(actividad.getFecha()));
            ps.setTime(6, java.sql.Time.valueOf(actividad.getHora()));
            ps.setTime(7, java.sql.Time.valueOf(actividad.getDuracion()));

            ps.executeUpdate();
            return true;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<Actividad> listarActividades() {
        List<Actividad> lista = new ArrayList<>();
        String sql = "SELECT * FROM actividad";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Actividad act = new Actividad(
                        rs.getInt("id_actividad"),
                        rs.getInt("id_usuario"),
                        rs.getString("titulo"),
                        rs.getString("descripcion"),
                        rs.getDate("fecha").toLocalDate(),
                        rs.getTime("hora").toLocalTime(),
                        rs.getTime("duracion").toLocalTime()
                );
                lista.add(act);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return lista;
    }

    public boolean actualizarActividad(Actividad actividad) {

        String sql = """
        UPDATE actividad
        SET titulo = ?,
            descripcion = ?,
            fecha = ?,
            hora = ?,
            duracion = ?
        WHERE id_actividad = ?
        """;

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, actividad.getTitulo());
            ps.setString(2, actividad.getDescripcion());
            ps.setDate(3, Date.valueOf(actividad.getFecha()));
            ps.setTime(4, Time.valueOf(actividad.getHora()));
            ps.setTime(5, Time.valueOf(actividad.getDuracion()));
            ps.setInt(6, actividad.getIdActividad());

            return ps.executeUpdate() > 0;
        }
        catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean eliminarActividad(int idActividad) {
        String sql = "DELETE FROM actividad WHERE id_actividad = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, idActividad); // Si mal no estoy el 1 es el numero de la columna
            return ps.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
