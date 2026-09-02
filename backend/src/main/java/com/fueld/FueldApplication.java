package com.fueld;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FueldApplication {
    public static void main(String[] args) {
        SpringApplication.run(FueldApplication.class, args);
    }
}
