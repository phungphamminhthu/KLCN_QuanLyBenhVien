
package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public class PhanCongChuyenTrachRequest {

    private List<Integer> maNguoiDungs;

    private LocalDate ngayLamViec;

    private LocalTime gioBatDau;

    private LocalTime gioKetThuc;

    private String ghiChu;

    public List<Integer> getMaNguoiDungs() {
        return maNguoiDungs;
    }

    public void setMaNguoiDungs(List<Integer> maNguoiDungs) {
        this.maNguoiDungs = maNguoiDungs;
    }

    public LocalDate getNgayLamViec() {
        return ngayLamViec;
    }

    public void setNgayLamViec(LocalDate ngayLamViec) {
        this.ngayLamViec = ngayLamViec;
    }

    public LocalTime getGioBatDau() {
        return gioBatDau;
    }

    public void setGioBatDau(LocalTime gioBatDau) {
        this.gioBatDau = gioBatDau;
    }

    public LocalTime getGioKetThuc() {
        return gioKetThuc;
    }

    public void setGioKetThuc(LocalTime gioKetThuc) {
        this.gioKetThuc = gioKetThuc;
    }

    public String getGhiChu() {
        return ghiChu;
    }

    public void setGhiChu(String ghiChu) {
        this.ghiChu = ghiChu;
    }
}
