package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "CTThanhToan")
@IdClass(CTThanhToanId.class)
public class CTThanhToan {

    @Id
    @Column(name = "MaThanhToan")
    private Integer maThanhToan;

    @Id
    @Column(name = "MaCTHoaDon")
    private Integer maCTHoaDon;

    public Integer getMaThanhToan() { return maThanhToan; }
    public void setMaThanhToan(Integer maThanhToan) {
        this.maThanhToan = maThanhToan;
    }

    public Integer getMaCTHoaDon() { return maCTHoaDon; }
    public void setMaCTHoaDon(Integer maCTHoaDon) {
        this.maCTHoaDon = maCTHoaDon;
    }
}