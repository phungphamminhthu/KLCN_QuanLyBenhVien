package QuanLyBenhVien.Entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "BenhNhan")
public class BenhNhan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaBenhNhan")
    private Integer maBenhNhan;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaNguoiDung", nullable = false, unique = true)
    private NguoiDung nguoiDung;

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