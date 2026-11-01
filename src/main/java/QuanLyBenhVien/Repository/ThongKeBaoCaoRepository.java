package QuanLyBenhVien.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

@Repository
public class ThongKeBaoCaoRepository {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Tổng số lượt khám trong khoảng thời gian.
     */
    public Long countLuotKham(
            LocalDate fromDate,
            LocalDate toDate,
            Integer maKhoa
    ) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(l.MaLichKham)
            FROM LichDangKyKham l
            WHERE l.NgayKham BETWEEN :fromDate AND :toDate
        """);

        if (maKhoa != null) {
            sql.append(" AND l.MaKhoa = :maKhoa ");
        }

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("fromDate", Date.valueOf(fromDate));
        query.setParameter("toDate", Date.valueOf(toDate));

        if (maKhoa != null) {
            query.setParameter("maKhoa", maKhoa);
        }

        Number result = (Number) query.getSingleResult();
        return result == null ? 0L : result.longValue();
    }

    /**
     * Tổng doanh thu trong khoảng thời gian.
     * Chỉ tính thanh toán có trạng thái DaThanhToan.
     */
    public BigDecimal sumDoanhThu(
            LocalDate fromDate,
            LocalDate toDate,
            Integer maKhoa
    ) {
        StringBuilder sql = new StringBuilder("""
            SELECT COALESCE(SUM(tt.SoTien), 0)
            FROM ThanhToan tt
            INNER JOIN HoaDon hd
                ON tt.MaHoaDon = hd.MaHoaDon
            INNER JOIN LichDangKyKham l
                ON hd.MaLichKham = l.MaLichKham
            WHERE tt.TrangThai = 'DaThanhToan'
              AND DATE(tt.NgayThanhToan) BETWEEN :fromDate AND :toDate
        """);

        if (maKhoa != null) {
            sql.append(" AND l.MaKhoa = :maKhoa ");
        }

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("fromDate", Date.valueOf(fromDate));
        query.setParameter("toDate", Date.valueOf(toDate));

        if (maKhoa != null) {
            query.setParameter("maKhoa", maKhoa);
        }

        Object result = query.getSingleResult();

        return result == null
                ? BigDecimal.ZERO
                : new BigDecimal(result.toString());
    }

    /**
     * Tổng số bệnh nhân có lịch khám trong khoảng thời gian.
     */
    public Long countBenhNhan(
            LocalDate fromDate,
            LocalDate toDate,
            Integer maKhoa
    ) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(DISTINCT l.MaBenhNhan)
            FROM LichDangKyKham l
            WHERE l.NgayKham BETWEEN :fromDate AND :toDate
        """);

        if (maKhoa != null) {
            sql.append(" AND l.MaKhoa = :maKhoa ");
        }

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("fromDate", Date.valueOf(fromDate));
        query.setParameter("toDate", Date.valueOf(toDate));

        if (maKhoa != null) {
            query.setParameter("maKhoa", maKhoa);
        }

        Number result = (Number) query.getSingleResult();
        return result == null ? 0L : result.longValue();
    }

    /**
     * Thống kê lượt khám theo ngày.
     *
     * Kết quả:
     * [0] Ngày khám
     * [1] Tổng lượt khám
     * [2] Hoàn thành
     * [3] Đang khám
     * [4] Đã hủy
     * [5] Không đến
     */
    // =====================================================
    // LƯỢT KHÁM THEO NGÀY + TRẠNG THÁI
    // =====================================================
    public List<Object[]> getLuotKhamTheoNgay(
            LocalDate from,
            LocalDate to,
            Integer maKhoa) {

        String sql = """
            SELECT
                DATE(lk.NgayKham) AS ngay,
                COUNT(*) AS tongLuotKham,
        
                SUM(CASE
                    WHEN lk.TrangThai = 'HoanTat'
                    THEN 1 ELSE 0
                END) AS hoanThanh,
        
                SUM(CASE
                    WHEN lk.TrangThai = 'DangKham'
                    THEN 1 ELSE 0
                END) AS dangKham,
        
                SUM(CASE
                    WHEN lk.TrangThai = 'DaHuy'
                    THEN 1 ELSE 0
                END) AS daHuy,
        
                SUM(CASE
                    WHEN lk.TrangThai = 'KhongDen'
                    THEN 1 ELSE 0
                END) AS khongDen
        
            FROM LichDangKyKham lk
            WHERE DATE(lk.NgayKham) BETWEEN :fromDate AND :toDate
              AND (:maKhoa IS NULL OR lk.MaKhoa = :maKhoa)
        
            GROUP BY DATE(lk.NgayKham)
            ORDER BY DATE(lk.NgayKham)
    """;

        return entityManager
                .createNativeQuery(sql)
                .setParameter("fromDate", Date.valueOf(from))
                .setParameter("toDate", Date.valueOf(to))
                .setParameter("maKhoa", maKhoa)
                .getResultList();
    }

    /**
     * Thống kê doanh thu theo ngày thanh toán.
     *
     * Kết quả:
     * [0] Ngày thanh toán
     * [1] Tiền khám
     * [2] Tiền thuốc
     * [3] Tiền dịch vụ / CLS
     * [4] Tổng doanh thu
     *
     * LoaiKham, PhiKham => Tiền khám
     * Thuoc             => Tiền thuốc
     * CLS               => Tiền dịch vụ
     */
    public List<Object[]> getDoanhThuTheoNgay(
            LocalDate fromDate,
            LocalDate toDate,
            Integer maKhoa
    ) {
        StringBuilder sql = new StringBuilder("""
            SELECT
                DATE(tt.NgayThanhToan) AS NgayThanhToan,

                COALESCE(
                    SUM(
                        CASE
                            WHEN hd.LoaiHoaDon IN ('LoaiKham', 'PhiKham')
                            THEN tt.SoTien
                            ELSE 0
                        END
                    ), 0
                ) AS TienKham,

                COALESCE(
                    SUM(
                        CASE
                            WHEN hd.LoaiHoaDon = 'Thuoc'
                            THEN tt.SoTien
                            ELSE 0
                        END
                    ), 0
                ) AS TienThuoc,

                COALESCE(
                    SUM(
                        CASE
                            WHEN hd.LoaiHoaDon = 'CLS'
                            THEN tt.SoTien
                            ELSE 0
                        END
                    ), 0
                ) AS TienDichVu,

                COALESCE(SUM(tt.SoTien), 0) AS TongDoanhThu

            FROM ThanhToan tt
            INNER JOIN HoaDon hd
                ON tt.MaHoaDon = hd.MaHoaDon
            INNER JOIN LichDangKyKham l
                ON hd.MaLichKham = l.MaLichKham

            WHERE tt.TrangThai = 'DaThanhToan'
              AND DATE(tt.NgayThanhToan) BETWEEN :fromDate AND :toDate
        """);

        if (maKhoa != null) {
            sql.append(" AND l.MaKhoa = :maKhoa ");
        }

        sql.append("""
            GROUP BY DATE(tt.NgayThanhToan)
            ORDER BY DATE(tt.NgayThanhToan)
        """);

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("fromDate", Date.valueOf(fromDate));
        query.setParameter("toDate", Date.valueOf(toDate));

        if (maKhoa != null) {
            query.setParameter("maKhoa", maKhoa);
        }

        return query.getResultList();
    }

    /**
     * Lấy danh sách khoa để hiển thị dropdown lọc.
     *
     * Kết quả:
     * [0] MaKhoa
     * [1] TenKhoa
     */
    // =====================================================
