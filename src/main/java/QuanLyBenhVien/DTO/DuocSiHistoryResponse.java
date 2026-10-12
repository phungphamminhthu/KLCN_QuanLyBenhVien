package QuanLyBenhVien.DTO;

public class DuocSiHistoryResponse {

    // =====================================================
    // MÃ ĐƠN THUỐC
    // =====================================================

    private Integer maDonThuoc;

    private String maHienThi;


    // =====================================================
    // THÔNG TIN BỆNH NHÂN
    // =====================================================

    private String benhNhan;


    // =====================================================
    // THÔNG TIN BÁC SĨ
    // =====================================================

    private String bacSi;


    // =====================================================
    // NGÀY KÊ / NGÀY CẤP
    // =====================================================

    private String ngayKe;

    private String ngayCap;


    // =====================================================
    // NGƯỜI CẤP THUỐC
    // =====================================================

    private String nguoiCap;


    // =====================================================
    // TỔNG TIỀN
    // =====================================================

    private Double tongTien;


    // =====================================================
    // TRẠNG THÁI
    // =====================================================

    private String trangThai;


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public DuocSiHistoryResponse() {
    }


    // =====================================================
    // GETTER / SETTER
    // =====================================================

    public Integer getMaDonThuoc() {
        return maDonThuoc;
    }

    public void setMaDonThuoc(
            Integer maDonThuoc
    ) {
        this.maDonThuoc = maDonThuoc;
    }


    public String getMaHienThi() {
        return maHienThi;
    }

    public void setMaHienThi(
            String maHienThi
    ) {
        this.maHienThi = maHienThi;
    }


    public String getBenhNhan() {
        return benhNhan;
    }

    public void setBenhNhan(
            String benhNhan
    ) {
        this.benhNhan = benhNhan;
    }


    public String getBacSi() {
        return bacSi;
    }

    public void setBacSi(
            String bacSi
    ) {
        this.bacSi = bacSi;
    }


    public String getNgayKe() {
        return ngayKe;
    }

    public void setNgayKe(
            String ngayKe
    ) {
        this.ngayKe = ngayKe;
    }


    public String getNgayCap() {
        return ngayCap;
    }

    public void setNgayCap(
            String ngayCap
    ) {
        this.ngayCap = ngayCap;
    }


    public String getNguoiCap() {
        return nguoiCap;
    }

    public void setNguoiCap(
            String nguoiCap
    ) {
        this.nguoiCap = nguoiCap;
    }


    public Double getTongTien() {
        return tongTien;
    }

    public void setTongTien(
            Double tongTien
    ) {
        this.tongTien = tongTien;
    }


    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(
            String trangThai
    ) {
        this.trangThai = trangThai;
    }
}