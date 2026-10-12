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

    private final CustomUserDetailsService customUserDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            CustomUserDetailsService customUserDetailsService,
            JwtAuthenticationFilter jwtAuthenticationFilter
    ) {
        this.customUserDetailsService = customUserDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http

                // =========================
                // TẮT CSRF
                // =========================
                .csrf(csrf -> csrf.disable())

                // =========================
                // USER DETAILS SERVICE
                // =========================
                .userDetailsService(customUserDetailsService)

                // =========================
                // JWT -> KHÔNG DÙNG SESSION
                // =========================
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // =========================
                // PHÂN QUYỀN API / PAGE
                // =========================
                .authorizeHttpRequests(auth -> auth

                        // -------------------------
                        // PUBLIC
                        // -------------------------
                        .requestMatchers(
                                "/",
                                "/news",
                                "/auth/**",
                                "/favicon.ico",

                                // CSS / JS / Images
                                "/Css/**",
                                "/Js/**",
                                "/Images/**",

                                // API authentication
                                "/api/auth/**",

                                // API test
                                "/api/test-email",

                                // API upload image
                                "/api/images/**",

                                // Các trang giao diện
                                "/Admin/**",
                                "/DuocSi/**",

                                // WebSocket
                                "/ws",
                                "/ws/**"
                        ).permitAll()

                        // -------------------------
                        // KHO THUỐC
                        // CHỈ DƯỢC SĨ
                        // -------------------------
                        .requestMatchers(
                                "/api/kho-thuoc",
                                "/api/kho-thuoc/**"
                        )
                        .hasRole("DUOCSI")

                        // -------------------------
                        // THÔNG BÁO
                        // PHẢI ĐĂNG NHẬP
                        // -------------------------
                        .requestMatchers("/api/thong-bao/**")
                        .authenticated()

                        // -------------------------
                        // CÁC API CÒN LẠI
                        // PHẢI ĐĂNG NHẬP
                        // -------------------------
                        .anyRequest()
                        .authenticated()
                )

                // =========================
                // TẮT FORM LOGIN MẶC ĐỊNH
                // =========================
                .formLogin(form -> form.disable())

                // =========================
                // JWT FILTER
                // =========================
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}