package org.example.masterplan.model;

public class Rol {
    private int idRol;
    private String nombre;
    private String descripcion;
    private String permisos; // A futuro se podria implementar un List<String> en vez de separar por coma (,)

    public Rol(int idRol, String nombre, String descripcion, String permisos) {
        this.idRol = idRol;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.permisos = permisos;
    }

    public int getIdRol() { return idRol; }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
    public String getPermisos() { return permisos; }

    @Override
    public String toString() {
        return "Rol{" +
                "idRol=" + idRol +
                ", nombre='" + nombre + '\'' +
                ", descripcion='" + descripcion + '\'' +
                ", permisos='" + permisos + '\'' +
                '}';
    }
}
