
package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record LichKhamCuaToiResponse(
        Integer maLichKham,
        Integer maSoThuTu,
        Integer soThuTu,
        LocalDate ngayKham,
        LocalTime gioKham,
        String tenKhoa,
        String tenBacSi,
        String tenPhong,
        String lyDoKham,
        String trangThaiLichKham,
        String trangThaiSoThuTu,
        BigDecimal tongChiPhi,
        BigDecimal tongDaThanhToan,
        BigDecimal soTienConLai
) {}
