package QuanLyBenhVien.Config;

public final class SecurityRouteConfig {

    // ===========================================
    // nhóm URL public và trang giao diện
    // ===========================================
    private SecurityRouteConfig() {
    }

    // Tài nguyên và trang công khai
    public static final String[] PUBLIC_ROUTES = {
            "/",
            "/home",
            "/home/**",
            "/news",
            "/news/**",
            "/services",
            "/services/**",
            "/about",
            "/Css/Public/**",
            "/auth/**",
            "/favicon.ico",
            "/Css/**",
            "/Js/**",
            "/Images/**",
            "/medical-records/qr",
            "/ws",
            "/ws/**",
            "/api/auth/**",
            "/api/test-email",
            "/api/images/**"
    };

    // Các trang giao diện Thymeleaf
    public static final String[] WEB_PAGES = {
            "/Admin/**",
            "/DuocSi/**",
            "/TiepNhan/**",
            "/ChuyenTrach/**"
    };
}