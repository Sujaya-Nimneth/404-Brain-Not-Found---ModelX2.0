package com.modelx.atie;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AtieApplication {
    public static void main(String[] args) {
        SpringApplication.run(AtieApplication.class, args);
    }
}
