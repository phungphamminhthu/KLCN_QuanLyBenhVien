
package QuanLyBenhVien.DTO;

import java.time.LocalDateTime;

public class PhanCongTiepNhanResponse {

    private Integer maPhanCong;

    private Integer maNhanVienTiepNhan;
    private String tenNhanVien;

    private Integer maKhoa;
    private String tenKhoa;

    private Integer maNguoiPhanCong;
    private String tenNguoiPhanCong;

    private LocalDateTime thoiGianBatDau;
    private LocalDateTime thoiGianKetThuc;

    private Byte trangThai;
    private LocalDateTime ngayTao;

    public PhanCongTiepNhanResponse() {
    }

    public PhanCongTiepNhanResponse(
            Integer maPhanCong,
            Integer maNhanVienTiepNhan,
            String tenNhanVien,
            Integer maKhoa,
            String tenKhoa,
            Integer maNguoiPhanCong,
            String tenNguoiPhanCong,
            LocalDateTime thoiGianBatDau,
            LocalDateTime thoiGianKetThuc,
            Byte trangThai,
            LocalDateTime ngayTao) {

        this.maPhanCong = maPhanCong;
        this.maNhanVienTiepNhan = maNhanVienTiepNhan;
        this.tenNhanVien = tenNhanVien;
        this.maKhoa = maKhoa;
        this.tenKhoa = tenKhoa;
        this.maNguoiPhanCong = maNguoiPhanCong;
        this.tenNguoiPhanCong = tenNguoiPhanCong;
        this.thoiGianBatDau = thoiGianBatDau;
        this.thoiGianKetThuc = thoiGianKetThuc;
        this.trangThai = trangThai;
        this.ngayTao = ngayTao;
    }

    public Integer getMaPhanCong() {
        return maPhanCong;
    }

    public void setMaPhanCong(Integer maPhanCong) {
        this.maPhanCong = maPhanCong;
    }

    public Integer getMaNhanVienTiepNhan() {
        return maNhanVienTiepNhan;
    }

    public void setMaNhanVienTiepNhan(Integer maNhanVienTiepNhan) {
        this.maNhanVienTiepNhan = maNhanVienTiepNhan;
    }

    public String getTenNhanVien() {
        return tenNhanVien;
    }

    public void setTenNhanVien(String tenNhanVien) {
        this.tenNhanVien = tenNhanVien;
    }

    public Integer getMaKhoa() {
        return maKhoa;
    }

    public void setMaKhoa(Integer maKhoa) {
        this.maKhoa = maKhoa;
    }

    public String getTenKhoa() {
        return tenKhoa;
    }

    public void setTenKhoa(String tenKhoa) {
        this.tenKhoa = tenKhoa;
    }

    public Integer getMaNguoiPhanCong() {
        return maNguoiPhanCong;
    }

    public void setMaNguoiPhanCong(Integer maNguoiPhanCong) {
        this.maNguoiPhanCong = maNguoiPhanCong;
    }

    public String getTenNguoiPhanCong() {
        return tenNguoiPhanCong;
    }

    public void setTenNguoiPhanCong(String tenNguoiPhanCong) {
        this.tenNguoiPhanCong = tenNguoiPhanCong;
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

    public Byte getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(Byte trangThai) {
        this.trangThai = trangThai;
    }

    public LocalDateTime getNgayTao() {
        return ngayTao;
    }

    public void setNgayTao(LocalDateTime ngayTao) {
        this.ngayTao = ngayTao;
    }
}
