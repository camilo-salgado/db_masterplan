package org.example.masterplan.dao;

import org.example.masterplan.model.Actividad;

import java.util.List;

public interface IActividadDAO {
    boolean insertarActividad(Actividad actividad);
    List<Actividad> listarActividades();
    boolean actualizarActividad(Actividad actividad);
    boolean eliminarActividad(int idActividad);
}
