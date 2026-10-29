
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.ThanhToan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ThanhToanRepository
        extends JpaRepository<ThanhToan, Integer> {

    boolean existsByMaGiaoDich(String maGiaoDich);

    Optional<ThanhToan> findByMaGiaoDich(String maGiaoDich);

    // Tổng số tiền thanh toán thành công của tất cả hóa đơn
    // thuộc một lịch khám, loại trừ hóa đơn đã hủy.
    @Query("""
        SELECT COALESCE(SUM(t.soTien), 0)
        FROM ThanhToan t
        WHERE t.trangThai = :trangThaiThanhCong
          AND t.maHoaDon IN (
              SELECT h.maHoaDon
              FROM HoaDon h
              WHERE h.lichDangKyKham.maLichKham = :maLichKham
                AND (h.trangThai IS NULL OR h.trangThai <> 'DaHuy')
          )
        """)
    BigDecimal tinhTongDaThanhToanTheoLichKham(
            @Param("maLichKham") Integer maLichKham,
            @Param("trangThaiThanhCong") String trangThaiThanhCong
    );

    // thanh toán theo mã hóa đơn
    List<ThanhToan> findByMaHoaDon(Integer maHoaDon);
}
