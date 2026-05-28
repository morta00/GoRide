package com.pfeproject.GoRide;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public class CleanupTask {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/goride_db?useSSL=false&serverTimezone=UTC";
        String user = "root";
        String password = "";
        String email = "ichraflouhichi22@gmail.com";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            stmt.execute("SET FOREIGN_KEY_CHECKS = 0");
            stmt.executeUpdate("DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = '" + email + "')");
            stmt.executeUpdate("DELETE FROM activities WHERE user_id = (SELECT id FROM users WHERE email = '" + email + "')");
            stmt.executeUpdate("DELETE FROM users WHERE email = '" + email + "'");
            stmt.execute("SET FOREIGN_KEY_CHECKS = 1");
            
            System.out.println("Base de données nettoyée pour : " + email);

        } catch (Exception e) {
            System.err.println("ERREUR : " + e.getMessage());
        }
    }
}
