package org.example.masterplan.config;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

public class DBConnection {
    private static final Properties props = new Properties();

    // Para buenas practicas se carga la informacion desde un archivo y no hardcodeado en el codigo
    static {
        try (InputStream input = DBConnection.class
                .getClassLoader()
                .getResourceAsStream("db.properties")) {

            if (input == null) {
                throw new RuntimeException("No se pudo encontrar db.properties");
            }
            props.load(input);

        } catch (Exception e) {
            throw new RuntimeException("Error cargando configuración de BD", e);
        }
    }

    private DBConnection() {}

    public static Connection getConnection() throws SQLException {
        try{
            Class.forName("com.mysql.cj.jdbc.Driver");
        }catch (ClassNotFoundException e){
            System.getLogger(DBConnection.class.getName()).log(System.Logger.Level.ERROR, (String) null, e);
        }

        return DriverManager.getConnection(
                props.getProperty("db.url"),
                props.getProperty("db.user"),
                props.getProperty("db.password")
        );
    }
}
