package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.util.List;

public class ThongKeBaoCaoResponse {

    // Tổng quan
    private Long tongLuotKham;
    private BigDecimal tongDoanhThu;
    private Long tongBenhNhan;

    // Thống kê lượt khám theo ngày
    private List<ThongKeTheoNgay> luotKhamTheoNgay;

    // Thống kê doanh thu theo ngày
    private List<ThongKeTheoNgay> doanhThuTheoNgay;

    // Danh sách khoa để đổ vào dropdown
    private List<KhoaOption> danhSachKhoa;

    // Thống kê theo khoa
    private List<ThongKeTheoKhoa> thongKeTheoKhoa;

    public Long getTongLuotKham() {
        return tongLuotKham;
    }

    public void setTongLuotKham(Long tongLuotKham) {
        this.tongLuotKham = tongLuotKham;
    }

    public BigDecimal getTongDoanhThu() {
        return tongDoanhThu;
    }

    public void setTongDoanhThu(BigDecimal tongDoanhThu) {
        this.tongDoanhThu = tongDoanhThu;
    }

    public Long getTongBenhNhan() {
        return tongBenhNhan;
    }

    public void setTongBenhNhan(Long tongBenhNhan) {
        this.tongBenhNhan = tongBenhNhan;
    }

    public List<ThongKeTheoNgay> getLuotKhamTheoNgay() {
        return luotKhamTheoNgay;
    }

    public void setLuotKhamTheoNgay(List<ThongKeTheoNgay> luotKhamTheoNgay) {
        this.luotKhamTheoNgay = luotKhamTheoNgay;
    }

    public List<ThongKeTheoNgay> getDoanhThuTheoNgay() {
        return doanhThuTheoNgay;
    }

    public void setDoanhThuTheoNgay(List<ThongKeTheoNgay> doanhThuTheoNgay) {
        this.doanhThuTheoNgay = doanhThuTheoNgay;
    }

    public List<KhoaOption> getDanhSachKhoa() {
        return danhSachKhoa;
    }

    public void setDanhSachKhoa(List<KhoaOption> danhSachKhoa) {
        this.danhSachKhoa = danhSachKhoa;
    }

    public List<ThongKeTheoKhoa> getThongKeTheoKhoa() {
        return thongKeTheoKhoa;
    }

    public void setThongKeTheoKhoa(List<ThongKeTheoKhoa> thongKeTheoKhoa) {
        this.thongKeTheoKhoa = thongKeTheoKhoa;
    }

    // =========================
    // Thống kê theo ngày
    // =========================
    public static class ThongKeTheoNgay {

        private String label;
        private Long luotKham;

        // Trạng thái lịch khám
        private Long hoanThanh;
        private Long dangKham;
        private Long daHuy;
        private Long khongDen;

        // Doanh thu theo loại
        private BigDecimal tienKham;
        private BigDecimal tienThuoc;
        private BigDecimal tienDichVu;
        private BigDecimal tongDoanhThu;

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public Long getLuotKham() {
            return luotKham;
        }

        public void setLuotKham(Long luotKham) {
            this.luotKham = luotKham;
        }

        public Long getHoanThanh() {
            return hoanThanh;
        }

        public void setHoanThanh(Long hoanThanh) {
            this.hoanThanh = hoanThanh;
        }

        public Long getDangKham() {
            return dangKham;
        }

        public void setDangKham(Long dangKham) {
            this.dangKham = dangKham;
        }

        public Long getDaHuy() {
            return daHuy;
        }

        public void setDaHuy(Long daHuy) {
            this.daHuy = daHuy;
        }

        public Long getKhongDen() {
            return khongDen;
        }

        public void setKhongDen(Long khongDen) {
            this.khongDen = khongDen;
        }

        public BigDecimal getTienKham() {
            return tienKham;
        }

        public void setTienKham(BigDecimal tienKham) {
            this.tienKham = tienKham;
        }

        public BigDecimal getTienThuoc() {
            return tienThuoc;
        }

        public void setTienThuoc(BigDecimal tienThuoc) {
            this.tienThuoc = tienThuoc;
        }

        public BigDecimal getTienDichVu() {
            return tienDichVu;
        }

        public void setTienDichVu(BigDecimal tienDichVu) {
            this.tienDichVu = tienDichVu;
        }

        public BigDecimal getTongDoanhThu() {
            return tongDoanhThu;
        }

        public void setTongDoanhThu(BigDecimal tongDoanhThu) {
            this.tongDoanhThu = tongDoanhThu;
        }
    }

    // =========================
    // Dropdown khoa
    // =========================
    public static class KhoaOption {

        private Integer maKhoa;
        private String tenKhoa;

        public KhoaOption() {
        }

        public KhoaOption(Integer maKhoa, String tenKhoa) {
            this.maKhoa = maKhoa;
            this.tenKhoa = tenKhoa;
        }

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
    }

    // =========================
    // Thống kê theo khoa
    // =========================
    public static class ThongKeTheoKhoa {

        private Integer maKhoa;
        private String tenKhoa;
        private Long soBenhNhan;
        private Long tongLuotKham;
        private BigDecimal tongDoanhThu;

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

        public Long getSoBenhNhan() {
            return soBenhNhan;
        }

        public void setSoBenhNhan(Long soBenhNhan) {
            this.soBenhNhan = soBenhNhan;
        }

        public Long getTongLuotKham() {
            return tongLuotKham;
        }

        public void setTongLuotKham(Long tongLuotKham) {
            this.tongLuotKham = tongLuotKham;
        }

        public BigDecimal getTongDoanhThu() {
            return tongDoanhThu;
        }

        public void setTongDoanhThu(BigDecimal tongDoanhThu) {
            this.tongDoanhThu = tongDoanhThu;
        }
    }
}