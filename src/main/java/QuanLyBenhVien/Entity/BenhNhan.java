package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(
        name = "BenhNhan",
        indexes = {
                @Index(name = "idx_benhnhan_manguoidung", columnList = "MaNguoiDung")
        }
)
public class BenhNhan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaBenhNhan")
    private Integer maBenhNhan;

    // Một tài khoản có thể quản lý nhiều hồ sơ bệnh nhân
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "MaNguoiDung",
            nullable = false,
            foreignKey = @ForeignKey(name = "FK_BenhNhan_NguoiDung")
    )
    private NguoiDung nguoiDung;

    @Column(name = "HoTen", nullable = false, length = 255)
    private String hoTen;

    @Column(name = "MoiQuanHe", nullable = false, length = 50)
    private String moiQuanHe = "BanThan";

    @Column(name = "LaHoSoMacDinh", nullable = false)
    private Boolean laHoSoMacDinh = false;

    @Column(name = "NgaySinh")
    private LocalDate ngaySinh;

    @Column(name = "GioiTinh", length = 10)
    private String gioiTinh;

    @Column(name = "DiaChi", length = 255)
    private String diaChi;

    @Column(name = "SoDienThoaiKhanCap", length = 15)
    private String soDienThoaiKhanCap;

    @Column(name = "TienSuBenh", columnDefinition = "TEXT")
    private String tienSuBenh;

    public Integer getMaBenhNhan() {
        return maBenhNhan;
    }

    public void setMaBenhNhan(Integer maBenhNhan) {
        this.maBenhNhan = maBenhNhan;
    }

    public NguoiDung getNguoiDung() {
        return nguoiDung;
    }

    public void setNguoiDung(NguoiDung nguoiDung) {
        this.nguoiDung = nguoiDung;
    }

    public String getHoTen() {
        return hoTen;
    }

    public void setHoTen(String hoTen) {
        this.hoTen = hoTen;
    }

    public String getMoiQuanHe() {
        return moiQuanHe;
    }

    public void setMoiQuanHe(String moiQuanHe) {
        this.moiQuanHe = moiQuanHe;
    }

    public Boolean getLaHoSoMacDinh() {
        return laHoSoMacDinh;
    }

    public void setLaHoSoMacDinh(Boolean laHoSoMacDinh) {
        this.laHoSoMacDinh = laHoSoMacDinh;
    }

    public LocalDate getNgaySinh() {
        return ngaySinh;
    }

    public void setNgaySinh(LocalDate ngaySinh) {
        this.ngaySinh = ngaySinh;
    }

    public String getGioiTinh() {
        return gioiTinh;
    }

    public void setGioiTinh(String gioiTinh) {
        this.gioiTinh = gioiTinh;
    }

    public String getDiaChi() {
        return diaChi;
    }

    public void setDiaChi(String diaChi) {
        this.diaChi = diaChi;
    }

    public String getSoDienThoaiKhanCap() {
        return soDienThoaiKhanCap;
    }

    public void setSoDienThoaiKhanCap(String soDienThoaiKhanCap) {
        this.soDienThoaiKhanCap = soDienThoaiKhanCap;
    }

    public String getTienSuBenh() {
        return tienSuBenh;
    }

    public void setTienSuBenh(String tienSuBenh) {
        this.tienSuBenh = tienSuBenh;
    }
}