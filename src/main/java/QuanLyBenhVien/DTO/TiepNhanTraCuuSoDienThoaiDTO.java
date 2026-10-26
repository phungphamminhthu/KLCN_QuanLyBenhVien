package QuanLyBenhVien.DTO;

import java.time.LocalDate;

/**
 * Thông tin bệnh nhân hiển thị trong danh sách gợi ý
 * khi nhân viên tiếp nhận nhập số điện thoại.
 */
public record TiepNhanTraCuuSoDienThoaiDTO(
        Integer maBenhNhan,
        String hoTen,
        LocalDate ngaySinh,
        String gioiTinh,
        String soDienThoai
) {
}