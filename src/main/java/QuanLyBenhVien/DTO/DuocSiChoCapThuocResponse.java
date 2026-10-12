package QuanLyBenhVien.DTO;

import java.math.BigDecimal;

public class DuocSiChoCapThuocResponse {

    // =====================================================
    // ĐƠN THUỐC
    // =====================================================

    private Integer maDonThuoc;

    private String maHienThi;


    // =====================================================
    // BỆNH NHÂN
    // =====================================================

    private Integer maBenhNhan;

    private String maBenhNhanHienThi;

    private String benhNhan;

    private String gioiTinh;

    private String ngaySinh;


    // =====================================================
    // CHỈ SỐ SỨC KHỎE
    // =====================================================

    private BigDecimal canNang;

    private Integer huyetApTamThu;

    private Integer huyetApTamTruong;


    // =====================================================
    // BÁC SĨ / ĐƠN THUỐC
    // =====================================================

    private String bacSi;

    private String ngayKe;

    private Integer soLoaiThuoc;

    private String trangThai;


    // =====================================================
    // GETTER / SETTER
    // =====================================================

    public Integer getMaDonThuoc() {
        return maDonThuoc;
    }

    public void setMaDonThuoc(Integer maDonThuoc) {
        this.maDonThuoc = maDonThuoc;
    }


    public String getMaHienThi() {
        return maHienThi;
    }

    public void setMaHienThi(String maHienThi) {
        this.maHienThi = maHienThi;
    }


    public Integer getMaBenhNhan() {
        return maBenhNhan;
    }

    public void setMaBenhNhan(Integer maBenhNhan) {
        this.maBenhNhan = maBenhNhan;
    }


    public String getMaBenhNhanHienThi() {
        return maBenhNhanHienThi;
    }

    public void setMaBenhNhanHienThi(
            String maBenhNhanHienThi
    ) {
        this.maBenhNhanHienThi =
                maBenhNhanHienThi;
    }


    public String getBenhNhan() {
        return benhNhan;
    }

    public void setBenhNhan(String benhNhan) {
        this.benhNhan = benhNhan;
    }


    // =====================================================
    // GIỚI TÍNH
    // =====================================================

    public String getGioiTinh() {
        return gioiTinh;
    }

    public void setGioiTinh(String gioiTinh) {
        this.gioiTinh = gioiTinh;
    }


    // =====================================================
    // NGÀY SINH
    // =====================================================

    public String getNgaySinh() {
        return ngaySinh;
    }

    public void setNgaySinh(String ngaySinh) {
        this.ngaySinh = ngaySinh;
    }


    // =====================================================
    // CÂN NẶNG
    // =====================================================

    public BigDecimal getCanNang() {
        return canNang;
    }

    public void setCanNang(BigDecimal canNang) {
        this.canNang = canNang;
    }


    // =====================================================
    // HUYẾT ÁP TÂM THU
    // =====================================================

    public Integer getHuyetApTamThu() {
        return huyetApTamThu;
    }

    public void setHuyetApTamThu(
            Integer huyetApTamThu
    ) {
        this.huyetApTamThu =
                huyetApTamThu;
    }


    // =====================================================
    // HUYẾT ÁP TÂM TRƯƠNG
    // =====================================================

    public Integer getHuyetApTamTruong() {
        return huyetApTamTruong;
    }

    public void setHuyetApTamTruong(
            Integer huyetApTamTruong
    ) {
        this.huyetApTamTruong =
                huyetApTamTruong;
    }


    // =====================================================
    // BÁC SĨ
    // =====================================================

    public String getBacSi() {
        return bacSi;
    }

    public void setBacSi(String bacSi) {
        this.bacSi = bacSi;
    }


    // =====================================================
    // NGÀY KÊ
    // =====================================================

    public String getNgayKe() {
        return ngayKe;
    }

    public void setNgayKe(String ngayKe) {
        this.ngayKe = ngayKe;
    }


    // =====================================================
    // SỐ LOẠI THUỐC
    // =====================================================

    public Integer getSoLoaiThuoc() {
        return soLoaiThuoc;
    }

    public void setSoLoaiThuoc(
            Integer soLoaiThuoc
    ) {
        this.soLoaiThuoc =
                soLoaiThuoc;
    }


    // =====================================================
    // TRẠNG THÁI
    // =====================================================

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }
}