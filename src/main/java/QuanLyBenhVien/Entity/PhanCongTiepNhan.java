
package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "phancongtiepnhan")
public class PhanCongTiepNhan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaPhanCong")
    private Integer maPhanCong;

    @Column(name = "MaNhanVienTiepNhan", nullable = false)
    private Integer maNhanVienTiepNhan;

    @Column(name = "MaKhoa", nullable = false)
    private Integer maKhoa;

    @Column(name = "MaNguoiPhanCong", nullable = false)
    private Integer maNguoiPhanCong;

    @Column(name = "ThoiGianBatDau", nullable = false)
    private LocalDateTime thoiGianBatDau;

    @Column(name = "ThoiGianKetThuc", nullable = false)
    private LocalDateTime thoiGianKetThuc;

    @Column(name = "TrangThai", nullable = false)
    private Byte trangThai = (byte) 1;

    @Column(name = "NgayTao", insertable = false, updatable = false)
    private LocalDateTime ngayTao;

    public PhanCongTiepNhan() {
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

    public Integer getMaKhoa() {
        return maKhoa;
    }

    public void setMaKhoa(Integer maKhoa) {
        this.maKhoa = maKhoa;
    }

    public Integer getMaNguoiPhanCong() {
        return maNguoiPhanCong;
    }

    public void setMaNguoiPhanCong(Integer maNguoiPhanCong) {
        this.maNguoiPhanCong = maNguoiPhanCong;
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
