package QuanLyBenhVien.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class KhoThuocResponse {

    private Integer maKhoThuoc;
    private Integer maThuoc;
    private String tenThuoc;
    private Integer soLuongTon;
    private String soLo;
    private LocalDate hanSuDung;
    private Integer soLuongToiThieu;
    private LocalDateTime thoiGianCapNhatCuoi;
    private String trangThai;

    public Integer getMaKhoThuoc() {
        return maKhoThuoc;
    }

    public void setMaKhoThuoc(Integer maKhoThuoc) {
        this.maKhoThuoc = maKhoThuoc;
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

    public Integer getSoLuongTon() {
        return soLuongTon;
    }

    public void setSoLuongTon(Integer soLuongTon) {
        this.soLuongTon = soLuongTon;
    }

    public String getSoLo() {
        return soLo;
    }

    public void setSoLo(String soLo) {
        this.soLo = soLo;
    }

    public LocalDate getHanSuDung() {
        return hanSuDung;
    }

    public void setHanSuDung(LocalDate hanSuDung) {
        this.hanSuDung = hanSuDung;
    }

    public Integer getSoLuongToiThieu() {
        return soLuongToiThieu;
    }

    public void setSoLuongToiThieu(Integer soLuongToiThieu) {
        this.soLuongToiThieu = soLuongToiThieu;
    }

    public LocalDateTime getThoiGianCapNhatCuoi() {
        return thoiGianCapNhatCuoi;
    }

    public void setThoiGianCapNhatCuoi(LocalDateTime thoiGianCapNhatCuoi) {
        this.thoiGianCapNhatCuoi = thoiGianCapNhatCuoi;
    }

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}
