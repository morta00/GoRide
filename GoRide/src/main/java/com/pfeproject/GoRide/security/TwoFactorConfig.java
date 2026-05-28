package com.pfeproject.GoRide.security;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorConfig;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TwoFactorConfig {

    @Bean
    public GoogleAuthenticator googleAuthenticator() {
        GoogleAuthenticatorConfig config = new GoogleAuthenticatorConfig.GoogleAuthenticatorConfigBuilder()
                .setKeyRepresentation(com.warrenstrange.googleauth.KeyRepresentation.BASE32)
                .build();
        return new GoogleAuthenticator(config);
    }
}
