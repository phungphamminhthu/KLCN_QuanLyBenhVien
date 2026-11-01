package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
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

    public Integer getMaYeuCau() {
        return maYeuCau;
    }

    public void setMaYeuCau(Integer maYeuCau) {
        this.maYeuCau = maYeuCau;
    }

    public LichLamViec getLichLamViec() {
        return lichLamViec;
    }

    public void setLichLamViec(LichLamViec lichLamViec) {
        this.lichLamViec = lichLamViec;
    }

    public BacSi getBacSi() {
        return bacSi;
    }

    public void setBacSi(BacSi bacSi) {
        this.bacSi = bacSi;
    }

    public String getLyDo() {
        return lyDo;
    }

    public void setLyDo(String lyDo) {
        this.lyDo = lyDo;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }

    public LocalDateTime getNgayTao() {
        return ngayTao;
    }

    public void setNgayTao(LocalDateTime ngayTao) {
        this.ngayTao = ngayTao;
    }

    public LocalDateTime getNgayXuLy() {
        return ngayXuLy;
    }

    public void setNgayXuLy(LocalDateTime ngayXuLy) {
        this.ngayXuLy = ngayXuLy;
    }

    public Integer getMaNguoiXuLy() {
        return maNguoiXuLy;
    }

    public void setMaNguoiXuLy(Integer maNguoiXuLy) {
        this.maNguoiXuLy = maNguoiXuLy;
    }
}