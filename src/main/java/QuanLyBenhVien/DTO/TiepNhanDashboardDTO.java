package QuanLyBenhVien.DTO;

import java.util.ArrayList;
import java.util.List;

public class TiepNhanDashboardDTO {

    // =========================================================
    // BỐN CHỈ SỐ THỐNG KÊ
    // =========================================================

    private long tongBnHienTai;
    private long lichHenHomNay;
    private long bnDangCho;
    private long dangTrongPhongKham;

    // =========================================================
    // DANH SÁCH HÀNG ĐỢI KHÁM
    // =========================================================

    private List<HangDoiItemDTO> hangDoiKham =
            new ArrayList<>();

    public TiepNhanDashboardDTO() {
    }

    public long getTongBnHienTai() {
        return tongBnHienTai;
    }

    public void setTongBnHienTai(long tongBnHienTai) {
        this.tongBnHienTai = tongBnHienTai;
    }

    public long getLichHenHomNay() {
        return lichHenHomNay;
    }

    public void setLichHenHomNay(long lichHenHomNay) {
        this.lichHenHomNay = lichHenHomNay;
    }

    public long getBnDangCho() {
        return bnDangCho;
    }

    public void setBnDangCho(long bnDangCho) {
        this.bnDangCho = bnDangCho;
    }

    public long getDangTrongPhongKham() {
        return dangTrongPhongKham;
    }

    public void setDangTrongPhongKham(
            long dangTrongPhongKham
    ) {
        this.dangTrongPhongKham = dangTrongPhongKham;
    }

    public List<HangDoiItemDTO> getHangDoiKham() {
        return hangDoiKham;
    }

    public void setHangDoiKham(
            List<HangDoiItemDTO> hangDoiKham
    ) {
        this.hangDoiKham = hangDoiKham != null
                ? hangDoiKham
                : new ArrayList<>();
    }

    // =========================================================
    // THÔNG TIN MỘT LƯỢT KHÁM TRONG HÀNG ĐỢI
    // =========================================================

    public static class HangDoiItemDTO {

        // Mã thật trong database, dùng khi gọi API.
        private Integer maLichKham;
        private Integer maBenhNhan;

        // Thông tin hiển thị trên giao diện.
        private String stt;
        private String maBn;
        private String tenBenhNhan;
        private String thongTinPhu;
        private String khoa;
        private String bacSi;
        private String phong;
        private String gioHen;
        private String thoiGianCho;
        private String trangThai;

        public HangDoiItemDTO() {
        }

        public Integer getMaLichKham() {
            return maLichKham;
        }

        public void setMaLichKham(Integer maLichKham) {
            this.maLichKham = maLichKham;
        }

        public Integer getMaBenhNhan() {
            return maBenhNhan;
        }

        public void setMaBenhNhan(Integer maBenhNhan) {
            this.maBenhNhan = maBenhNhan;
        }

        public String getStt() {
            return stt;
        }

        public void setStt(String stt) {
            this.stt = stt;
        }

        public String getMaBn() {
            return maBn;
        }

        public void setMaBn(String maBn) {
            this.maBn = maBn;
        }

        public String getTenBenhNhan() {
            return tenBenhNhan;
        }

        public void setTenBenhNhan(String tenBenhNhan) {
            this.tenBenhNhan = tenBenhNhan;
        }

        public String getThongTinPhu() {
            return thongTinPhu;
        }

        public void setThongTinPhu(String thongTinPhu) {
            this.thongTinPhu = thongTinPhu;
        }

        public String getKhoa() {
            return khoa;
        }

        public void setKhoa(String khoa) {
            this.khoa = khoa;
        }

        public String getBacSi() {
            return bacSi;
        }

        public void setBacSi(String bacSi) {
            this.bacSi = bacSi;
        }

        public String getPhong() {
            return phong;
        }

        public void setPhong(String phong) {
            this.phong = phong;
        }

        public String getGioHen() {
            return gioHen;
        }

        public void setGioHen(String gioHen) {
            this.gioHen = gioHen;
        }

        public String getThoiGianCho() {
            return thoiGianCho;
        }

        public void setThoiGianCho(String thoiGianCho) {
            this.thoiGianCho = thoiGianCho;
        }

        public String getTrangThai() {
            return trangThai;
        }

        public void setTrangThai(String trangThai) {
            this.trangThai = trangThai;
        }
    }
}