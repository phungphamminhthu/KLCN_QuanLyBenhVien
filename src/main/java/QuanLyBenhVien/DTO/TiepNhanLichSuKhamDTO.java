package QuanLyBenhVien.DTO;

import java.util.ArrayList;
import java.util.List;

public class TiepNhanLichSuKhamDTO {

    // Danh sách lịch đã khám xong của trang hiện tại.
    private List<LichSuItemDTO> danhSach = new ArrayList<>();

    // Dữ liệu cho hai bộ lọc trên giao diện.
    private List<BoLocDTO> danhSachBacSi = new ArrayList<>();
    private List<BoLocDTO> danhSachKhoa = new ArrayList<>();

    // Số trang bắt đầu từ 1.
    private int trangHienTai = 1;
    private int kichThuocTrang = 20;
    private long tongLichKham;
    private long tongSoTrang = 1;

    public TiepNhanLichSuKhamDTO() {
    }

    public List<LichSuItemDTO> getDanhSach() {
        return danhSach;
    }

    public void setDanhSach(List<LichSuItemDTO> danhSach) {
        this.danhSach = danhSach != null
                ? danhSach
                : new ArrayList<>();
    }

    public List<BoLocDTO> getDanhSachBacSi() {
        return danhSachBacSi;
    }

    public void setDanhSachBacSi(List<BoLocDTO> danhSachBacSi) {
        this.danhSachBacSi = danhSachBacSi != null
                ? danhSachBacSi
                : new ArrayList<>();
    }

    public List<BoLocDTO> getDanhSachKhoa() {
        return danhSachKhoa;
    }

    public void setDanhSachKhoa(List<BoLocDTO> danhSachKhoa) {
        this.danhSachKhoa = danhSachKhoa != null
                ? danhSachKhoa
                : new ArrayList<>();
    }

    public int getTrangHienTai() {
        return trangHienTai;
    }

    public void setTrangHienTai(int trangHienTai) {
        this.trangHienTai = trangHienTai;
    }

    public int getKichThuocTrang() {
        return kichThuocTrang;
    }

    public void setKichThuocTrang(int kichThuocTrang) {
        this.kichThuocTrang = kichThuocTrang;
    }

    public long getTongLichKham() {
        return tongLichKham;
    }

    public void setTongLichKham(long tongLichKham) {
        this.tongLichKham = tongLichKham;
    }

    public long getTongSoTrang() {
        return tongSoTrang;
    }

    public void setTongSoTrang(long tongSoTrang) {
        this.tongSoTrang = tongSoTrang;
    }

    // =========================================================
    // THÔNG TIN MỘT LỊCH KHÁM ĐÃ HOÀN TẤT
    // =========================================================

    public static class LichSuItemDTO {

        // Mã thật dùng để mở đúng bệnh nhân và đúng lịch khám.
        private Integer maLichKham;
        private Integer maBenhNhan;
        private Integer maHoSoBenhAn;
        private Integer maBacSi;
        private Integer maKhoa;

        // Đây là SoThuTu trong bảng sothutu, không phải MaSoThuTu.
        private Integer soThuTu;

        private String tenBenhNhan;
        private String ngaySinh;
        private String gioiTinh;
        private String soDienThoai;

        // Ngày theo yyyy-MM-dd; giờ theo HH:mm.
        private String ngayKham;
        private String gioKham;

        private String tenKhoa;
        private String tenBacSi;
        private String tenPhong;

        // Giữ riêng trạng thái lịch và trạng thái hồ sơ.
        private String trangThaiLichKham;
        private String trangThaiHoSo;

        public LichSuItemDTO() {
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

        public Integer getMaHoSoBenhAn() {
            return maHoSoBenhAn;
        }

        public void setMaHoSoBenhAn(Integer maHoSoBenhAn) {
            this.maHoSoBenhAn = maHoSoBenhAn;
        }

        public Integer getMaBacSi() {
            return maBacSi;
        }

        public void setMaBacSi(Integer maBacSi) {
            this.maBacSi = maBacSi;
        }

        public Integer getMaKhoa() {
            return maKhoa;
        }

        public void setMaKhoa(Integer maKhoa) {
            this.maKhoa = maKhoa;
        }

        public Integer getSoThuTu() {
            return soThuTu;
        }

        public void setSoThuTu(Integer soThuTu) {
            this.soThuTu = soThuTu;
        }

        public String getTenBenhNhan() {
            return tenBenhNhan;
        }

        public void setTenBenhNhan(String tenBenhNhan) {
            this.tenBenhNhan = tenBenhNhan;
        }

        public String getNgaySinh() {
            return ngaySinh;
        }

        public void setNgaySinh(String ngaySinh) {
            this.ngaySinh = ngaySinh;
        }

        public String getGioiTinh() {
            return gioiTinh;
        }

        public void setGioiTinh(String gioiTinh) {
            this.gioiTinh = gioiTinh;
        }

        public String getSoDienThoai() {
            return soDienThoai;
        }

        public void setSoDienThoai(String soDienThoai) {
            this.soDienThoai = soDienThoai;
        }

        public String getNgayKham() {
            return ngayKham;
        }

        public void setNgayKham(String ngayKham) {
            this.ngayKham = ngayKham;
        }

        public String getGioKham() {
            return gioKham;
        }

        public void setGioKham(String gioKham) {
            this.gioKham = gioKham;
        }

        public String getTenKhoa() {
            return tenKhoa;
        }

        public void setTenKhoa(String tenKhoa) {
            this.tenKhoa = tenKhoa;
        }

        public String getTenBacSi() {
            return tenBacSi;
        }

        public void setTenBacSi(String tenBacSi) {
            this.tenBacSi = tenBacSi;
        }

        public String getTenPhong() {
            return tenPhong;
        }

        public void setTenPhong(String tenPhong) {
            this.tenPhong = tenPhong;
        }

        public String getTrangThaiLichKham() {
            return trangThaiLichKham;
        }

        public void setTrangThaiLichKham(String trangThaiLichKham) {
            this.trangThaiLichKham = trangThaiLichKham;
        }

        public String getTrangThaiHoSo() {
            return trangThaiHoSo;
        }

        public void setTrangThaiHoSo(String trangThaiHoSo) {
            this.trangThaiHoSo = trangThaiHoSo;
        }
    }

    // =========================================================
    // MỘT LỰA CHỌN TRONG BỘ LỌC BÁC SĨ HOẶC KHOA
    // =========================================================

    public static class BoLocDTO {

        private Integer ma;
        private String ten;

        public BoLocDTO() {
        }

        public BoLocDTO(Integer ma, String ten) {
            this.ma = ma;
            this.ten = ten;
        }

        public Integer getMa() {
            return ma;
        }

        public void setMa(Integer ma) {
            this.ma = ma;
        }

        public String getTen() {
            return ten;
        }

        public void setTen(String ten) {
            this.ten = ten;
        }
    }
}