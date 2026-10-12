package QuanLyBenhVien.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public class ThongKeBaoCaoRepository {

    @PersistenceContext
    private EntityManager entityManager;


    // =========================================================
    // TỔNG LƯỢT KHÁM
    // =========================================================

    public Long countLuotKham(
            LocalDate from,
            LocalDate to,
            Integer maKhoa
    ) {

        String sql = """
                SELECT COUNT(l.MaLichKham)
                FROM LichDangKyKham l
                WHERE l.NgayKham BETWEEN :from AND :to
                """;

        if (maKhoa != null) {
            sql += " AND l.MaKhoa = :maKhoa ";
        }

        var query =
                entityManager.createNativeQuery(sql)
                        .setParameter("from", from)
                        .setParameter("to", to);

        if (maKhoa != null) {
            query.setParameter("maKhoa", maKhoa);
        }

        Number result =
                (Number) query.getSingleResult();

        return result.longValue();
    }


    // =========================================================
    // TỔNG BỆNH NHÂN
    // =========================================================

    public Long countBenhNhan() {

        String sql = """
                SELECT COUNT(*)
                FROM BenhNhan
                """;

        Number result =
                (Number) entityManager
                        .createNativeQuery(sql)
                        .getSingleResult();

        return result.longValue();
    }


    // =========================================================
    // TỔNG DOANH THU
    // =========================================================

    public BigDecimal sumDoanhThu(
            LocalDate from,
            LocalDate to,
            Integer maKhoa
    ) {

        String sql = """
                SELECT COALESCE(SUM(tt.SoTien), 0)
                FROM ThanhToan tt
                JOIN HoaDon hd
                    ON hd.MaHoaDon = tt.MaHoaDon
                JOIN LichDangKyKham lk
                    ON lk.MaLichKham = hd.MaLichKham
                WHERE DATE(tt.NgayThanhToan)
                      BETWEEN :from AND :to
                """;

        if (maKhoa != null) {

            sql += """
                    AND lk.MaKhoa = :maKhoa
                    """;
        }

        var query =
                entityManager.createNativeQuery(sql)
                        .setParameter("from", from)
                        .setParameter("to", to);

        if (maKhoa != null) {
            query.setParameter("maKhoa", maKhoa);
        }

        Object result =
                query.getSingleResult();

        if (result == null) {
            return BigDecimal.ZERO;
        }

        return new BigDecimal(
                result.toString()
        );
    }


    // =========================================================
    // KHOA
    // =========================================================

    public List<Object[]> findAllKhoa() {

        String sql = """
                SELECT MaKhoa, TenKhoa
                FROM Khoa
                ORDER BY TenKhoa ASC
                """;

        return entityManager
                .createNativeQuery(sql)
                .getResultList();
    }

    // =================================================
    // QUERY BIỂU ĐỒ LƯỢT KHÁM
    // =================================================
    public List<Object[]> getLuotKhamTheoNgay(

            LocalDate from,

            LocalDate to,

            Integer maKhoa
    ) {

        String sql = """
            SELECT
                l.NgayKham,
                COUNT(l.MaLichKham)
            FROM LichDangKyKham l
            WHERE l.NgayKham BETWEEN :from AND :to
            """;

        if (maKhoa != null) {

            sql += """
                AND l.MaKhoa = :maKhoa
                """;
        }

        sql += """
            GROUP BY l.NgayKham
            ORDER BY l.NgayKham ASC
            """;


        var query =
                entityManager
                        .createNativeQuery(sql)
                        .setParameter(
                                "from",
                                from
                        )
                        .setParameter(
                                "to",
                                to
                        );


        if (maKhoa != null) {

            query.setParameter(
                    "maKhoa",
                    maKhoa
            );
        }


        return query.getResultList();
    }

    // ====================================
    // QUERY DOANH THU THEO NGÀY
    // ====================================
    public List<Object[]> getDoanhThuTheoNgay(

            LocalDate from,

            LocalDate to,

            Integer maKhoa
    ) {

        String sql = """
            SELECT
                DATE(tt.NgayThanhToan),
                COALESCE(SUM(tt.SoTien), 0)
            FROM ThanhToan tt
            JOIN HoaDon hd
                ON hd.MaHoaDon = tt.MaHoaDon
            JOIN LichDangKyKham lk
                ON lk.MaLichKham = hd.MaLichKham
            WHERE DATE(tt.NgayThanhToan)
                  BETWEEN :from AND :to
            """;


        if (maKhoa != null) {

            sql += """
                AND lk.MaKhoa = :maKhoa
                """;
        }


        sql += """
            GROUP BY DATE(tt.NgayThanhToan)
            ORDER BY DATE(tt.NgayThanhToan) ASC
            """;


        var query =
                entityManager
                        .createNativeQuery(sql)
                        .setParameter(
                                "from",
                                from
                        )
                        .setParameter(
                                "to",
                                to
                        );


        if (maKhoa != null) {

            query.setParameter(
                    "maKhoa",
                    maKhoa
            );
        }


        return query.getResultList();
    }
}
