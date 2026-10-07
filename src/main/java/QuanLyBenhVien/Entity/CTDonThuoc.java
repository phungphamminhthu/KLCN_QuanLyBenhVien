package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "CTDonThuoc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CTDonThuoc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaCTDonThuoc")
    private Integer maCTDonThuoc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaDonThuoc", nullable = false)
    private DonThuoc donThuoc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaThuoc", nullable = false)
    private Thuoc thuoc;

    @Column(name = "DonGiaBan", nullable = false, precision = 15, scale = 2)
    private BigDecimal donGiaBan;

    @Column(name = "SoLuong", nullable = false)
    private Integer soLuong;

    @Column(name = "LieuDung", length = 255)
    private String lieuDung;

    @Column(name = "ThoiGianDung")
    private Integer thoiGianDung;

    @Column(name = "HuongDanSuDung", length = 500)
    private String huongDanSuDung;
}