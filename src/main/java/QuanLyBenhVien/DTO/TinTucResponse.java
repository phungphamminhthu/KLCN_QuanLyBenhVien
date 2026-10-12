package QuanLyBenhVien.DTO;

import java.time.LocalDateTime;

public class TinTucResponse {

    private Integer maTinTuc;

    private Integer maDanhMuc;

    private String tenDanhMuc;

    private String tieuDe;

    private String noiDung;

    private String imageURL;

    private LocalDateTime ngayDang;

    private String trangThai;


    public Integer getMaTinTuc() {
        return maTinTuc;
    }

    public void setMaTinTuc(Integer maTinTuc) {
        this.maTinTuc = maTinTuc;
    }


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
