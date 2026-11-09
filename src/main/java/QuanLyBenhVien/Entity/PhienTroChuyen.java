
package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "phientrochuyen")
public class PhienTroChuyen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaPhien")
    private Integer maPhien;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "MaNguoiDung",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "FK_PhienTroChuyen_Nguoidung"
            )
    )
    private NguoiDung nguoiDung;

    @Column(name = "ThoiGianBatDau", nullable = false)
    private LocalDateTime thoiGianBatDau;

    @Column(name = "ThoiGianKetThuc")
    private LocalDateTime thoiGianKetThuc;

    @Column(name = "TrangThai", length = 50)
    private String trangThai;

    @OneToMany(
            mappedBy = "phienTroChuyen",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<TinNhan> danhSachTinNhan = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (thoiGianBatDau == null) {
            thoiGianBatDau = LocalDateTime.now();
        }

        if (trangThai == null) {
            trangThai = "DANG_HOAT_DONG";
        }
    }

    public Integer getMaPhien() {
        return maPhien;
    }

    public void setMaPhien(Integer maPhien) {
        this.maPhien = maPhien;
    }

    public NguoiDung getNguoiDung() {
        return nguoiDung;
    }

    public void setNguoiDung(NguoiDung nguoiDung) {
        this.nguoiDung = nguoiDung;
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

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }

    public List<TinNhan> getDanhSachTinNhan() {
        return danhSachTinNhan;
    }

    public void setDanhSachTinNhan(List<TinNhan> danhSachTinNhan) {
        this.danhSachTinNhan = danhSachTinNhan;
    }
}
