package org.example.masterplan.model;

public class Usuario {
    private int idUsuario;
    private int idRol;
    private String nombres;
    private String usuario;
    private String clave;

    public Usuario(int idUsuario, int idRol, String nombres, String usuario, String clave) {
        this.idUsuario = idUsuario;
        this.idRol = idRol;
        this.nombres = nombres;
        this.usuario = usuario;
        this.clave = clave;
    }

    public int getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(int idUsuario) {
        this.idUsuario = idUsuario;
    }

    public int getIdRol() {
        return idRol;
    }

    public void setIdRol(int idRol) {
        this.idRol = idRol;
    }

    public String getNombres() {
        return nombres;
    }

    public void setNombres(String nombres) {
        this.nombres = nombres;
    }

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getClave() {
        return clave;
    }

    public void setClave(String clave) {
        this.clave = clave;
    }

    @Override
    public String toString() {
        return "Usuario{" +
                "idUsuario=" + idUsuario +
                ", idRol=" + idRol +
                ", nombres='" + nombres + '\'' +
                ", usuario='" + usuario + '\'' +
                ", clave='" + clave + '\'' +
                '}';
    }
}
