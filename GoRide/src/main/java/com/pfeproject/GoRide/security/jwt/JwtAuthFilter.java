package com.pfeproject.GoRide.security.jwt;

import com.pfeproject.GoRide.security.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtre HTTP qui intercepte CHAQUE requête pour vérifier le token JWT.
 * Si le token est valide, l'utilisateur est authentifié dans le contexte Spring Security.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        if (path == null) {
            return false;
        }
        return path.startsWith("/api/auth/login")
                || path.startsWith("/api/auth/signup")
                || path.startsWith("/api/auth/forgot-password")
                || path.startsWith("/api/auth/reset-password")
                || path.startsWith("/api/auth/mail-status")
                || path.startsWith("/api/assistant/")
                || path.startsWith("/api/ai/")
                || path.startsWith("/api/public/")
                || path.startsWith("/api/contact")
                || path.equals("/api/trips")
                || path.startsWith("/api/trips/")
                || path.startsWith("/api/fleet/vehicles/available")
                || path.startsWith("/api/test/")
                || path.startsWith("/ws/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        try {
            String jwt = parseJwt(request);

            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String email = jwtUtils.getEmailFromJwtToken(jwt);

                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            logger.error("Impossible d'authentifier l'utilisateur : {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extrait le token JWT du header "Authorization: Bearer <token>".
     */
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
