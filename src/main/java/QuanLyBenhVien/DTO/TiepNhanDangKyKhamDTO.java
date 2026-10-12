package QuanLyBenhVien.DTO;

import java.time.LocalTime;

public class TiepNhanDangKyKhamDTO {

    // Hồ sơ bệnh nhân đã tra cứu hoặc vừa tạo.
    private Integer maBenhNhan;

    // Khoa và bác sĩ được chọn.
    private Integer maKhoa;
    private Integer maBacSi;

    // Lịch làm việc của bác sĩ được chọn.
    private Integer maLichLamViec;

    // Giờ khám phải nằm trong lịch làm việc được chọn.
    private LocalTime gioKham;

    private String lyDoKham;

    public TiepNhanDangKyKhamDTO() {
    }

    public Integer getMaBenhNhan() {
        return maBenhNhan;
    }

    public void setMaBenhNhan(Integer maBenhNhan) {
        this.maBenhNhan = maBenhNhan;
    }

    public Integer getMaKhoa() {
        return maKhoa;
    }

    public void setMaKhoa(Integer maKhoa) {
        this.maKhoa = maKhoa;
    }

    public Integer getMaBacSi() {
        return maBacSi;
    }

    public void setMaBacSi(Integer maBacSi) {
        this.maBacSi = maBacSi;
    }

    public Integer getMaLichLamViec() {
        return maLichLamViec;
    }

    public void setMaLichLamViec(Integer maLichLamViec) {
        this.maLichLamViec = maLichLamViec;
    }

    public LocalTime getGioKham() {
        return gioKham;
    }

    public void setGioKham(LocalTime gioKham) {
        this.gioKham = gioKham;
    }

    public String getLyDoKham() {
        return lyDoKham;
    }

    public void setLyDoKham(String lyDoKham) {
        this.lyDoKham = lyDoKham;
    }
}