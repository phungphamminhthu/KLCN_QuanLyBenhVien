package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "KetQuaDichVu")
public class KetQuaDichVu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaKetQua")
    private Integer maKetQua;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "MaChiDinh",
            nullable = false,
            unique = true
    )
    private ChiDinhYTe chiDinhYTe;

    @Column(name = "NgayCoKetQua")
    private LocalDateTime ngayCoKetQua;

    @Column(name = "NoiDungKetQua", columnDefinition = "TEXT")
    private String noiDungKetQua;

    @Column(name = "KetLuan", columnDefinition = "TEXT")
    private String ketLuan;

    @Column(name = "FileURL", length = 500)
    private String fileURL;

    @Column(name = "TrangThai", length = 50)
    private String trangThai;

    public KetQuaDichVu() {
    }

    public Integer getMaKetQua() {
        return maKetQua;
    }

    public void setMaKetQua(Integer maKetQua) {
        this.maKetQua = maKetQua;
    }

    public ChiDinhYTe getChiDinhYTe() {
        return chiDinhYTe;
    }

    public void setChiDinhYTe(ChiDinhYTe chiDinhYTe) {
        this.chiDinhYTe = chiDinhYTe;
    }

    public LocalDateTime getNgayCoKetQua() {
        return ngayCoKetQua;
    }

    public void setNgayCoKetQua(LocalDateTime ngayCoKetQua) {
        this.ngayCoKetQua = ngayCoKetQua;
    }

    public String getNoiDungKetQua() {
        return noiDungKetQua;
    }

    public void setNoiDungKetQua(String noiDungKetQua) {
        this.noiDungKetQua = noiDungKetQua;
    }

    public String getKetLuan() {
        return ketLuan;
    }

    public void setKetLuan(String ketLuan) {
        this.ketLuan = ketLuan;
    }

    public String getFileURL() {
        return fileURL;
    }

    public void setFileURL(String fileURL) {
        this.fileURL = fileURL;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}