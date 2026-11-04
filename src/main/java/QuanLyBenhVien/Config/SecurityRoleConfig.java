package QuanLyBenhVien.Config;

public final class SecurityRoleConfig {

    // ==============================================
    // nhóm api theo vai trò
    // ==============================================
    private SecurityRoleConfig() {
        //SecurityRoleConfig liệt kê API nào thuộc role
    }

    // Admin
    // Admin
    public static final String[] ADMIN_APIS = {
            "/api/thong-ke-bao-cao",
            "/api/thong-ke-bao-cao/**",
            "/api/phan-quyen/**",
            "/api/phan-cong-tiep-nhan",
            "/api/phan-cong-tiep-nhan/**",

            // Quản lý lịch làm việc
            "/api/admin/lich-lam-viec",
            "/api/admin/lich-lam-viec/**",

            // Quản lý yêu cầu điều chỉnh / hủy lịch
            "/api/admin/yeu-cau-dieu-chinh-lich",
            "/api/admin/yeu-cau-dieu-chinh-lich/**",

            // Điều phối lịch khám (nếu endpoint thuộc nhóm này)
            "/api/admin/lich-kham/**",

            // Quản lý bác sĩ - dùng cho dropdown điều phối
            "/api/admin/bac-si",
            "/api/admin/bac-si/**",
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

    public static final String[] THONG_BAO_APIS = {
            "/api/thong-bao",
            "/api/thong-bao/**"
    };
}