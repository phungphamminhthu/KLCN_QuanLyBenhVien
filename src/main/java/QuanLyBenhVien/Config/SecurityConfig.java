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
        //SecurityConfig quy định role đó được phép hay bị chặn

        http
                .csrf(csrf -> csrf.disable())

                .userDetailsService(customUserDetailsService)

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

                        // Các trang Thymeleaf
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

                        // API danh sách khoa công khai cho app đặt lịch
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/khoa",
                                "/api/khoa/**"
                        ).permitAll()

                        // Trang và API bệnh nhân tạm công khai
                        .requestMatchers(
                                "/benh-nhan/trang-chu",
                                "/benh-nhan/dat-lich",
                                "/benh-nhan/lich-su",
                                "/benh-nhan/lich-su/chi-tiet",
                                "/api/lich-kham/cua-toi",
                                "/api/thanh-toan/lich-kham/*/hoa-don"
                        ).permitAll()

                        // API Admin
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

                        // API thiết bị FCM: Bệnh nhân
                        .requestMatchers(
                                SecurityRoleConfig.PATIENT_APIS
                        ).hasRole("BENHNHAN")

                        // Bệnh nhân và bác sĩ được xem lịch làm việc / khung giờ
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/bac-si/lich-lam-viec/danh-sach",
                                "/api/bac-si/lich-lam-viec/khung-gio"
                        ).hasAnyRole("BENHNHAN", "BACSI")

                        // API Bác sĩ
                        .requestMatchers(
                                SecurityRoleConfig.BACSI_APIS
                        ).hasRole("BACSI")

                        // API thông báo: yêu cầu đăng nhập
                        //                        .requestMatchers(
                        //                                SecurityRoleConfig.AUTHENTICATED_APIS
                        //                        ).authenticated()
                        // API thông báo: các vai trò được phép sử dụng
                        .requestMatchers(SecurityRoleConfig.THONG_BAO_APIS)
                        .hasAnyRole(
                                "ADMIN",
                                "TIEPNHAN",
                                "BACSI",
                                "DUOCSI",
                                "CHUYENTRACH",
                                "BENHNHAN"
                        )

                        // Các request còn lại cần đăng nhập
                        .anyRequest().authenticated()
                )

                .formLogin(form -> form.disable())

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}