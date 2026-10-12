package QuanLyBenhVien.Entity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "DonThuoc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DonThuoc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaDonThuoc")
    private Integer maDonThuoc;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaHoSoBenhAn", nullable = false)
    private HoSoBenhAn hoSoBenhAn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "MaBacSi", nullable = false)
    private BacSi bacSi;

    @Column(name = "NgayKeThuoc", nullable = false)
    private LocalDateTime ngayKeThuoc;

    @Column(name = "ChanDoan", columnDefinition = "TEXT")
    private String chanDoan;

    @Column(name = "GhiChu", length = 255)
    private String ghiChu;

    @Column(name = "TrangThai", length = 50)
    private String trangThai;
}