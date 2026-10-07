package QuanLyBenhVien.DTO;

public class CTDonThuocRequest {

    private Integer maThuoc;
    private Integer soLuong;
    private String lieuDung;
    private Integer thoiGianDung;
    private String huongDanSuDung;

    public Integer getMaThuoc() {
        return maThuoc;
    }

    public void setMaThuoc(Integer maThuoc) {
        this.maThuoc = maThuoc;
    }

    public Integer getSoLuong() {
        return soLuong;
    }

    public void setSoLuong(Integer soLuong) {
        this.soLuong = soLuong;
    }

    public String getLieuDung() {
        return lieuDung;
    }

    public void setLieuDung(String lieuDung) {
        this.lieuDung = lieuDung;
    }

    public Integer getThoiGianDung() {
        return thoiGianDung;
    }

    public void setThoiGianDung(Integer thoiGianDung) {
        this.thoiGianDung = thoiGianDung;
    }

    public String getHuongDanSuDung() {
        return huongDanSuDung;
    }

    public void setHuongDanSuDung(String huongDanSuDung) {
        this.huongDanSuDung = huongDanSuDung;
    }
}