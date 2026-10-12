
package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "Thuoc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Thuoc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaThuoc")
    private Integer maThuoc;

    @Column(name = "TenThuoc", nullable = false, length = 255)
    private String tenThuoc;

    @Column(name = "DonViTinh", length = 50)
    private String donViTinh;

    @Column(name = "NhaSanXuat", length = 255)
    private String nhaSanXuat;

    @Column(name = "Gia", nullable = false, precision = 15, scale = 2)
    private BigDecimal gia = BigDecimal.ZERO;

    @Column(name = "MoTa", length = 255)
    private String moTa;

    @Column(name = "TrangThai", nullable = false)
    private Boolean trangThai = true;
}
