package QuanLyBenhVien.DTO;

import java.util.List;

public class DieuPhoiLichKhamRequest {

    private List<Integer> danhSachMaLichKham;
    private Integer maBacSiMoi;
    private String lyDo;

    public List<Integer> getDanhSachMaLichKham() {
        return danhSachMaLichKham;
    }

    public void setDanhSachMaLichKham(List<Integer> danhSachMaLichKham) {
        this.danhSachMaLichKham = danhSachMaLichKham;
    }

    public Integer getMaBacSiMoi() {
        return maBacSiMoi;
    }

    public void setMaBacSiMoi(Integer maBacSiMoi) {
        this.maBacSiMoi = maBacSiMoi;
    }

    public String getLyDo() {
        return lyDo;
    }

    public void setLyDo(String lyDo) {
        this.lyDo = lyDo;
    }
}