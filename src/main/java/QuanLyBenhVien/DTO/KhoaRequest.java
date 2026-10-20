package QuanLyBenhVien.DTO;

import java.math.BigDecimal;

public class KhoaRequest {

    private String tenKhoa;
    private String moTa;
    private BigDecimal giaKham;

    public String getTenKhoa() {
        return tenKhoa;
    }

    public void setTenKhoa(String tenKhoa) {
        this.tenKhoa = tenKhoa;
    }

    public String getMoTa() {
        return moTa;
    }

    public void setMoTa(String moTa) {
        this.moTa = moTa;
    }

    public BigDecimal getGiaKham() {
        return giaKham;
    }

    public void setGiaKham(BigDecimal giaKham) {
        this.giaKham = giaKham;
    }
}