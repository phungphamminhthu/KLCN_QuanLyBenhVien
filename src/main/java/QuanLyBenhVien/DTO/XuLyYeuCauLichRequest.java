package QuanLyBenhVien.DTO;

public class XuLyYeuCauLichRequest {

    private String ghiChuXuLy;

    // Chỉ cần khi Admin duyệt điều phối sang bác sĩ khác
    private Integer maBacSiMoi;

    public String getGhiChuXuLy() { return ghiChuXuLy; }
    public void setGhiChuXuLy(String ghiChuXuLy) { this.ghiChuXuLy = ghiChuXuLy; }

    public Integer getMaBacSiMoi() { return maBacSiMoi; }
    public void setMaBacSiMoi(Integer maBacSiMoi) { this.maBacSiMoi = maBacSiMoi; }
}