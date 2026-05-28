package com.pfeproject.GoRide;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableAsync;


@SpringBootApplication
@EnableAsync
public class GoRideApplication {

	public static void main(String[] args) {
		SpringApplication.run(GoRideApplication.class, args);
	}

}