// DANH SÁCH KHOA CHO DROPDOWN
// =====================================================
    public List<Object[]> getDanhSachKhoa() {

        String sql = """
        SELECT k.MaKhoa, k.TenKhoa
        FROM Khoa k
        ORDER BY k.TenKhoa ASC
        """;

        return entityManager
                .createNativeQuery(sql)
                .getResultList();
    }

    /**
     * Thống kê theo khoa.
     *
     * Kết quả:
     * [0] MaKhoa
     * [1] TenKhoa
     * [2] SoBenhNhan
     * [3] TongLuotKham
     * [4] TongDoanhThu
     *
     * Các phần thống kê được tổng hợp riêng trước khi JOIN,
     * tránh nhân bản số liệu doanh thu do nhiều lịch khám.
     */
    public List<Object[]> getThongKeTheoKhoa(
            LocalDate fromDate,
            LocalDate toDate,
            Integer maKhoa
    ) {
        StringBuilder sql = new StringBuilder("""
            SELECT
                k.MaKhoa,
                k.TenKhoa,
                COALESCE(bn.SoBenhNhan, 0) AS SoBenhNhan,
                COALESCE(lk.TongLuotKham, 0) AS TongLuotKham,
                COALESCE(dt.TongDoanhThu, 0) AS TongDoanhThu

            FROM Khoa k

            LEFT JOIN (
                SELECT
                    l.MaKhoa,
                    COUNT(DISTINCT l.MaBenhNhan) AS SoBenhNhan
                FROM LichDangKyKham l
                WHERE l.NgayKham BETWEEN :fromDate AND :toDate
                GROUP BY l.MaKhoa
            ) bn ON bn.MaKhoa = k.MaKhoa

            LEFT JOIN (
                SELECT
                    l.MaKhoa,
                    COUNT(l.MaLichKham) AS TongLuotKham
                FROM LichDangKyKham l
                WHERE l.NgayKham BETWEEN :fromDate AND :toDate
                GROUP BY l.MaKhoa
            ) lk ON lk.MaKhoa = k.MaKhoa

            LEFT JOIN (
                SELECT
                    l.MaKhoa,
                    SUM(tt.SoTien) AS TongDoanhThu
                FROM ThanhToan tt
                INNER JOIN HoaDon hd
                    ON tt.MaHoaDon = hd.MaHoaDon
                INNER JOIN LichDangKyKham l
                    ON hd.MaLichKham = l.MaLichKham
                WHERE tt.TrangThai = 'DaThanhToan'
                  AND DATE(tt.NgayThanhToan) BETWEEN :fromDate AND :toDate
                GROUP BY l.MaKhoa
            ) dt ON dt.MaKhoa = k.MaKhoa

            WHERE 1 = 1
        """);

        if (maKhoa != null) {
            sql.append(" AND k.MaKhoa = :maKhoa ");
        }

        sql.append(" ORDER BY k.TenKhoa ");

        Query query = entityManager.createNativeQuery(sql.toString());
        query.setParameter("fromDate", Date.valueOf(fromDate));
        query.setParameter("toDate", Date.valueOf(toDate));

        if (maKhoa != null) {
            query.setParameter("maKhoa", maKhoa);
        }

        return query.getResultList();
    }
}