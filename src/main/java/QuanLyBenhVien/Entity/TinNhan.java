
package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tinnhan")
public class TinNhan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaTinNhan")
    private Integer maTinNhan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "MaPhien",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "FK_TinNhan_Phien"
            )
    )
    private PhienTroChuyen phienTroChuyen;

    @Column(name = "NoiDung", nullable = false, columnDefinition = "TEXT")
    private String noiDung;

    @Column(name = "NguoiGui", nullable = false, length = 20)
    private String nguoiGui;

    @Column(name = "ThoiGianTao", nullable = false)
    private LocalDateTime thoiGianTao;

    @PrePersist
    protected void onCreate() {
        if (thoiGianTao == null) {
            thoiGianTao = LocalDateTime.now();
        }
    }

    public Integer getMaTinNhan() {
        return maTinNhan;
    }

    public void setMaTinNhan(Integer maTinNhan) {
        this.maTinNhan = maTinNhan;
    }

    public PhienTroChuyen getPhienTroChuyen() {
        return phienTroChuyen;
    }

    public void setPhienTroChuyen(PhienTroChuyen phienTroChuyen) {
        this.phienTroChuyen = phienTroChuyen;
    }

    public String getNoiDung() {
        return noiDung;
    }

    public void setNoiDung(String noiDung) {
        this.noiDung = noiDung;
    }

    public String getNguoiGui() {
        return nguoiGui;
    }

    public void setNguoiGui(String nguoiGui) {
        this.nguoiGui = nguoiGui;
    }

    public LocalDateTime getThoiGianTao() {
        return thoiGianTao;
    }

    public void setThoiGianTao(LocalDateTime thoiGianTao) {
        this.thoiGianTao = thoiGianTao;
    }
}
