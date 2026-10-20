package QuanLyBenhVien.DTO;

import java.math.BigDecimal;

public record ThongTinQRResponse(
        Integer maHoaDon,
        BigDecimal soTien,
        String noiDungChuyenKhoan,
        String nganHang,
        String soTaiKhoan,
        String tenTaiKhoan,
        String qrUrl,
        String trangThai
) {
}