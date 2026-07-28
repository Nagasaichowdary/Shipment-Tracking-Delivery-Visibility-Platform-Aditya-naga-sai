package com.shiptrackpro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.shiptrackpro.repository.UserRepository;
import com.shiptrackpro.entity.User;
import com.shiptrackpro.security.JwtService;
import java.util.List;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    public CommandLineRunner run() {
        return args -> {
            System.out.println("====== APPLICATION STARTED ======");
        };
    }
}