package QuanLyBenhVien.Entity;
import jakarta.persistence.*;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "Nguoidung")
public class NguoiDung {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaNguoiDung")
    private Integer MaNguoiDung;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(
            name = "MaVaiTro",
            nullable = false,
            foreignKey = @ForeignKey(name = "FK_Nguoidung_VaiTro")
    )
    private VaiTro VaiTro;

    @Column(name = "TenDangNhap", nullable = false, unique = true)
    private String TenDangNhap;

    @Column(name = "MatKhau", nullable = false)
    private String MatKhau;

    @Column(name = "HoTen", nullable = false)
    private String HoTen;

    @Column(name = "Email", unique = true)
    private String Email;

    @Column(name = "SoDienThoai")
    private String SoDienThoai;

    @Column(name = "AnhDaiDien")
    private String AnhDaiDien;

    @Column(name = "TrangThai", nullable = false)
    private Boolean TrangThai = true;


    public Integer getMaNguoiDung() {
        return MaNguoiDung;
    }

    public void setMaNguoiDung(Integer MaNguoiDung) {
        this.MaNguoiDung = MaNguoiDung;
    }

    public VaiTro getVaiTro() {
        return VaiTro;
    }

    public void setVaiTro(VaiTro VaiTro) {
        this.VaiTro = VaiTro;
    }

    public String getTenDangNhap() {
        return TenDangNhap;
    }

    public void setTenDangNhap(String TenDangNhap) {
        this.TenDangNhap = TenDangNhap;
    }

    public String getMatKhau() {
        return MatKhau;
    }

    public void setMatKhau(String MatKhau) {
        this.MatKhau = MatKhau;
    }

    public String getHoTen() {
        return HoTen;
    }

    public void setHoTen(String HoTen) {
        this.HoTen = HoTen;
    }

    public String getEmail() {
        return Email;
    }

    public void setEmail(String Email) {
        this.Email = Email;
    }

    public String getSoDienThoai() {
        return SoDienThoai;
    }

    public void setSoDienThoai(String SoDienThoai) {
        this.SoDienThoai = SoDienThoai;
    }

    public String getAnhDaiDien() {
        return AnhDaiDien;
    }

    public void setAnhDaiDien(String AnhDaiDien) {
        this.AnhDaiDien = AnhDaiDien;
    }

    public Boolean getTrangThai() {
        return TrangThai;
    }

    public void setTrangThai(Boolean TrangThai) {
        this.TrangThai = TrangThai;
    }
}
