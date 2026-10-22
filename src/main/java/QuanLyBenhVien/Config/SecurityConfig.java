package QuanLyBenhVien.Config;

import QuanLyBenhVien.Security.CustomUserDetailsService;
import QuanLyBenhVien.Security.JwtAuthenticationFilter;
import org.springframework.http.HttpMethod;

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
                // Tắt CSRF
                .csrf(csrf -> csrf.disable())

                // User details service
                .userDetailsService(customUserDetailsService)

                // JWT, không dùng session
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // Phân quyền API và trang

                .authorizeHttpRequests(auth -> auth
                        // Endpoint xử lý lỗi của Spring
                        .requestMatchers("/error").permitAll()

                        // Chrome DevTools: tránh log 403 không liên quan
                        .requestMatchers(
                                "/.well-known/appspecific/com.chrome.devtools.json"
                        ).permitAll()

                        // Webhook SePay: cho phép nhận callback không có JWT
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/sepay/webhook"
                        ).permitAll()

                        // Tài nguyên công khai
                        .requestMatchers(
                                "/",
                                "/news",
                                "/auth/**",
                                "/favicon.ico",
                                "/Css/**",
                                "/Js/**",
                                "/Images/**",
                                "/ws",
                                "/ws/**",
                                "/api/auth/**",
                                "/api/test-email",
                                "/api/images/**"
                        ).permitAll()

                        // Giao diện hiện tại
                        .requestMatchers(
                                "/Admin/**",
                                "/DuocSi/**",
                                "/TiepNhan/**"
                        ).permitAll()

                        // API kho thuốc: chỉ Dược sĩ
                        .requestMatchers(
                                "/api/kho-thuoc",
                                "/api/kho-thuoc/**"
                        ).hasRole("DUOCSI")

                        // API thông báo cần đăng nhập
                        .requestMatchers("/api/thong-bao/**").authenticated()

                        // API phân công tiếp nhận: chỉ Admin
                        .requestMatchers(
                                "/api/phan-cong-tiep-nhan",
                                "/api/phan-cong-tiep-nhan/**"
                        ).hasRole("ADMIN")

                        // Những request còn lại cần đăng nhập
                        .anyRequest().authenticated()
                )

                // Tắt form login mặc định
                .formLogin(form -> form.disable())

                // JWT filter
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}