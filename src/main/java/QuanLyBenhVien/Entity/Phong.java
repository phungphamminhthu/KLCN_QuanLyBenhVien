package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "PhongChuyenTrach")
public class Phong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaPhong")
    private Integer maPhong;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(
            name = "MaKhoa",
            nullable = false
    )
    private Khoa khoa;

    @Column(
            name = "TenPhong",
            nullable = false,
            length = 100
    )
    private String tenPhong;

    @Column(
            name = "LoaiPhong",
            length = 100
    )
    private String loaiPhong;

    @Column(
            name = "ViTri",
            length = 255
    )
    private String viTri;

    @Column(
            name = "TrangThai",
            nullable = false
    )
    private Boolean trangThai = true;


    // =========================
    // GETTER / SETTER
    // =========================

    public Integer getMaPhong() {
        return maPhong;
    }

    public void setMaPhong(Integer maPhong) {
        this.maPhong = maPhong;
    }

    public Khoa getKhoa() {
        return khoa;
    }

    public void setKhoa(Khoa khoa) {
        this.khoa = khoa;
    }

    public String getTenPhong() {
        return tenPhong;
    }

    public void setTenPhong(String tenPhong) {
        this.tenPhong = tenPhong;
    }

    public String getLoaiPhong() {
        return loaiPhong;
    }

    public void setLoaiPhong(String loaiPhong) {
        this.loaiPhong = loaiPhong;
    }

    public String getViTri() {
        return viTri;
    }

    public void setViTri(String viTri) {
        this.viTri = viTri;
    }

    public Boolean getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(Boolean trangThai) {
        this.trangThai = trangThai;
    }
}
