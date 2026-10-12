package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalTime;

public class TiepNhanDangKyKhamKetQuaDTO {

    private Integer maLichKham;
    private Integer maBenhNhan;

    // Mã bản ghi số thứ tự trong database.
    private Integer maSoThuTu;

    // Số chờ thực tế hiển thị cho bệnh nhân.
    private Integer soThuTu;

    private LocalDate ngayKham;
    private LocalTime gioKham;
    private String trangThai;

    public TiepNhanDangKyKhamKetQuaDTO() {
    }

    public Integer getMaLichKham() {
        return maLichKham;
    }

    public void setMaLichKham(Integer maLichKham) {
        this.maLichKham = maLichKham;
    }

    public Integer getMaBenhNhan() {
        return maBenhNhan;
    }

    public void setMaBenhNhan(Integer maBenhNhan) {
        this.maBenhNhan = maBenhNhan;
    }

    public Integer getMaSoThuTu() {
        return maSoThuTu;
    }

    public void setMaSoThuTu(Integer maSoThuTu) {
        this.maSoThuTu = maSoThuTu;
    }

    public Integer getSoThuTu() {
        return soThuTu;
    }

    public void setSoThuTu(Integer soThuTu) {
        this.soThuTu = soThuTu;
    }

    public LocalDate getNgayKham() {
        return ngayKham;
    }

    public void setNgayKham(LocalDate ngayKham) {
        this.ngayKham = ngayKham;
    }

    public LocalTime getGioKham() {
        return gioKham;
    }

    public void setGioKham(LocalTime gioKham) {
        this.gioKham = gioKham;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}