package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "AnhKetQuaDichVu")
public class AnhKetQuaDichVu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaAnh")
    private Integer maAnh;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaKetQua", nullable = false)
    private KetQuaDichVu ketQuaDichVu;

    @Column(name = "FileURL", nullable = false, length = 500)
    private String fileURL;

    @Column(name = "TenFile", length = 255)
    private String tenFile;

    @Column(name = "NgayTao", nullable = false)
    private LocalDateTime ngayTao = LocalDateTime.now();

    public Integer getMaAnh() {
        return maAnh;
    }

    public void setMaAnh(Integer maAnh) {
        this.maAnh = maAnh;
    }

    public KetQuaDichVu getKetQuaDichVu() {
        return ketQuaDichVu;
    }

    public void setKetQuaDichVu(KetQuaDichVu ketQuaDichVu) {
        this.ketQuaDichVu = ketQuaDichVu;
    }

    public String getFileURL() {
        return fileURL;
    }

    public void setFileURL(String fileURL) {
        this.fileURL = fileURL;
    }

    public String getTenFile() {
        return tenFile;
    }

    public void setTenFile(String tenFile) {
        this.tenFile = tenFile;
    }

    public LocalDateTime getNgayTao() {
        return ngayTao;
    }

    public void setNgayTao(LocalDateTime ngayTao) {
        this.ngayTao = ngayTao;
    }
}