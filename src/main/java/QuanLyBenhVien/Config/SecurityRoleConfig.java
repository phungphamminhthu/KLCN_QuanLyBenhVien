package QuanLyBenhVien.Config;

public final class SecurityRoleConfig {

    // ==============================================
    // nhóm api theo vai trò
    // ==============================================
    private SecurityRoleConfig() {
    }

    // Admin
    public static final String[] ADMIN_APIS = {
            "/api/phan-quyen/**",
            "/api/phan-cong-tiep-nhan",
            "/api/phan-cong-tiep-nhan/**"
    };

    // Dược sĩ
    public static final String[] DUOCSI_APIS = {
            "/api/duocsi",
            "/api/duocsi/**",
            "/api/kho-thuoc",
            "/api/kho-thuoc/**"
    };

    // Tiếp nhận
    public static final String[] TIEPNHAN_APIS = {
            "/api/tiep-nhan/ho-so-ca-nhan",
            "/api/tiep-nhan/ho-so-ca-nhan/**",
            "/api/tiep-nhan/doi-mat-khau"
    };

    // Bệnh nhân, bác sĩ, Admin
    public static final String[] MEDICAL_RECORD_APIS = {
            "/api/medical-records",
            "/api/medical-records/**"
    };

    // Bệnh nhân
    public static final String[] PATIENT_APIS = {
            "/api/thiet-bi/**"
    };

    // API yêu cầu đăng nhập
    public static final String[] AUTHENTICATED_APIS = {
            "/api/thong-bao/**"
    };

    // Bác sĩ
    public static final String[] BACSI_APIS = {
            "/api/bac-si/**"
    };
}