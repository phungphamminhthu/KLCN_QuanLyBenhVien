package QuanLyBenhVien.Config;

import QuanLyBenhVien.Security.CustomUserDetailsService;
import QuanLyBenhVien.Security.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    // ============================================
    // cấu hình chính, JWT và thứ tự áp dụng rule.
    // ============================================
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
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                // JWT API: tắt CSRF theo cấu hình hiện tại
                .csrf(csrf -> csrf.disable())

                // User details service
                .userDetailsService(customUserDetailsService)

                // Không sử dụng session
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        // Endpoint xử lý lỗi
                        .requestMatchers("/error").permitAll()

                        // Chrome DevTools
                        .requestMatchers(
                                "/.well-known/appspecific/com.chrome.devtools.json"
                        ).permitAll()

                        // Webhook SePay
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/sepay/webhook"
                        ).permitAll()

                        // Public routes
                        .requestMatchers(
                                SecurityRouteConfig.PUBLIC_ROUTES
                        ).permitAll()

                        // Các trang Thymeleaf hiện tại
                        .requestMatchers(
                                SecurityRouteConfig.WEB_PAGES
                        ).permitAll()

                        // API tin tức công khai
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/tin-tuc",
                                "/api/tin-tuc/**"
                        ).permitAll()

                        // API dịch vụ y tế công khai
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/dich-vu-y-te",
                                "/api/dich-vu-y-te/**"
                        ).permitAll()

                        // Trang và API bệnh nhân đang tạm công khai
                        .requestMatchers(
                                "/benh-nhan/trang-chu",
                                "/benh-nhan/dat-lich",
                                "/benh-nhan/lich-su",
                                "/benh-nhan/lich-su/chi-tiet",
                                "/api/lich-kham/cua-toi",
                                "/api/thanh-toan/lich-kham/*/hoa-don"
                        ).permitAll()

                        // API phân quyền và phân công tiếp nhận: Admin
                        .requestMatchers(
                                SecurityRoleConfig.ADMIN_APIS
                        ).hasRole("ADMIN")

                        // API Dược sĩ
                        .requestMatchers(
                                SecurityRoleConfig.DUOCSI_APIS
                        ).hasRole("DUOCSI")

                        // API Tiếp nhận
                        .requestMatchers(
                                SecurityRoleConfig.TIEPNHAN_APIS
                        ).hasRole("TIEPNHAN")

                        // API hồ sơ bệnh án
                        .requestMatchers(
                                SecurityRoleConfig.MEDICAL_RECORD_APIS
                        ).hasAnyRole("BENHNHAN", "BACSI", "ADMIN")

                        // API đăng ký thiết bị FCM: Bệnh nhân
                        .requestMatchers(
                                SecurityRoleConfig.PATIENT_APIS
                        ).hasRole("BENHNHAN")

                        // API thông báo: yêu cầu đăng nhập
                        .requestMatchers(
                                SecurityRoleConfig.AUTHENTICATED_APIS
                        ).authenticated()

                        // Các request còn lại cần đăng nhập
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