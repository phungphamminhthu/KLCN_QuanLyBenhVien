package QuanLyBenhVien.DTO;

import java.math.BigDecimal;

public class KhoaResponse {

    private Integer maKhoa;
    private String tenKhoa;
    private String moTa;
    private BigDecimal giaKham;

    public Integer getMaKhoa() {
        return maKhoa;
    }

    public void setMaKhoa(Integer maKhoa) {
        this.maKhoa = maKhoa;
    }

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
