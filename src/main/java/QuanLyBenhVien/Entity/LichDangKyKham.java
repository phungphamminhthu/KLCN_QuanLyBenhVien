package QuanLyBenhVien.Entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "LichDangKyKham")
public class LichDangKyKham {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MaLichKham")
    private Integer maLichKham;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaBenhNhan", nullable = false)
    private BenhNhan benhNhan;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaBacSi", nullable = false)
    private BacSi bacSi;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaKhoa", nullable = false)
    private Khoa khoa;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "MaSoThuTu", nullable = false)
    private SoThuTu soThuTu;

    @Column(name = "NgayKham", nullable = false)
    private LocalDate ngayKham;

    @Column(name = "GioKham", nullable = false)
    private LocalTime gioKham;

    @Column(name = "LyDoKham", length = 255)
    private String lyDoKham;

    @Column(name = "NgayTao", nullable = false)
    private LocalDateTime ngayTao;

    // =====================================================
    // TRẠNG THÁI QUY TRÌNH KHÁM BỆNH
    //
    // Ví dụ:
    // ChoGoi, DaGoi, DaTiepNhan, DangKham,
    // ChoThanhToan, ChoCLS, HoanTat...
    //
    // Không dùng trường này để lưu trạng thái thanh toán.
    // =====================================================

    @Column(name = "TrangThai", nullable = false, length = 50)
    private String trangThai;

    // =====================================================
    // TRẠNG THÁI THANH TOÁN CỦA LỊCH KHÁM
    //
    // Theo quy định chung của nhóm:
    // ChuaThanhToan
    // DaThanhToan
    //
    // Khi tạo lịch khám mới, mặc định chưa thanh toán.
    // Không tự chuyển sang DaThanhToan khi chỉ tạo QR.
    // =====================================================

    @Column(name = "TrangThaiThanhToan", length = 30)
    private String trangThaiThanhToan = "ChuaThanhToan";

    // =====================================================
    // GETTER / SETTER
    // =====================================================

    public Integer getMaLichKham() {
        return maLichKham;
    }

    public void setMaLichKham(Integer maLichKham) {
        this.maLichKham = maLichKham;
    }

    public BenhNhan getBenhNhan() {
        return benhNhan;
    }

    public void setBenhNhan(BenhNhan benhNhan) {
        this.benhNhan = benhNhan;
    }

    public BacSi getBacSi() {
        return bacSi;
    }

    public void setBacSi(BacSi bacSi) {
        this.bacSi = bacSi;
    }

    public Khoa getKhoa() {
        return khoa;
    }

    public void setKhoa(Khoa khoa) {
        this.khoa = khoa;
    }

    public SoThuTu getSoThuTu() {
        return soThuTu;
    }

    public void setSoThuTu(SoThuTu soThuTu) {
        this.soThuTu = soThuTu;
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

    public String getLyDoKham() {
        return lyDoKham;
    }

    public void setLyDoKham(String lyDoKham) {
        this.lyDoKham = lyDoKham;
    }

    public LocalDateTime getNgayTao() {
        return ngayTao;
    }

    public void setNgayTao(LocalDateTime ngayTao) {
        this.ngayTao = ngayTao;
    }

    // =====================================================
    // TRẠNG THÁI LỊCH KHÁM
    // =====================================================

    public String getTrangThai() {
        return trangThai;
    }

    public void setTrangThai(String trangThai) {
        this.trangThai = trangThai;
    }

    // =====================================================
    // TRẠNG THÁI THANH TOÁN
    // =====================================================

    public String getTrangThaiThanhToan() {
        return trangThaiThanhToan;
    }

    public void setTrangThaiThanhToan(String trangThaiThanhToan) {
        this.trangThaiThanhToan = trangThaiThanhToan;
    }
}