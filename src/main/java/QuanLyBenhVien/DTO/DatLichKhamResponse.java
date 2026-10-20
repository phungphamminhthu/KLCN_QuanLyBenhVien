
package QuanLyBenhVien.DTO;

import java.math.BigDecimal;

public class DatLichKhamResponse {

    private Integer maLichKham;
    private Integer maSoThuTu;
    private Integer soThuTu;
    private Integer maHoaDon;
    private BigDecimal tongTien;
    private String trangThaiLichKham;
    private String trangThaiHoaDon;
    private String message;

    public DatLichKhamResponse() {
    }

    public DatLichKhamResponse(
            Integer maLichKham,
            Integer maSoThuTu,
            Integer soThuTu,
            Integer maHoaDon,
            BigDecimal tongTien,
            String trangThaiLichKham,
            String trangThaiHoaDon,
            String message) {
        this.maLichKham = maLichKham;
        this.maSoThuTu = maSoThuTu;
        this.soThuTu = soThuTu;
        this.maHoaDon = maHoaDon;
        this.tongTien = tongTien;
        this.trangThaiLichKham = trangThaiLichKham;
        this.trangThaiHoaDon = trangThaiHoaDon;
        this.message = message;
    }

    public Integer getMaLichKham() {
        return maLichKham;
    }

    public void setMaLichKham(Integer maLichKham) {
        this.maLichKham = maLichKham;
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

    public Integer getMaHoaDon() {
        return maHoaDon;
    }

    public void setMaHoaDon(Integer maHoaDon) {
        this.maHoaDon = maHoaDon;
    }

    public BigDecimal getTongTien() {
        return tongTien;
    }

    public void setTongTien(BigDecimal tongTien) {
        this.tongTien = tongTien;
    }

    public String getTrangThaiLichKham() {
        return trangThaiLichKham;
    }

    public void setTrangThaiLichKham(String trangThaiLichKham) {
        this.trangThaiLichKham = trangThaiLichKham;
    }

    public String getTrangThaiHoaDon() {
        return trangThaiHoaDon;
    }

    public void setTrangThaiHoaDon(String trangThaiHoaDon) {
        this.trangThaiHoaDon = trangThaiHoaDon;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
