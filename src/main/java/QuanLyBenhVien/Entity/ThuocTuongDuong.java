package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "ThuocTuongDuong")
public class ThuocTuongDuong {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaThuocTuongDuong")
    private Integer maThuocTuongDuong;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "MaThuoc",
            nullable = false
    )
    private Thuoc thuoc;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "MaThuocThayThe",
            nullable = false
    )
    private Thuoc thuocThayThe;


    @Column(name = "GhiChu", length = 255)
    private String ghiChu;


    @Column(name = "TrangThai", length = 50)
    private String trangThai;


    public Integer getMaThuocTuongDuong() {
        return maThuocTuongDuong;
    }

    public void setMaThuocTuongDuong(
            Integer maThuocTuongDuong) {
        this.maThuocTuongDuong =
                maThuocTuongDuong;
    }


    public Thuoc getThuoc() {
        return thuoc;
    }

    public void setThuoc(Thuoc thuoc) {
        this.thuoc = thuoc;
    }


    public Thuoc getThuocThayThe() {
        return thuocThayThe;
    }

    public void setThuocThayThe(
            Thuoc thuocThayThe) {
        this.thuocThayThe =
                thuocThayThe;
    }


    public String getGhiChu() {
        return ghiChu;
    }

    public void setGhiChu(String ghiChu) {
        this.ghiChu = ghiChu;
    }


    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}