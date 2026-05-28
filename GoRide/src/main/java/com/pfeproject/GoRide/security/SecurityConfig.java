package com.pfeproject.GoRide.security;

import com.pfeproject.GoRide.security.jwt.JwtAuthEntryPoint;
import com.pfeproject.GoRide.security.jwt.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuration globale de la sécurité Spring.
 * - CORS pour Angular (port 4200)
 * - JWT stateless (pas de session serveur)
 * - Routes publiques vs protégées par rôle
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Active @PreAuthorize sur les méthodes
public class SecurityConfig {

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private JwtAuthEntryPoint unauthorizedHandler;

    @Autowired
    private JwtAuthFilter jwtAuthFilter;

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorizedHandler))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 1. Autoriser TOUTES les requêtes OPTIONS (pré-vérification CORS)
                        .requestMatchers(org.springframework.web.bind.annotation.RequestMethod.OPTIONS.name()).permitAll()
                        .requestMatchers(AntPathRequestMatcher.antMatcher(org.springframework.http.HttpMethod.OPTIONS, "/**")).permitAll()
                        
                        // 2. Routes publiques
                        .requestMatchers(new AntPathRequestMatcher("/api/auth/login")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/auth/signup")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/auth/forgot-password")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/auth/reset-password")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/auth/mail-status")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/auth/login/verify-2fa")).permitAll()
                        
                        // Routes 2FA nécessitant d'être connecté
                        .requestMatchers(new AntPathRequestMatcher("/api/auth/2fa/**")).authenticated()
                        
                        .requestMatchers(new AntPathRequestMatcher("/api/test/**")).permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/trips", "/api/trips/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/fleet/vehicles/available").permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/contact")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/assistant/**")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/ai/**")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/public/**")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/api/admin/dashboard/growth")).permitAll()
                        .requestMatchers(new AntPathRequestMatcher("/ws/**")).permitAll()
                        // Vehicle photos (static) — must be public for <img src> in Angular
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/vehicle-photos/**").permitAll()
                        .anyRequest().authenticated());

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer webSecurityCustomizer() {
        // Do NOT ignore /api/assistant — that skips CORS headers and breaks the Angular chatbot
        return (web) -> web.ignoring().requestMatchers("/h2-console/**", "/favicon.ico", "/vehicle-photos/**");
    }

    /**
     * Configuration CORS : autorise le frontend Angular à communiquer avec le
     * backend.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Autoriser le frontend Angular et les variantes localhost courantes
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:4200", 
            "http://127.0.0.1:4200",
            "http://localhost:[*]",
            "http://127.0.0.1:[*]"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
