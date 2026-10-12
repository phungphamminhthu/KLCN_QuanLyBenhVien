package QuanLyBenhVien.DTO;

public class ThuocTuongDuongResponse {

    private Integer maThuocTuongDuong;

    private Integer maThuoc;

    private String tenThuoc;

    private Integer maThuocThayThe;

    private String tenThuocThayThe;

    private String ghiChu;

    private String trangThai;


    // =====================================================
    // GETTER / SETTER
    // =====================================================

    public Integer getMaThuocTuongDuong() {
        return maThuocTuongDuong;
    }

    public void setMaThuocTuongDuong(
            Integer maThuocTuongDuong) {

        this.maThuocTuongDuong =
                maThuocTuongDuong;
    }


    public Integer getMaThuoc() {
        return maThuoc;
    }

    public void setMaThuoc(Integer maThuoc) {

        this.maThuoc = maThuoc;
    }


    public String getTenThuoc() {
        return tenThuoc;
    }

    public void setTenThuoc(String tenThuoc) {

        this.tenThuoc = tenThuoc;
    }


    public Integer getMaThuocThayThe() {
        return maThuocThayThe;
    }

    public void setMaThuocThayThe(
            Integer maThuocThayThe) {

        this.maThuocThayThe =
                maThuocThayThe;
    }


    public String getTenThuocThayThe() {
        return tenThuocThayThe;
    }

    public void setTenThuocThayThe(
            String tenThuocThayThe) {

        this.tenThuocThayThe =
                tenThuocThayThe;
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