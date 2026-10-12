package QuanLyBenhVien.DTO;

import java.util.List;

public class DonThuocRequest {

    private String chanDoan;
    private String ghiChu;
    private List<CTDonThuocRequest> danhSachThuoc;

    public String getChanDoan() {
        return chanDoan;
    }

    public void setChanDoan(String chanDoan) {
        this.chanDoan = chanDoan;
    }

    public String getGhiChu() {
        return ghiChu;
    }

    public void setGhiChu(String ghiChu) {
        this.ghiChu = ghiChu;
    }

    public List<CTDonThuocRequest> getDanhSachThuoc() {
        return danhSachThuoc;
    }

    public void setDanhSachThuoc(List<CTDonThuocRequest> danhSachThuoc) {
        this.danhSachThuoc = danhSachThuoc;
    }
}