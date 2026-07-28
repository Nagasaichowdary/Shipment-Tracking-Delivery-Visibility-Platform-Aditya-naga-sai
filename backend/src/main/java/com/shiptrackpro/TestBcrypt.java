package com.shiptrackpro;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
public class TestBcrypt {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String raw = "password";
        String hash = "$2a$10$7EqJtq98hPqEX7fNZaFWoOHiTQ0D5h6H4Z1cdq9VHtV6nRvWmvMRG";
        System.out.println("Result: " + encoder.matches(raw, hash));
        System.out.println("Hash length: " + hash.length());
    }
}
