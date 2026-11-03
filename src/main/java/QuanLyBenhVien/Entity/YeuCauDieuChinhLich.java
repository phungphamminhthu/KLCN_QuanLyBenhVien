package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "YeuCauDieuChinhLich")
public class YeuCauDieuChinhLich {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaYeuCau")
    private Integer maYeuCau;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaLichLamViec", nullable = false)
    private LichLamViec lichLamViec;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaBacSi", nullable = false)
    private BacSi bacSi;

    @Column(name = "LoaiYeuCau", nullable = false, length = 30)
    private String loaiYeuCau;

    @Column(name = "LyDo", nullable = false, length = 500)
    private String lyDo;

    @Column(name = "TrangThai", nullable = false, length = 30)
    private String trangThai = "CHO_XU_LY";

    @Column(name = "NgayTao", nullable = false)
    private LocalDateTime ngayTao = LocalDateTime.now();

    @Column(name = "NgayXuLy")
    private LocalDateTime ngayXuLy;

    @Column(name = "MaNguoiXuLy")
    private Integer maNguoiXuLy;

    @Column(name = "NgayLamViecMoi")
    private LocalDate ngayLamViecMoi;

    @Column(name = "GioBatDauMoi")
    private LocalTime gioBatDauMoi;

    @Column(name = "GioKetThucMoi")
    private LocalTime gioKetThucMoi;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaPhongMoi")
    private PhongChuyenTrach phongMoi;

    @Column(name = "NoiDungDieuPhoi", length = 500)
    private String noiDungDieuPhoi;

    @Column(name = "GhiChuXuLy", length = 500)
    private String ghiChuXuLy;

    public Integer getMaYeuCau() { return maYeuCau; }
    public LichLamViec getLichLamViec() { return lichLamViec; }
    public void setLichLamViec(LichLamViec lichLamViec) { this.lichLamViec = lichLamViec; }

    public BacSi getBacSi() { return bacSi; }
    public void setBacSi(BacSi bacSi) { this.bacSi = bacSi; }

    public String getLoaiYeuCau() { return loaiYeuCau; }
    public void setLoaiYeuCau(String loaiYeuCau) { this.loaiYeuCau = loaiYeuCau; }

    public String getLyDo() { return lyDo; }
    public void setLyDo(String lyDo) { this.lyDo = lyDo; }

    public String getTrangThai() { return trangThai; }
    public void setTrangThai(String trangThai) { this.trangThai = trangThai; }

    public LocalDateTime getNgayTao() { return ngayTao; }
    public LocalDateTime getNgayXuLy() { return ngayXuLy; }
    public void setNgayXuLy(LocalDateTime ngayXuLy) { this.ngayXuLy = ngayXuLy; }

    public Integer getMaNguoiXuLy() { return maNguoiXuLy; }
    public void setMaNguoiXuLy(Integer maNguoiXuLy) { this.maNguoiXuLy = maNguoiXuLy; }

    public LocalDate getNgayLamViecMoi() { return ngayLamViecMoi; }
    public void setNgayLamViecMoi(LocalDate ngayLamViecMoi) { this.ngayLamViecMoi = ngayLamViecMoi; }

    public LocalTime getGioBatDauMoi() { return gioBatDauMoi; }
    public void setGioBatDauMoi(LocalTime gioBatDauMoi) { this.gioBatDauMoi = gioBatDauMoi; }

    public LocalTime getGioKetThucMoi() { return gioKetThucMoi; }
    public void setGioKetThucMoi(LocalTime gioKetThucMoi) { this.gioKetThucMoi = gioKetThucMoi; }

    public PhongChuyenTrach getPhongMoi() { return phongMoi; }
    public void setPhongMoi(PhongChuyenTrach phongMoi) { this.phongMoi = phongMoi; }

    public String getNoiDungDieuPhoi() { return noiDungDieuPhoi; }
    public void setNoiDungDieuPhoi(String noiDungDieuPhoi) { this.noiDungDieuPhoi = noiDungDieuPhoi; }

    public String getGhiChuXuLy() { return ghiChuXuLy; }
    public void setGhiChuXuLy(String ghiChuXuLy) { this.ghiChuXuLy = ghiChuXuLy; }
}