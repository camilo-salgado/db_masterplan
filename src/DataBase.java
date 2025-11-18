import java.sql.*;

//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
public class DataBase {
    public static void main(String[] args) {
        String usuario = "root";
        String contrasenia  = "";
        String url = "jdbc:mysql://localhost:3307/db_masterplan";

        Connection connect;
        Statement state;
        ResultSet res;

        try{
            Class.forName("com.mysql.cj.jdbc.Driver");
        }catch (ClassNotFoundException e){
            System.getLogger(DataBase.class.getName()).log(System.Logger.Level.ERROR, (String) null, e);
        }

        try{
            connect = DriverManager.getConnection(url, usuario, contrasenia);
            state = connect.createStatement();

//            Date
            state.executeUpdate("INSERT INTO actividad(id_actividad,id_usuario,titulo,descripcion,fecha,hora,duracion) VALUES (3333,1,'esto es una prueba','prueba','2025-11-03','20:11:11','25:25:00')");
            res = state.executeQuery("SELECT * FROM actividad");
            res.next();
            do{
                System.out.println("identificacion: " + res.getInt("id_actividad") + " : " + res.getString("titulo") + " : " + res.getString("descripcion"));
            }while (res.next());
        } catch (SQLException e) {
            System.getLogger(DataBase.class.getName()).log(System.Logger.Level.ERROR, (String) null, e);
        }
    }
}