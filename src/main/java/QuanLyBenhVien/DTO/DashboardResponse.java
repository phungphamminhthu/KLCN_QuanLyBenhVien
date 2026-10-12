package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.util.List;
public class DashboardResponse {

    // ==============================
    // THỐNG KÊ TỔNG QUAN
    // ==============================

    private long tongBenhNhan;
    private long lichKhamHomNay;
    private long tongBacSi;
    private long tongNhanVien;
    private BigDecimal doanhThu;
    private long tongLoaiThuoc;


    // ==============================
    // BIỂU ĐỒ LƯỢT KHÁM THEO NGÀY
    // ==============================

    private List<ChartItem> luotKhamTheoNgay;


    // ==============================
    // BIỂU ĐỒ LƯỢT KHÁM THEO KHOA
    // ==============================

    private List<ChartItem> luotKhamTheoKhoa;


    // ==============================
    // ĐƠN THUỐC CHỜ CẤP
    // ==============================

    private List<PrescriptionItem> donThuocChoCap;


    // ==============================
    // HOẠT ĐỘNG GẦN ĐÂY
    // ==============================

    private List<ActivityItem> hoatDongGanDay;


    public DashboardResponse() {
    }


    // ==============================
    // GETTER / SETTER
    // ==============================

    public long getTongBenhNhan() {
        return tongBenhNhan;
    }

    public void setTongBenhNhan(long tongBenhNhan) {
        this.tongBenhNhan = tongBenhNhan;
    }


    public long getLichKhamHomNay() {
        return lichKhamHomNay;
    }

    public void setLichKhamHomNay(long lichKhamHomNay) {
        this.lichKhamHomNay = lichKhamHomNay;
    }


    public long getTongBacSi() {
        return tongBacSi;
    }

    public void setTongBacSi(long tongBacSi) {
        this.tongBacSi = tongBacSi;
    }


    public long getTongNhanVien() {
        return tongNhanVien;
    }

    public void setTongNhanVien(long tongNhanVien) {
        this.tongNhanVien = tongNhanVien;
    }


    public BigDecimal getDoanhThu() {
        return doanhThu;
    }

    public void setDoanhThu(BigDecimal doanhThu) {
        this.doanhThu = doanhThu;
    }


    public long getTongLoaiThuoc() {
        return tongLoaiThuoc;
    }

    public void setTongLoaiThuoc(long tongLoaiThuoc) {
        this.tongLoaiThuoc = tongLoaiThuoc;
    }


    public List<ChartItem> getLuotKhamTheoNgay() {
        return luotKhamTheoNgay;
    }

    public void setLuotKhamTheoNgay(
            List<ChartItem> luotKhamTheoNgay) {

        this.luotKhamTheoNgay =
                luotKhamTheoNgay;
    }


    public List<ChartItem> getLuotKhamTheoKhoa() {
        return luotKhamTheoKhoa;
    }

    public void setLuotKhamTheoKhoa(
            List<ChartItem> luotKhamTheoKhoa) {

        this.luotKhamTheoKhoa =
                luotKhamTheoKhoa;
    }


    public List<PrescriptionItem> getDonThuocChoCap() {
        return donThuocChoCap;
    }

    public void setDonThuocChoCap(
            List<PrescriptionItem> donThuocChoCap) {

        this.donThuocChoCap =
                donThuocChoCap;
    }


    public List<ActivityItem> getHoatDongGanDay() {
        return hoatDongGanDay;
    }

    public void setHoatDongGanDay(
            List<ActivityItem> hoatDongGanDay) {

        this.hoatDongGanDay =
                hoatDongGanDay;
    }


    // =====================================================
    // CLASS CHART ITEM
    // =====================================================

    public static class ChartItem {

        private String label;
        private long value;

        public ChartItem() {
        }

        public ChartItem(
                String label,
                long value) {

            this.label = label;
            this.value = value;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public long getValue() {
            return value;
        }

        public void setValue(long value) {
            this.value = value;
        }
    }


    // =====================================================
    // CLASS PRESCRIPTION ITEM
    // =====================================================

    public static class PrescriptionItem {

        private Integer maDonThuoc;
        private String maHienThi;
        private String benhNhan;
        private String bacSi;
        private String ngayKe;
        private int soLoaiThuoc;
        private String trangThai;

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

        public String getBenhNhan() {
            return benhNhan;
        }

        public void setBenhNhan(String benhNhan) {
            this.benhNhan = benhNhan;
        }

        public String getBacSi() {
            return bacSi;
        }

        public void setBacSi(String bacSi) {
            this.bacSi = bacSi;
        }

        public String getNgayKe() {
            return ngayKe;
        }

        public void setNgayKe(String ngayKe) {
            this.ngayKe = ngayKe;
        }

        public int getSoLoaiThuoc() {
            return soLoaiThuoc;
        }

        public void setSoLoaiThuoc(int soLoaiThuoc) {
            this.soLoaiThuoc = soLoaiThuoc;
        }

        public String getTrangThai() {
            return trangThai;
        }

        public void setTrangThai(String trangThai) {
            this.trangThai = trangThai;
        }
    }


    // =====================================================
    // CLASS ACTIVITY ITEM
    // =====================================================

    public static class ActivityItem {

        private String thoiGian;
        private String noiDung;
        private String nguoiThucHien;

        public ActivityItem() {
        }

        public ActivityItem(
                String thoiGian,
                String noiDung,
                String nguoiThucHien) {

            this.thoiGian = thoiGian;
            this.noiDung = noiDung;
            this.nguoiThucHien = nguoiThucHien;
        }

        public String getThoiGian() {
            return thoiGian;
        }

        public void setThoiGian(String thoiGian) {
            this.thoiGian = thoiGian;
        }

        public String getNoiDung() {
            return noiDung;
        }

        public void setNoiDung(String noiDung) {
            this.noiDung = noiDung;
        }

        public String getNguoiThucHien() {
            return nguoiThucHien;
        }

        public void setNguoiThucHien(String nguoiThucHien) {
            this.nguoiThucHien = nguoiThucHien;
        }
    }
}
