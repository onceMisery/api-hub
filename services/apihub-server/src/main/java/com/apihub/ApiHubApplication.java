package com.apihub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ApiHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiHubApplication.class, args);
    }
}
