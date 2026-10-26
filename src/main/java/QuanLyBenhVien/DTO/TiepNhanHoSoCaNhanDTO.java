package QuanLyBenhVien.DTO;

/**
 * Thông tin hồ sơ cá nhân trả về cho giao diện.
 * Không chứa mật khẩu của tài khoản.
 */
public record TiepNhanHoSoCaNhanDTO(
        Integer maNguoiDung,
        String tenDangNhap,
        String hoTen,
        String email,
        String soDienThoai,
        String anhDaiDien
) {

    /**
     * Các thông tin nhân viên được phép chỉnh sửa.
     * Backend xác định tài khoản từ người đang đăng nhập.
     */
    public record CapNhatRequest(
            String hoTen,
            String email,
            String soDienThoai
    ) {
    }
}