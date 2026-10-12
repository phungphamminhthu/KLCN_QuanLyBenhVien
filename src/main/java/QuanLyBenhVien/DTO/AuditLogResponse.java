package QuanLyBenhVien.DTO;

import java.time.LocalDateTime;

public class AuditLogResponse {

    private Long maAuditLog;

    private Integer maNguoiDung;

    private String tenNguoiDung;

    private String vaiTro;

    private String hanhDong;

    private String doiTuong;

    private String maDoiTuong;

    private String noiDung;

    private String diaChiIP;

    private LocalDateTime thoiGian;


    public AuditLogResponse() {
    }


    public AuditLogResponse(
            Long maAuditLog,
            Integer maNguoiDung,
            String tenNguoiDung,
            String vaiTro,
            String hanhDong,
            String doiTuong,
            String maDoiTuong,
            String noiDung,
            String diaChiIP,
            LocalDateTime thoiGian
    ) {

        this.maAuditLog = maAuditLog;
        this.maNguoiDung = maNguoiDung;
        this.tenNguoiDung = tenNguoiDung;
        this.vaiTro = vaiTro;
        this.hanhDong = hanhDong;
        this.doiTuong = doiTuong;
        this.maDoiTuong = maDoiTuong;
        this.noiDung = noiDung;
        this.diaChiIP = diaChiIP;
        this.thoiGian = thoiGian;
    }


    public Long getMaAuditLog() {
        return maAuditLog;
    }

    public void setMaAuditLog(Long maAuditLog) {
        this.maAuditLog = maAuditLog;
    }

    public Integer getMaNguoiDung() {
        return maNguoiDung;
    }

    public void setMaNguoiDung(Integer maNguoiDung) {
        this.maNguoiDung = maNguoiDung;
    }

    public String getTenNguoiDung() {
        return tenNguoiDung;
    }

    public void setTenNguoiDung(String tenNguoiDung) {
        this.tenNguoiDung = tenNguoiDung;
    }

    public String getVaiTro() {
        return vaiTro;
    }

    public void setVaiTro(String vaiTro) {
        this.vaiTro = vaiTro;
    }

    public String getHanhDong() {
        return hanhDong;
    }

    public void setHanhDong(String hanhDong) {
        this.hanhDong = hanhDong;
    }

    public String getDoiTuong() {
        return doiTuong;
    }

    public void setDoiTuong(String doiTuong) {
        this.doiTuong = doiTuong;
    }

    public String getMaDoiTuong() {
        return maDoiTuong;
    }

    public void setMaDoiTuong(String maDoiTuong) {
        this.maDoiTuong = maDoiTuong;
    }

    public String getNoiDung() {
        return noiDung;
    }

    public void setNoiDung(String noiDung) {
        this.noiDung = noiDung;
    }

    public String getDiaChiIP() {
        return diaChiIP;
    }

    public void setDiaChiIP(String diaChiIP) {
        this.diaChiIP = diaChiIP;
    }

    public LocalDateTime getThoiGian() {
        return thoiGian;
    }

    public void setThoiGian(LocalDateTime thoiGian) {
        this.thoiGian = thoiGian;
    }
}