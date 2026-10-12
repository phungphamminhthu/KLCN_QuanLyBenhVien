package QuanLyBenhVien.DTO;

public class ThuocTuongDuongRequest {

    private Integer maThuoc;

    private Integer maThuocThayThe;

    private String ghiChu;

    private String trangThai;


    public Integer getMaThuoc() {
        return maThuoc;
    }

    public void setMaThuoc(Integer maThuoc) {
        this.maThuoc = maThuoc;
    }


    public Integer getMaThuocThayThe() {
        return maThuocThayThe;
    }

    public void setMaThuocThayThe(
            Integer maThuocThayThe) {

        this.maThuocThayThe =
                maThuocThayThe;
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