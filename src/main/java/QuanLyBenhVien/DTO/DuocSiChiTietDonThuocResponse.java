package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DuocSiChiTietDonThuocResponse {

    // =====================================================
    // THÔNG TIN ĐƠN THUỐC
    // =====================================================

    private Integer maDonThuoc;

    private String maHienThi;

    private Integer maBenhNhan;

    private String maBenhNhanHienThi;

    private String benhNhan;

    private String gioiTinh;

    private String ngaySinh;

    private BigDecimal canNang;

    private Integer huyetApTamThu;

    private Integer huyetApTamTruong;

    private String diaChi;

    private String bacSi;

    private String ngayKe;

    private String ngayTaiKham;

    private String ghiChu;

    private String ngayCap;

    private String nguoiCap;

    private String trangThaiCapThuoc;

    // =====================================================
    // DANH SÁCH THUỐC
    // =====================================================

    private List<ThuocItem> danhSachThuoc =
            new ArrayList<>();


    // =====================================================
    // TỔNG TIỀN
    // =====================================================

    private Double tongTien;


    // =====================================================
    // CẢNH BÁO KHO
    // =====================================================

    private String canhBaoKho;


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


    public Integer getMaBenhNhan() {
        return maBenhNhan;
    }

    public void setMaBenhNhan(
            Integer maBenhNhan
    ) {
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

    public void setBenhNhan(
            String benhNhan
    ) {
        this.benhNhan = benhNhan;
    }


    // =====================================================
    // GIỚI TÍNH
    // =====================================================

    public String getGioiTinh() {
        return gioiTinh;
    }

    public void setGioiTinh(
            String gioiTinh
    ) {
        this.gioiTinh = gioiTinh;
    }


    // =====================================================
    // NGÀY SINH
    // =====================================================

    public String getNgaySinh() {
        return ngaySinh;
    }

    public void setNgaySinh(
            String ngaySinh
    ) {
        this.ngaySinh = ngaySinh;
    }


    // =====================================================
    // CÂN NẶNG
    // =====================================================

    public BigDecimal getCanNang() {
        return canNang;
    }

    public void setCanNang(
            BigDecimal canNang
    ) {
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

    // ====================================================
    // ĐỊA CHỈ
    // ====================================================
    public String getDiaChi() {
        return diaChi;
    }

    public void setDiaChi(String diaChi) {
        this.diaChi = diaChi;
    }


    // =====================================================
    // BÁC SĨ
    // =====================================================

    public String getBacSi() {
        return bacSi;
    }

    public void setBacSi(
            String bacSi
    ) {
        this.bacSi = bacSi;
    }


    // =====================================================
    // NGÀY KÊ
    // =====================================================

    public String getNgayKe() {
        return ngayKe;
    }

    public void setNgayKe(
            String ngayKe
    ) {
        this.ngayKe = ngayKe;
    }

    //=================================================
    // NGÀY TÁI KHÁM
    //=================================================

    public String getNgayTaiKham() {
        return ngayTaiKham;
    }

    public void setNgayTaiKham(String ngayTaiKham) {
        this.ngayTaiKham = ngayTaiKham;
    }


    // =====================================================
    // GHI CHÚ
    // =====================================================

    public String getGhiChu() {
        return ghiChu;
    }

    public void setGhiChu(
            String ghiChu
    ) {
        this.ghiChu = ghiChu;
    }

    // ===============================================
    // NGÀY CẤP
    // ===============================================
    public String getNgayCap() {
        return ngayCap;
    }

    public void setNgayCap(String ngayCap) {
        this.ngayCap = ngayCap;
    }


    // ===============================================
    // NGƯỜI CẤP
    // ===============================================
    public String getNguoiCap() {
        return nguoiCap;
    }

    public void setNguoiCap(String nguoiCap) {
        this.nguoiCap = nguoiCap;
    }


    // ===============================================
    // TRẠNG THÁI CẤP
    // ===============================================
    public String getTrangThaiCapThuoc() {
        return trangThaiCapThuoc;
    }

    public void setTrangThaiCapThuoc(
            String trangThaiCapThuoc
    ) {
        this.trangThaiCapThuoc =
                trangThaiCapThuoc;
    }


    // =====================================================
    // DANH SÁCH THUỐC
    // =====================================================

    public List<ThuocItem> getDanhSachThuoc() {
        return danhSachThuoc;
    }

    public void setDanhSachThuoc(
            List<ThuocItem> danhSachThuoc
    ) {
        this.danhSachThuoc =
                danhSachThuoc;
    }


    // =====================================================
    // TỔNG TIỀN
    // =====================================================

    public Double getTongTien() {
        return tongTien;
    }

    public void setTongTien(
            Double tongTien
    ) {
        this.tongTien = tongTien;
    }


    // =====================================================
    // CẢNH BÁO KHO
    // =====================================================

    public String getCanhBaoKho() {
        return canhBaoKho;
    }

    public void setCanhBaoKho(
            String canhBaoKho
    ) {
        this.canhBaoKho = canhBaoKho;
    }


    // =====================================================
    // INNER CLASS: THUỐC
    // =====================================================

    public static class ThuocItem {

        private Integer maThuoc;

        private String tenThuoc;

        private String donViTinh;

        private Integer soLuong;

        private String soLuongHienThi;

        private String lieuDung;

        private Integer thoiGianDung;

        private String cachDung;

        private Double donGia;

        private Double thanhTien;

        private Integer tonKho;

        private Integer tonKhoToiThieu;

        private String tinhTrang;

        private Integer maCTDonThuoc;

        private Integer maThuocThucCap;

        private List<ThuocThayTheItem> danhSachThuocThayThe =
                new ArrayList<>();

        private String tenThuocGoc;

        public String getTenThuocGoc() {
            return tenThuocGoc;
        }

        public void setTenThuocGoc(String tenThuocGoc) {
            this.tenThuocGoc = tenThuocGoc;
        }


        public Integer getMaThuoc() {
            return maThuoc;
        }

        public void setMaThuoc(
                Integer maThuoc
        ) {
            this.maThuoc = maThuoc;
        }


        public String getTenThuoc() {
            return tenThuoc;
        }

        public void setTenThuoc(
                String tenThuoc
        ) {
            this.tenThuoc = tenThuoc;
        }


        public String getDonViTinh() {
            return donViTinh;
        }

        public void setDonViTinh(
                String donViTinh
        ) {
            this.donViTinh = donViTinh;
        }


        public Integer getSoLuong() {
            return soLuong;
        }

        public void setSoLuong(
                Integer soLuong
        ) {
            this.soLuong = soLuong;
        }


        public String getSoLuongHienThi() {
            return soLuongHienThi;
        }

        public void setSoLuongHienThi(
                String soLuongHienThi
        ) {
            this.soLuongHienThi =
                    soLuongHienThi;
        }


        public String getLieuDung() {
            return lieuDung;
        }

        public void setLieuDung(
                String lieuDung
        ) {
            this.lieuDung = lieuDung;
        }


        public Integer getThoiGianDung() {
            return thoiGianDung;
        }

        public void setThoiGianDung(
                Integer thoiGianDung
        ) {
            this.thoiGianDung = thoiGianDung;
        }


        public String getCachDung() {
            return cachDung;
        }

        public void setCachDung(
                String cachDung
        ) {
            this.cachDung = cachDung;
        }


        public Double getDonGia() {
            return donGia;
        }

        public void setDonGia(
                Double donGia
        ) {
            this.donGia = donGia;
        }



        public Double getThanhTien() {
            return thanhTien;
        }

        public void setThanhTien(
                Double thanhTien
        ) {
            this.thanhTien = thanhTien;
        }


        public Integer getTonKho() {
            return tonKho;
        }

        public void setTonKho(
                Integer tonKho
        ) {
            this.tonKho = tonKho;
        }


        public Integer getTonKhoToiThieu() {
            return tonKhoToiThieu;
        }

        public void setTonKhoToiThieu(
                Integer tonKhoToiThieu
        ) {
            this.tonKhoToiThieu =
                    tonKhoToiThieu;
        }


        public String getTinhTrang() {
            return tinhTrang;
        }

        public void setTinhTrang(
                String tinhTrang
        ) {
            this.tinhTrang = tinhTrang;
        }

        public Integer getMaCTDonThuoc() {
            return maCTDonThuoc;
        }

        public void setMaCTDonThuoc(Integer maCTDonThuoc) {
            this.maCTDonThuoc = maCTDonThuoc;
        }

        public Integer getMaThuocThucCap() {
            return maThuocThucCap;
        }

        public void setMaThuocThucCap(Integer maThuocThucCap) {
            this.maThuocThucCap = maThuocThucCap;
        }

        public List<ThuocThayTheItem> getDanhSachThuocThayThe() {
            return danhSachThuocThayThe;
        }

        public void setDanhSachThuocThayThe(
                List<ThuocThayTheItem> danhSachThuocThayThe
        ) {
            this.danhSachThuocThayThe = danhSachThuocThayThe;
        }
    }

    public static class ThuocThayTheItem {

        private Integer maThuoc;
        private String tenThuoc;
        private String donViTinh;
        private BigDecimal gia;
        private Integer tonKho;

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

        public BigDecimal getGia() {
            return gia;
        }

        public void setGia(BigDecimal gia) {
            this.gia = gia;
        }

        public Integer getTonKho() {
            return tonKho;
        }

        public void setTonKho(Integer tonKho) {
            this.tonKho = tonKho;
        }
    }
}