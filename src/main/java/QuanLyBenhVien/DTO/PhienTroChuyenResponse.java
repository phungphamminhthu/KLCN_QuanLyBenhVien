
package QuanLyBenhVien.DTO;

import java.time.LocalDateTime;

public class PhienTroChuyenResponse {

    private Integer maPhien;
    private String tenPhien;
    private LocalDateTime thoiGianBatDau;
    private LocalDateTime thoiGianKetThuc;
    private String trangThai;

    public PhienTroChuyenResponse() {
    }

    public PhienTroChuyenResponse(
            Integer maPhien,
            String tenPhien,
            LocalDateTime thoiGianBatDau,
            LocalDateTime thoiGianKetThuc,
            String trangThai) {

        this.maPhien = maPhien;
        this.tenPhien = tenPhien;
        this.thoiGianBatDau = thoiGianBatDau;
        this.thoiGianKetThuc = thoiGianKetThuc;
        this.trangThai = trangThai;
    }

    public Integer getMaPhien() {
        return maPhien;
    }

    public String getTenPhien() {
        return tenPhien;
    }

    public LocalDateTime getThoiGianBatDau() {
        return thoiGianBatDau;
    }

    public LocalDateTime getThoiGianKetThuc() {
        return thoiGianKetThuc;
    }

    public String getTrangThai() {
        return trangThai;
    }
}
