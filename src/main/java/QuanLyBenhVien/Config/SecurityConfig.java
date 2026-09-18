package QuanLyBenhVien.Config;

import QuanLyBenhVien.Security.CustomUserDetailsService;
import QuanLyBenhVien.Security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final CustomUserDetailsService CustomUserDetailsService;
    private final JwtAuthenticationFilter JwtAuthenticationFilter;

    public SecurityConfig(
            CustomUserDetailsService CustomUserDetailsService,
            JwtAuthenticationFilter JwtAuthenticationFilter) {

        this.CustomUserDetailsService = CustomUserDetailsService;
        this.JwtAuthenticationFilter = JwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .userDetailsService(CustomUserDetailsService)

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth

                        // ===== PUBLIC =====
                        .requestMatchers(
                                "/",
                                "/news",
                                "/auth/**",
                                "/Css/**",
                                "/Js/**",
                                "/Images/**",
                                "/api/auth/**",

                                // ===== TEST EMAIL =====
                                "/api/test-email",
                                // ===== TRANG GIAO DIỆN =====
                                "/Admin/**"
                        ).permitAll()

                        // ===== API/TRANG KHÁC =====
                        .anyRequest().authenticated()
                )

                .formLogin(form -> form.disable())

                .httpBasic(basic -> basic.disable())

                .addFilterBefore(
                        JwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}