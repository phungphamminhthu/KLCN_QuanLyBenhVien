package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ChiDinhYTe")
public class ChiDinhYTe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaChiDinh")
    private Integer maChiDinh;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaHoSoBenhAn", nullable = false)
    private HoSoBenhAn hoSoBenhAn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaDichVu", nullable = false)
    private DichVuYTe dichVuYTe;

    @Column(name = "MaPhong")
    private Integer maPhong;

    @Column(name = "NgayChiDinh", nullable = false)
    private LocalDateTime ngayChiDinh;

    @Column(name = "LoaiChiDinh", length = 100)
    private String loaiChiDinh;

    @Column(name = "TrangThai", length = 50)
    private String trangThai;

    public ChiDinhYTe() {
    }

    @PrePersist
    public void prePersist() {
        if (ngayChiDinh == null) {
            ngayChiDinh = LocalDateTime.now();
        }

        if (trangThai == null || trangThai.isBlank()) {
            trangThai = "ChoThucHien";
        }
    }

    public Integer getMaChiDinh() {
        return maChiDinh;
    }

    public void setMaChiDinh(Integer maChiDinh) {
        this.maChiDinh = maChiDinh;
    }

    public HoSoBenhAn getHoSoBenhAn() {
        return hoSoBenhAn;
    }

    public void setHoSoBenhAn(HoSoBenhAn hoSoBenhAn) {
        this.hoSoBenhAn = hoSoBenhAn;
    }

    public DichVuYTe getDichVuYTe() {
        return dichVuYTe;
    }

    public void setDichVuYTe(DichVuYTe dichVuYTe) {
        this.dichVuYTe = dichVuYTe;
    }

    public Integer getMaPhong() {
        return maPhong;
    }

    public void setMaPhong(Integer maPhong) {
        this.maPhong = maPhong;
    }

    public LocalDateTime getNgayChiDinh() {
        return ngayChiDinh;
    }

    public void setNgayChiDinh(LocalDateTime ngayChiDinh) {
        this.ngayChiDinh = ngayChiDinh;
    }

    public String getLoaiChiDinh() {
        return loaiChiDinh;
    }

    public void setLoaiChiDinh(String loaiChiDinh) {
        this.loaiChiDinh = loaiChiDinh;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}