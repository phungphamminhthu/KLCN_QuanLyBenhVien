package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DuocSiDashboardResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DuocSiDashboardService {

    private final JdbcTemplate jdbcTemplate;


    public DuocSiDashboardService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }


    // =====================================================
    // DASHBOARD
    // =====================================================

    public DuocSiDashboardResponse getDashboard() {

        DuocSiDashboardResponse response =
                new DuocSiDashboardResponse();


        // =================================================
        // 1. ĐƠN THUỐC CHỜ CẤP
        // =================================================

        response.setDonThuocChoCap(
                count("""
            SELECT COUNT(DISTINCT d.MaDonThuoc)
            FROM DonThuoc d
            INNER JOIN HoSoBenhAn hs
                ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn
            INNER JOIN LichDangKyKham lk
                ON lk.MaLichKham = hs.MaLichKham
            INNER JOIN TiepNhanBenhNhan tn
                ON tn.MaTiepNhan = (
                    SELECT t2.MaTiepNhan
                    FROM TiepNhanBenhNhan t2
                    WHERE t2.MaLichKham = lk.MaLichKham
                    ORDER BY t2.ThoiGianTiepNhan DESC,
                             t2.MaTiepNhan DESC
                    LIMIT 1
                )
            WHERE d.TrangThai = 'ChoLayThuoc'
              AND tn.TrangThai = 'ChoLayThuoc'
        """)
        );

        // =================================================
        // 2. ĐÃ CẤP HÔM NAY
        // =================================================
        /*
         * Trong schema hiện tại không có NgayCapThuoc.
         *
         * Nếu quy trình của hệ thống là:
         *
         * Dược sĩ cấp thuốc
         *      ↓
         * Lập hóa đơn
         *
         * thì dùng NgayLapHoaDon để xác định
         * đơn thuốc đã cấp trong ngày.
         *
         * CTHoaDon.MaCTDonThuoc liên kết trực tiếp
         * tới CTDonThuoc.
         */

        response.setDaCapHomNay(
                    count("""
                SELECT COUNT(DISTINCT p.MaDonThuoc)
    
                FROM PhieuCapThuoc p
    
                INNER JOIN DonThuoc d
                    ON d.MaDonThuoc = p.MaDonThuoc
    
                WHERE p.TrangThai = 'DaCapThuoc'
    
                  AND d.TrangThai = 'DaCapThuoc'
    
                  AND DATE(p.ThoiGianCap) = CURDATE()
            """)
        );


        // =================================================
        // 3. SỐ LOẠI THUỐC TRONG KHO
        // =================================================

        response.setSoLoaiThuocTrongKho(
                count("""
                    SELECT COUNT(DISTINCT k.MaThuoc)

                    FROM KhoThuoc k

                    INNER JOIN Thuoc t
                        ON t.MaThuoc = k.MaThuoc

                    WHERE k.SoLuongTon > 0

                    AND (
                        t.TrangThai = 1
                        OR t.TrangThai = '1'
                        OR t.TrangThai = 'HoatDong'
                        OR t.TrangThai = 'Đang hoạt động'
                    )
                """)
        );


        // =================================================
        // 4. THUỐC SẮP HẾT HẠN
        //
        // Quy ước:
        // còn hạn nhưng hết hạn trong 30 ngày tới
        // =================================================

        response.setThuocSapHetHan(
                count("""
                    SELECT COUNT(DISTINCT k.MaThuoc)

                    FROM KhoThuoc k

                    INNER JOIN Thuoc t
                        ON t.MaThuoc = k.MaThuoc

                    WHERE k.SoLuongTon > 0

                    AND k.HanSuDung >= CURDATE()

                    AND k.HanSuDung <=
                        DATE_ADD(
                            CURDATE(),
                            INTERVAL 30 DAY
                        )

                    AND (
                        t.TrangThai = 1
                        OR t.TrangThai = '1'
                        OR t.TrangThai = 'HoatDong'
                        OR t.TrangThai = 'Đang hoạt động'
                    )
                """)
        );


        // =================================================
        // 5. THUỐC ĐÃ HẾT HẠN
        // =================================================

        response.setThuocDaHetHan(
                count("""
                    SELECT COUNT(DISTINCT k.MaThuoc)

                    FROM KhoThuoc k

                    INNER JOIN Thuoc t
                        ON t.MaThuoc = k.MaThuoc

                    WHERE k.SoLuongTon > 0

                    AND k.HanSuDung < CURDATE()

                    AND (
                        t.TrangThai = 1
                        OR t.TrangThai = '1'
                        OR t.TrangThai = 'HoatDong'
                        OR t.TrangThai = 'Đang hoạt động'
                    )
                """)
        );


        // =================================================
        // 6. THUỐC SẮP HẾT TỒN
        // =================================================

        response.setThuocSapHetTon(
                count("""
                    SELECT COUNT(DISTINCT k.MaThuoc)

                    FROM KhoThuoc k

                    INNER JOIN Thuoc t
                        ON t.MaThuoc = k.MaThuoc

                    WHERE k.SoLuongTon > 0

                    AND k.SoLuongTon <=
                        COALESCE(
                            k.SoLuongToiThieu,
                            0
                        )

                    AND (
                        t.TrangThai = 1
                        OR t.TrangThai = '1'
                        OR t.TrangThai = 'HoatDong'
                        OR t.TrangThai = 'Đang hoạt động'
                    )
                """)
        );


        // =================================================
        // 7. DANH SÁCH ĐƠN THUỐC
        // =================================================

        response.setDonThuoc(
                getDonThuocChoCap()
        );


        // =================================================
        // 8. CẢNH BÁO KHO
        // =================================================

        response.setStockWarning(
                new DuocSiDashboardResponse.StockWarning(
                        response.getThuocSapHetTon(),
                        response.getThuocSapHetHan(),
                        response.getThuocDaHetHan()
                )
        );


        return response;
    }


    // =====================================================
    // DANH SÁCH ĐƠN THUỐC CHỜ CẤP
    // =====================================================


    private List<DuocSiDashboardResponse.PrescriptionItem>
    getDonThuocChoCap() {

        String sql = """
        SELECT
            d.MaDonThuoc,
            nd_bn.HoTen AS TenBenhNhan,
            nd_bs.HoTen AS TenBacSi,
            d.NgayKeThuoc,
            COUNT(ct.MaCTDonThuoc) AS SoLoaiThuoc,
            d.TrangThai

        FROM DonThuoc d

        INNER JOIN HoSoBenhAn hs
            ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn

        INNER JOIN LichDangKyKham lk
            ON lk.MaLichKham = hs.MaLichKham

        INNER JOIN TiepNhanBenhNhan tn
            ON tn.MaTiepNhan = (
                SELECT t2.MaTiepNhan
                FROM TiepNhanBenhNhan t2
                WHERE t2.MaLichKham = lk.MaLichKham
                ORDER BY t2.ThoiGianTiepNhan DESC,
                         t2.MaTiepNhan DESC
                LIMIT 1
            )

        INNER JOIN BenhNhan bn
            ON bn.MaBenhNhan = lk.MaBenhNhan

        INNER JOIN Nguoidung nd_bn
            ON nd_bn.MaNguoiDung = bn.MaNguoiDung

        INNER JOIN BacSi bs
            ON bs.MaBacSi = d.MaBacSi

        INNER JOIN Nguoidung nd_bs
            ON nd_bs.MaNguoiDung = bs.MaNguoiDung

        LEFT JOIN CTDonThuoc ct
            ON ct.MaDonThuoc = d.MaDonThuoc

        WHERE d.TrangThai = 'ChoLayThuoc'
          AND tn.TrangThai = 'ChoLayThuoc'

        GROUP BY
            d.MaDonThuoc,
            nd_bn.HoTen,
            nd_bs.HoTen,
            d.NgayKeThuoc,
            d.TrangThai

        ORDER BY d.NgayKeThuoc DESC
        LIMIT 5
        """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    DuocSiDashboardResponse.PrescriptionItem item =
                            new DuocSiDashboardResponse.PrescriptionItem();

                    int maDonThuoc = rs.getInt("MaDonThuoc");

                    item.setMaDonThuoc(maDonThuoc);
                    item.setMaHienThi(
                            "DP" + String.format("%05d", maDonThuoc)
                    );

                    item.setBenhNhan(rs.getString("TenBenhNhan"));
                    item.setBacSi(rs.getString("TenBacSi"));

                    Timestamp timestamp = rs.getTimestamp("NgayKeThuoc");

                    if (timestamp != null) {
                        LocalDateTime ngay = timestamp.toLocalDateTime();

                        item.setNgayKe(
                                ngay.format(
                                        DateTimeFormatter.ofPattern("dd/MM/yyyy")
                                )
                        );
                    } else {
                        item.setNgayKe("-");
                    }

                    item.setSoLoaiThuoc(rs.getInt("SoLoaiThuoc"));
                    item.setTrangThai("Chờ cấp thuốc");

                    return item;
                }
        );
    }



    // =====================================================
    // CHUẨN HÓA TRẠNG THÁI
    // =====================================================

    private String normalizeStatus(
            String status
    ) {

        if (status == null) {
            return "Chờ cấp";
        }


        String value =
                status.trim().toLowerCase();


        if (
                value.equals("chocap")
                        ||
                        value.equals("chờ cấp")
                        ||
                        value.equals("cho cap")
        ) {

            return "Chờ cấp";
        }


        if (
                value.equals("dangxuly")
                        ||
                        value.equals("đang xử lý")
                        ||
                        value.equals("dang xu ly")
        ) {

            return "Đang xử lý";
        }


        if (
                value.equals("dacap")
                        ||
                        value.equals("đã cấp")
                        ||
                        value.equals("da cap")
        ) {

            return "Đã cấp";
        }


        return status;
    }


    // =====================================================
    // COUNT
    // =====================================================

    private long count(
            String sql
    ) {

        Long result =
                jdbcTemplate.queryForObject(
                        sql,
                        Long.class
                );


        return result != null
                ? result
                : 0;
    }
}