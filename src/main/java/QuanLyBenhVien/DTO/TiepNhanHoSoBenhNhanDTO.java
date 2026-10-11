package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class TiepNhanHoSoBenhNhanDTO {

    private Integer maBenhNhan;
    private String hoTen;
    private LocalDate ngaySinh;
    private String gioiTinh;
    private String soDienThoai;
    private String soDienThoaiKhanCap;
    private String email;
    private String diaChi;
    private String tienSuBenh;

    private List<LanKhamDTO> danhSachLanKham = new ArrayList<>();

    public TiepNhanHoSoBenhNhanDTO() {
    }

    public Integer getMaBenhNhan() {
        return maBenhNhan;
    }

    public void setMaBenhNhan(Integer maBenhNhan) {
        this.maBenhNhan = maBenhNhan;
    }

    public String getHoTen() {
        return hoTen;
    }

    public void setHoTen(String hoTen) {
        this.hoTen = hoTen;
    }

    public LocalDate getNgaySinh() {
        return ngaySinh;
    }

    public void setNgaySinh(LocalDate ngaySinh) {
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

    public String getSoDienThoaiKhanCap() {
        return soDienThoaiKhanCap;
    }

    public void setSoDienThoaiKhanCap(String soDienThoaiKhanCap) {
        this.soDienThoaiKhanCap = soDienThoaiKhanCap;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDiaChi() {
        return diaChi;
    }

    public void setDiaChi(String diaChi) {
        this.diaChi = diaChi;
    }

    public String getTienSuBenh() {
        return tienSuBenh;
    }

    public void setTienSuBenh(String tienSuBenh) {
        this.tienSuBenh = tienSuBenh;
    }

    public List<LanKhamDTO> getDanhSachLanKham() {
        return danhSachLanKham;
    }

    public void setDanhSachLanKham(List<LanKhamDTO> danhSachLanKham) {
        this.danhSachLanKham = danhSachLanKham != null
                ? danhSachLanKham
                : new ArrayList<>();
    }

    public static class LanKhamDTO {

        private Integer maLichKham;
        private LocalDate ngayKham;
        private LocalTime gioKham;
        private Integer soThuTu;
        private String khoa;
        private String bacSi;
        private String phong;
        private String lyDoKham;
        private String trangThai;

        // Số đo thuộc riêng lần khám này.
        private BigDecimal canNang;
        private BigDecimal chieuCao;
        private Integer huyetApTamThu;
        private Integer huyetApTamTruong;

        public LanKhamDTO() {
        }

        public Integer getMaLichKham() {
            return maLichKham;
        }

        public void setMaLichKham(Integer maLichKham) {
            this.maLichKham = maLichKham;
        }

        public LocalDate getNgayKham() {
            return ngayKham;
        }

        public void setNgayKham(LocalDate ngayKham) {
            this.ngayKham = ngayKham;
        }

        public LocalTime getGioKham() {
            return gioKham;
        }

        public void setGioKham(LocalTime gioKham) {
            this.gioKham = gioKham;
        }

        public Integer getSoThuTu() {
            return soThuTu;
        }

        public void setSoThuTu(Integer soThuTu) {
            this.soThuTu = soThuTu;
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

        public String getLyDoKham() {
            return lyDoKham;
        }

        public void setLyDoKham(String lyDoKham) {
            this.lyDoKham = lyDoKham;
        }

        public String getTrangThai() {
            return trangThai;
        }

        public void setTrangThai(String trangThai) {
            this.trangThai = trangThai;
        }

        public BigDecimal getCanNang() {
            return canNang;
        }

        public void setCanNang(BigDecimal canNang) {
            this.canNang = canNang;
        }

        public BigDecimal getChieuCao() {
            return chieuCao;
        }

        public void setChieuCao(BigDecimal chieuCao) {
            this.chieuCao = chieuCao;
        }

        public Integer getHuyetApTamThu() {
            return huyetApTamThu;
        }

        public void setHuyetApTamThu(Integer huyetApTamThu) {
            this.huyetApTamThu = huyetApTamThu;
        }

        public Integer getHuyetApTamTruong() {
            return huyetApTamTruong;
        }

        public void setHuyetApTamTruong(Integer huyetApTamTruong) {
            this.huyetApTamTruong = huyetApTamTruong;
        }
    }
}