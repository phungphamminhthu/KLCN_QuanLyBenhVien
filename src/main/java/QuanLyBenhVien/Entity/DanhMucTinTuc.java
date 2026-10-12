package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "DanhMucTinTuc")

public class DanhMucTinTuc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaDanhMuc")
    private Integer maDanhMuc;

    @Column(
            name = "TenDanhMuc",
            nullable = false,
            length = 100
    )
    private String tenDanhMuc;

    @Column(
            name = "MoTa",
            length = 255
    )
    private String moTa;

    public Integer getMaDanhMuc() {
        return maDanhMuc;
    }

    public void setMaDanhMuc(Integer maDanhMuc) {
        this.maDanhMuc = maDanhMuc;
    }

    public String getTenDanhMuc() {
        return tenDanhMuc;
    }

    public void setTenDanhMuc(String tenDanhMuc) {
        this.tenDanhMuc = tenDanhMuc;
    }

    public String getMoTa() {
        return moTa;
    }

    public void setMoTa(String moTa) {
        this.moTa = moTa;
    }
}
