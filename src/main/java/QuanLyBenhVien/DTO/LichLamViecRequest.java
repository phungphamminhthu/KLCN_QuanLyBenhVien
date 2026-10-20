
package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalTime;

public record LichLamViecRequest(
        LocalDate ngayLamViec,
        LocalTime gioBatDau,
        LocalTime gioKetThuc,
        Integer maPhong) {
}
