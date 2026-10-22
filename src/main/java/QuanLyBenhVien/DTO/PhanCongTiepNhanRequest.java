
package QuanLyBenhVien.DTO;

import java.time.LocalDateTime;

public class PhanCongTiepNhanRequest {

    private Integer maNhanVienTiepNhan;
    private Integer maKhoa;
    private LocalDateTime thoiGianBatDau;
    private LocalDateTime thoiGianKetThuc;

    public PhanCongTiepNhanRequest() {
    }

    public Integer getMaNhanVienTiepNhan() {
        return maNhanVienTiepNhan;
    }

    public void setMaNhanVienTiepNhan(Integer maNhanVienTiepNhan) {
        this.maNhanVienTiepNhan = maNhanVienTiepNhan;
    }

    public Integer getMaKhoa() {
        return maKhoa;
    }

    public void setMaKhoa(Integer maKhoa) {
        this.maKhoa = maKhoa;
    }

    public LocalDateTime getThoiGianBatDau() {
        return thoiGianBatDau;
    }

    public void setThoiGianBatDau(LocalDateTime thoiGianBatDau) {
        this.thoiGianBatDau = thoiGianBatDau;
    }

    public LocalDateTime getThoiGianKetThuc() {
        return thoiGianKetThuc;
    }

    public void setThoiGianKetThuc(LocalDateTime thoiGianKetThuc) {
        this.thoiGianKetThuc = thoiGianKetThuc;
    }
}
