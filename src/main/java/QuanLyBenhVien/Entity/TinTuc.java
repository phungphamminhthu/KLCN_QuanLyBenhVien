package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "TinTuc")
public class TinTuc {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaTinTuc")
    private Integer maTinTuc;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(
            name = "MaDanhMuc",
            nullable = false
    )
    private DanhMucTinTuc danhMuc;


    @Column(
            name = "TieuDe",
            nullable = false,
            length = 255
    )
    private String tieuDe;


    @Column(
            name = "NoiDung",
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String noiDung;


    @Column(
            name = "ImageURL",
            length = 500
    )
    private String imageURL;


    @Column(
            name = "NgayDang",
            nullable = false
    )
    private LocalDateTime ngayDang;


    @Column(
            name = "TrangThai",
            length = 50
    )
    private String trangThai;


    @PrePersist
    public void prePersist() {

        if (ngayDang == null) {

            ngayDang =
                    LocalDateTime.now();

        }

        if (trangThai == null
                || trangThai.isBlank()) {

            trangThai =
                    "Đang hiển thị";

        }

    }


    public Integer getMaTinTuc() {
        return maTinTuc;
    }

    public void setMaTinTuc(Integer maTinTuc) {
        this.maTinTuc = maTinTuc;
    }


    public DanhMucTinTuc getDanhMuc() {
        return danhMuc;
    }

    public void setDanhMuc(DanhMucTinTuc danhMuc) {
        this.danhMuc = danhMuc;
    }


    public String getTieuDe() {
        return tieuDe;
    }

    public void setTieuDe(String tieuDe) {
        this.tieuDe = tieuDe;
    }


    public String getNoiDung() {
        return noiDung;
    }

    public void setNoiDung(String noiDung) {
        this.noiDung = noiDung;
    }


    public String getImageURL() {
        return imageURL;
    }

    public void setImageURL(String imageURL) {
        this.imageURL = imageURL;
    }


    public LocalDateTime getNgayDang() {
        return ngayDang;
    }

    public void setNgayDang(LocalDateTime ngayDang) {
        this.ngayDang = ngayDang;
    }


    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}
