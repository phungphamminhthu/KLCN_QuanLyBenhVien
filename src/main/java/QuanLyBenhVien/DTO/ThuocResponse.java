package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ThuocResponse {

    private Integer maThuoc;
    private String tenThuoc;
    private String donViTinh;
    private String nhaSanXuat;
    private BigDecimal gia;
    private String moTa;
    private Boolean trangThai;

    // ===== THÔNG TIN KHO =====
    private Integer soLuongTon;
    private Integer soLuongToiThieu;
    private String soLo;
    private LocalDate hanSuDung;

    public ThuocResponse() {
    }

    // Constructor cũ - giữ lại để không ảnh hưởng code cũ
    public ThuocResponse(
            Integer maThuoc,
            String tenThuoc,
            String donViTinh,
            String nhaSanXuat,
            BigDecimal gia,
            String moTa,
            Boolean trangThai) {

        this.maThuoc = maThuoc;
        this.tenThuoc = tenThuoc;
        this.donViTinh = donViTinh;
        this.nhaSanXuat = nhaSanXuat;
        this.gia = gia;
        this.moTa = moTa;
        this.trangThai = trangThai;
    }

    // Constructor đầy đủ
    public ThuocResponse(
            Integer maThuoc,
            String tenThuoc,
            String donViTinh,
            String nhaSanXuat,
            BigDecimal gia,
            String moTa,
            Boolean trangThai,
            Integer soLuongTon,
            Integer soLuongToiThieu,
            String soLo,
            LocalDate hanSuDung) {

        this.maThuoc = maThuoc;
        this.tenThuoc = tenThuoc;
        this.donViTinh = donViTinh;
        this.nhaSanXuat = nhaSanXuat;
        this.gia = gia;
        this.moTa = moTa;
        this.trangThai = trangThai;
        this.soLuongTon = soLuongTon;
        this.soLuongToiThieu = soLuongToiThieu;
        this.soLo = soLo;
        this.hanSuDung = hanSuDung;
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

    public String getDonViTinh() {
        return donViTinh;
    }

    public void setDonViTinh(String donViTinh) {
        this.donViTinh = donViTinh;
    }

    public String getNhaSanXuat() {
        return nhaSanXuat;
    }

    public void setNhaSanXuat(String nhaSanXuat) {
        this.nhaSanXuat = nhaSanXuat;
    }

    public BigDecimal getGia() {
        return gia;
    }

    public void setGia(BigDecimal gia) {
        this.gia = gia;
    }

    public String getMoTa() {
        return moTa;
    }

    public void setMoTa(String moTa) {
        this.moTa = moTa;
    }

    public Boolean getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(Boolean trangThai) {
        this.trangThai = trangThai;
    }

    public Integer getSoLuongTon() {
        return soLuongTon;
    }

    public void setSoLuongTon(Integer soLuongTon) {
        this.soLuongTon = soLuongTon;
    }

    public Integer getSoLuongToiThieu() {
        return soLuongToiThieu;
    }

    public void setSoLuongToiThieu(Integer soLuongToiThieu) {
        this.soLuongToiThieu = soLuongToiThieu;
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
}