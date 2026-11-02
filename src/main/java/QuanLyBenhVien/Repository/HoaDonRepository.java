
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
    // TÌM HÓA ĐƠN CỦA BỆNH NHÂN
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
    // TÌM HÓA ĐƠN THEO LỊCH VÀ BỆNH NHÂN
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
    // KHÓA HÓA ĐƠN KHI XỬ LÝ THANH TOÁN SEPAY
    // =============================================

    // Phương thức này phải được gọi bên trong
    // transaction đang hoạt động.
    //
    // Khi một yêu cầu đang xử lý hóa đơn,
    // yêu cầu khác sẽ phải chờ khóa được giải phóng.
    //
    // Trạng thái hợp lệ để bắt đầu thanh toán:
    // ChuaThanhToan
    //
    // Sau khi xác nhận thanh toán thành công:
    // DaThanhToan
    //
    // Việc kiểm tra và chuyển trạng thái sẽ
    // được thực hiện trong SePayService.

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT h
        FROM HoaDon h
        WHERE h.maHoaDon = :maHoaDon
        """)
    Optional<HoaDon> timHoaDonDeXuLyThanhToan(
            @Param("maHoaDon") Integer maHoaDon
    );
}
