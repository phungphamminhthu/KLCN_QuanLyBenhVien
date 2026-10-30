
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

    // Lấy tất cả hóa đơn của một lịch khám
    List<HoaDon> findByLichDangKyKham_MaLichKham(
            Integer maLichKham
    );

    // Tính tổng tiền của các hóa đơn chưa bị hủy
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

    // ====================================================
    // Khóa hóa đơn khi xử lý thanh toán
    // ====================================================
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
