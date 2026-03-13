package org.example.masterplan.model;

import java.time.LocalDate;
import java.time.LocalTime;

public class Actividad {

    private int idActividad;
    private int idUsuario;
    private String titulo;
    private String descripcion;
    private LocalDate fecha;
    private LocalTime hora;
    private LocalTime duracion;

    public Actividad(int idActividad, int idUsuario, String titulo, String descripcion,
                     LocalDate fecha, LocalTime hora, LocalTime duracion) {
        this.idActividad =  idActividad;
        this.idUsuario = idUsuario;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.fecha = fecha;
        this.hora = hora;
        this.duracion = duracion;
    }

    public int getIdActividad() { return idActividad; }
    public int getIdUsuario() { return idUsuario; }
    public String getTitulo() { return titulo; }
    public String getDescripcion() { return descripcion; }
    public LocalDate getFecha() { return fecha; }
    public LocalTime getHora() { return hora; }
    public LocalTime getDuracion() { return duracion; }

    @Override
    public String toString() {
        return "Actividad{" +
                "idActividad=" + idActividad +
                ", idUsuario=" + idUsuario +
                ", titulo='" + titulo + '\'' +
                ", descripcion='" + descripcion + '\'' +
                ", fecha=" + fecha +
                ", hora=" + hora +
                ", duracion=" + duracion +
                '}';
    }
}
