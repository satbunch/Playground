package org.example.distudyspring;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class DiStudySpringApplication {

    public static void main(String[] args) {
        SpringApplication.run(DiStudySpringApplication.class, args);
    }

    @Bean
    CommandLineRunner run(OrderService orderService) {
        return args -> orderService.placeOrder("ご飯");
    }
}
