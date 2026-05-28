package com.pfeproject.GoRide.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtre de diagnostic pour inspecter toutes les requêtes entrantes.
 * Aide à identifier pourquoi certaines routes sont bloquées par Spring Security.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DebugFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(DebugFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        String path = request.getRequestURI();
        String method = request.getMethod();
        
        logger.info("[DEBUG] Request: {} {} | Content-Type: {}", method, path, request.getContentType());
        
        filterChain.doFilter(request, response);
        
        logger.info("[DEBUG] Response: {} {} | Status: {}", method, path, response.getStatus());
    }
}
