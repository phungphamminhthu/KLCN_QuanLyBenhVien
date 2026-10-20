package QuanLyBenhVien.DTO;

import java.math.BigDecimal;

public record HoaDonThanhToanResponse(
        Integer maHoaDon,
        BigDecimal tongTien,
        String loaiHoaDon,
        String trangThai
) {
}