
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.HoaDon;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface HoaDonRepository
        extends JpaRepository<HoaDon, Integer> {

    // =============================================
    // LẤY TẤT CẢ HÓA ĐƠN CỦA MỘT LỊCH KHÁM
    // =============================================
    List<HoaDon> findByLichDangKyKham_MaLichKham(
            Integer maLichKham
    );

    // =============================================
    // TÍNH TỔNG TIỀN CÁC HÓA ĐƠN CHƯA BỊ HỦY
    // =============================================
    @Query("""
        SELECT COALESCE(SUM(h.tongTien), 0)
        FROM HoaDon h
        WHERE h.lichDangKyKham.maLichKham = :maLichKham
          AND (h.trangThai IS NULL OR h.trangThai <> 'DaHuy')
        """)
    BigDecimal tinhTongChiPhi(
            @Param("maLichKham") Integer maLichKham
    );

    // =============================================
    // TÌM HÓA ĐƠN CỦA TÀI KHOẢN BỆNH NHÂN
    // Giữ lại để tương thích với các chức năng cũ
    // =============================================
    @Query("""
        SELECT h
        FROM HoaDon h
        WHERE h.maHoaDon = :maHoaDon
          AND h.benhNhan.nguoiDung.tenDangNhap = :tenDangNhap
        """)
    Optional<HoaDon> timHoaDonCuaBenhNhan(
            @Param("maHoaDon") Integer maHoaDon,
            @Param("tenDangNhap") String tenDangNhap
    );

    // =============================================
    // TÌM HÓA ĐƠN THEO LỊCH VÀ TÀI KHOẢN
    // Giữ lại để tương thích với các chức năng cũ
    // =============================================
    @Query("""
        SELECT h
        FROM HoaDon h
        WHERE h.lichDangKyKham.maLichKham = :maLichKham
          AND h.benhNhan.nguoiDung.tenDangNhap = :tenDangNhap
          AND (h.trangThai IS NULL OR h.trangThai <> 'DaHuy')
        ORDER BY h.maHoaDon DESC
        """)
    List<HoaDon> timHoaDonTheoLichVaBenhNhan(
            @Param("maLichKham") Integer maLichKham,
            @Param("tenDangNhap") String tenDangNhap
    );

    // =============================================
    // TÌM HÓA ĐƠN THEO MÃ HÓA ĐƠN VÀ HỒ SƠ
    // Dùng cho API lấy QR và trạng thái thanh toán
    // =============================================
    @Query("""
        SELECT h
        FROM HoaDon h
        WHERE h.maHoaDon = :maHoaDon
          AND h.benhNhan.maBenhNhan = :maBenhNhan
        """)
    Optional<HoaDon> timHoaDonTheoMaVaBenhNhan(
            @Param("maHoaDon") Integer maHoaDon,
            @Param("maBenhNhan") Integer maBenhNhan
    );

    // =============================================
    // TÌM HÓA ĐƠN THEO LỊCH KHÁM VÀ HỒ SƠ
    // Dùng cho API xem hóa đơn của hồ sơ đang chọn
    // =============================================
    @Query("""
        SELECT h
        FROM HoaDon h
        WHERE h.lichDangKyKham.maLichKham = :maLichKham
          AND h.benhNhan.maBenhNhan = :maBenhNhan
          AND h.lichDangKyKham.benhNhan.maBenhNhan = :maBenhNhan
          AND (h.trangThai IS NULL OR h.trangThai <> 'DaHuy')
        ORDER BY h.maHoaDon DESC
        """)
    List<HoaDon> timHoaDonTheoLichVaHoSoBenhNhan(
            @Param("maLichKham") Integer maLichKham,
            @Param("maBenhNhan") Integer maBenhNhan
    );

    // =============================================
    // KHÓA HÓA ĐƠN KHI XỬ LÝ THANH TOÁN SEPAY
    // =============================================
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT h
        FROM HoaDon h
        WHERE h.maHoaDon = :maHoaDon
        """)
    Optional<HoaDon> timHoaDonDeXuLyThanhToan(
            @Param("maHoaDon") Integer maHoaDon
    );

    // =============================================
    // KHÓA HÓA ĐƠN KHI XỬ LÝ THANH TOÁN
    // =============================================
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT h
        FROM HoaDon h
        WHERE h.maHoaDon = :maHoaDon
        """)
    Optional<HoaDon> findByIdForUpdate(
            @Param("maHoaDon") Integer maHoaDon
    );
}
