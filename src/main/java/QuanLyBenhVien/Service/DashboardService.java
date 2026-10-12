package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DashboardResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DashboardService {

    private final JdbcTemplate jdbcTemplate;

    public DashboardService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }


    // =====================================================
    // LẤY TOÀN BỘ DASHBOARD
    // =====================================================

    public DashboardResponse getDashboard(
            String period,
            LocalDate selectedDate
    ) {

        DashboardResponse response =
                new DashboardResponse();


        // =================================================
        // XÁC ĐỊNH KHOẢNG THỜI GIAN
        // =================================================

        LocalDate[] dateRange =
                getDateRange(period, selectedDate);

        LocalDate startDate = dateRange[0];
        LocalDate endDate = dateRange[1];


        // =================================================
        // THỐNG KÊ TỔNG QUAN
        // =================================================

        // -------------------------------------------------
        // TỔNG BỆNH NHÂN
        // Không phụ thuộc thời gian
        // -------------------------------------------------

        response.setTongBenhNhan(
                count(
                        """
                        SELECT COUNT(*)
                        FROM BenhNhan
                        """
                )
        );


        // -------------------------------------------------
        // LỊCH KHÁM THEO KHOẢNG THỜI GIAN
        // -------------------------------------------------

        response.setLichKhamHomNay(
                countBetweenDates(
                        """
                        SELECT COUNT(*)
                        FROM LichDangKyKham
                        WHERE NgayKham BETWEEN ? AND ?
                        """,
                        startDate,
                        endDate
                )
        );


        // -------------------------------------------------
        // TỔNG BÁC SĨ
        // Không phụ thuộc thời gian
        // -------------------------------------------------

        response.setTongBacSi(
                count(
                        """
                        SELECT COUNT(*)
                        FROM BacSi
                        WHERE TrangThai = 1
                        """
                )
        );


        // -------------------------------------------------
        // TỔNG NHÂN VIÊN
        //
        // Tổng tài khoản người dùng
        // trừ tài khoản bệnh nhân
        // và tài khoản bác sĩ
        // -------------------------------------------------

        response.setTongNhanVien(
                count(
                        """
                        SELECT COUNT(*)
                        FROM Nguoidung n
                        WHERE n.MaNguoiDung NOT IN
                        (
                            SELECT MaNguoiDung
                            FROM BenhNhan
                        )
                        AND n.MaNguoiDung NOT IN
                        (
                            SELECT MaNguoiDung
                            FROM BacSi
                        )
                        """
                )
        );


        // =================================================
        // DOANH THU
        // =================================================

        response.setDoanhThu(
                getDoanhThu(
                        period,
                        selectedDate
                )
        );


        // -------------------------------------------------
        // TỔNG LOẠI THUỐC
        // Không phụ thuộc thời gian
        // -------------------------------------------------

        response.setTongLoaiThuoc(
                count(
                        """
                        SELECT COUNT(*)
                        FROM Thuoc
                        WHERE TrangThai = 1
                        """
                )
        );


        // =================================================
        // BIỂU ĐỒ LƯỢT KHÁM THEO THỜI GIAN
        // =================================================

        response.setLuotKhamTheoNgay(
                getLuotKhamTheoNgay(
                        period,
                        selectedDate
                )
        );


        // =================================================
        // BIỂU ĐỒ LƯỢT KHÁM THEO KHOA
        // =================================================

        response.setLuotKhamTheoKhoa(
                getLuotKhamTheoKhoa(
                        startDate,
                        endDate
                )
        );


        // =================================================
        // ĐƠN THUỐC CHỜ CẤP
        // =================================================

        response.setDonThuocChoCap(
                getDonThuocChoCap(
                        startDate,
                        endDate
                )
        );


        // =================================================
        // HOẠT ĐỘNG GẦN ĐÂY
        // =================================================

        response.setHoatDongGanDay(
                getHoatDongGanDay(
                        startDate,
                        endDate
                )
        );


        return response;
    }


    // =====================================================
    // XÁC ĐỊNH KHOẢNG THỜI GIAN
    // =====================================================

    private LocalDate[] getDateRange(
            String period,
            LocalDate selectedDate
    ) {

        LocalDate today = LocalDate.now();

        if (period == null || period.isBlank()) {
            period = "today";
        }


        switch (period) {

            // ---------------------------------------------
            // HÔM NAY
            // ---------------------------------------------

            case "today":

                return new LocalDate[]{
                        today,
                        today
                };


            // ---------------------------------------------
            // 7 NGÀY QUA
            // Hôm nay + 6 ngày trước
            // ---------------------------------------------

            case "7days":

                return new LocalDate[]{
                        today.minusDays(6),
                        today
                };


            // ---------------------------------------------
            // 30 NGÀY QUA
            // Hôm nay + 29 ngày trước
            // ---------------------------------------------

            case "30days":

                return new LocalDate[]{
                        today.minusDays(29),
                        today
                };


            // ---------------------------------------------
            // NGÀY TÙY CHỌN
            // ---------------------------------------------

            case "custom":

                if (selectedDate == null) {
                    selectedDate = today;
                }

                return new LocalDate[]{
                        selectedDate,
                        selectedDate
                };


            // ---------------------------------------------
            // MẶC ĐỊNH
            // ---------------------------------------------

            default:

                return new LocalDate[]{
                        today,
                        today
                };
        }
    }


    // =====================================================
    // DOANH THU
    // =====================================================

    private BigDecimal getDoanhThu(
            String period,
            LocalDate selectedDate
    ) {

        LocalDate[] dateRange =
                getDateRange(
                        period,
                        selectedDate
                );

        LocalDate startDate = dateRange[0];
        LocalDate endDate = dateRange[1];

        LocalDateTime startDateTime =
                startDate.atStartOfDay();

        LocalDateTime endDateTime =
                endDate
                        .plusDays(1)
                        .atStartOfDay();

        BigDecimal result =
                jdbcTemplate.queryForObject(
                        """
                        SELECT COALESCE(
                            SUM(SoTien),
                            0
                        )
                        FROM ThanhToan
                        WHERE TrangThai = 'ThanhCong'
                          AND NgayThanhToan >= ?
                          AND NgayThanhToan < ?
                        """,
                        BigDecimal.class,
                        startDateTime,
                        endDateTime
                );

        return result != null
                ? result
                : BigDecimal.ZERO;
    }

    // =====================================================
    // ĐẾM
    // =====================================================

    private long count(String sql) {

        Long result =
                jdbcTemplate.queryForObject(
                        sql,
                        Long.class
                );

        return result != null
                ? result
                : 0;
    }


    // =====================================================
    // ĐẾM THEO KHOẢNG NGÀY
    // =====================================================

    private long countBetweenDates(
            String sql,
            LocalDate startDate,
            LocalDate endDate
    ) {

        Long result =
                jdbcTemplate.queryForObject(
                        sql,
                        Long.class,
                        startDate,
                        endDate
                );

        return result != null
                ? result
                : 0;
    }


    // =====================================================
    // LƯỢT KHÁM THEO THỜI GIAN
    // =====================================================

    private List<DashboardResponse.ChartItem>
    getLuotKhamTheoNgay(
            String period,
            LocalDate selectedDate
    ) {

        LocalDate[] dateRange =
                getDateRange(
                        period,
                        selectedDate
                );

        LocalDate startDate = dateRange[0];
        LocalDate endDate = dateRange[1];


        String sql = """
            SELECT
                DATE_FORMAT(NgayKham, '%d/%m') AS Ngay,
                COUNT(*) AS Tong

            FROM LichDangKyKham

            WHERE NgayKham BETWEEN ? AND ?

            GROUP BY NgayKham

            ORDER BY NgayKham
            """;


        return jdbcTemplate.query(
                sql,
                (rs, rowNum) ->
                        new DashboardResponse.ChartItem(
                                rs.getString("Ngay"),
                                rs.getLong("Tong")
                        ),
                startDate,
                endDate
        );
    }


    // =====================================================
    // LƯỢT KHÁM THEO KHOA
    // =====================================================

    private List<DashboardResponse.ChartItem>
    getLuotKhamTheoKhoa(
            LocalDate startDate,
            LocalDate endDate
    ) {

        String sql = """
            SELECT
                k.TenKhoa AS TenKhoa,
                COUNT(l.MaLichKham) AS Tong

            FROM Khoa k

            LEFT JOIN LichDangKyKham l
                ON l.MaKhoa = k.MaKhoa
                AND l.NgayKham BETWEEN ? AND ?

            GROUP BY
                k.MaKhoa,
                k.TenKhoa

            ORDER BY Tong DESC

            LIMIT 6
            """;


        return jdbcTemplate.query(
                sql,
                (rs, rowNum) ->
                        new DashboardResponse.ChartItem(
                                rs.getString("TenKhoa"),
                                rs.getLong("Tong")
                        ),
                startDate,
                endDate
        );
    }


    // =====================================================
    // ĐƠN THUỐC CHỜ CẤP
    // =====================================================

    private List<DashboardResponse.PrescriptionItem>
    getDonThuocChoCap(
            LocalDate startDate,
            LocalDate endDate
    ) {

        String sql = """
        SELECT
            d.MaDonThuoc,

            bn.MaBenhNhan,

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

        WHERE d.TrangThai = 'ChoCapThuoc'

          AND DATE(d.NgayKeThuoc)
              BETWEEN ? AND ?

        GROUP BY
            d.MaDonThuoc,
            bn.MaBenhNhan,
            nd_bn.HoTen,
            nd_bs.HoTen,
            d.NgayKeThuoc,
            d.TrangThai

        ORDER BY
            d.NgayKeThuoc DESC

        LIMIT 5
        """;


        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {

                    DashboardResponse.PrescriptionItem item =
                            new DashboardResponse.PrescriptionItem();


                    // =========================================
                    // MÃ ĐƠN THUỐC
                    // =========================================

                    int maDon =
                            rs.getInt("MaDonThuoc");

                    item.setMaDonThuoc(maDon);


                    // =========================================
                    // MÃ HIỂN THỊ
                    // Ví dụ: TH00001
                    // =========================================

                    item.setMaHienThi(
                            "TH" +
                                    String.format(
                                            "%05d",
                                            maDon
                                    )
                    );


                    // =========================================
                    // BỆNH NHÂN
                    // =========================================

                    item.setBenhNhan(
                            rs.getString("TenBenhNhan")
                    );


                    // =========================================
                    // BÁC SĨ
                    // =========================================

                    item.setBacSi(
                            rs.getString("TenBacSi")
                    );


                    // =========================================
                    // NGÀY KÊ THUỐC
                    // =========================================

                    LocalDateTime ngay =
                            rs.getTimestamp("NgayKeThuoc")
                                    .toLocalDateTime();

                    item.setNgayKe(
                            ngay.format(
                                    DateTimeFormatter.ofPattern(
                                            "dd/MM/yyyy"
                                    )
                            )
                    );


                    // =========================================
                    // SỐ LOẠI THUỐC
                    // =========================================

                    item.setSoLoaiThuoc(
                            rs.getInt("SoLoaiThuoc")
                    );


                    // =========================================
                    // TRẠNG THÁI
                    // =========================================

                    item.setTrangThai(
                            rs.getString("TrangThai")
                    );


                    return item;
                },
                startDate,
                endDate
        );
    }


    // =====================================================
    // HOẠT ĐỘNG GẦN ĐÂY
    // =====================================================

    private List<DashboardResponse.ActivityItem>
    getHoatDongGanDay(
            LocalDate startDate,
            LocalDate endDate
    ) {

        String sql = """
            SELECT
                a.ThoiGian,
                a.HanhDong,
                a.DoiTuong,
                n.HoTen

            FROM AuditLog a

            LEFT JOIN Nguoidung n
                ON n.MaNguoiDung =
                   a.MaNguoiDung

            WHERE a.ThoiGian >= ?

              AND a.ThoiGian < ?

            ORDER BY
                a.ThoiGian DESC

            LIMIT 5
            """;


        LocalDateTime startDateTime =
                startDate.atStartOfDay();


        LocalDateTime endDateTime =
                endDate
                        .plusDays(1)
                        .atStartOfDay();


        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {

                    // ---------------------------------
                    // THỜI GIAN
                    // ---------------------------------

                    LocalDateTime time =
                            rs.getTimestamp(
                                            "ThoiGian"
                                    )
                                    .toLocalDateTime();


                    // ---------------------------------
                    // HÀNH ĐỘNG
                    // ---------------------------------

                    String hanhDong =
                            rs.getString(
                                    "HanhDong"
                            );


                    // ---------------------------------
                    // ĐỐI TƯỢNG
                    // ---------------------------------

                    String doiTuong =
                            rs.getString(
                                    "DoiTuong"
                            );


                    // ---------------------------------
                    // NỘI DUNG
                    // ---------------------------------

                    String noiDung =
                            hanhDong
                                    + " "
                                    + doiTuong;


                    return new DashboardResponse.ActivityItem(
                            time.format(
                                    DateTimeFormatter.ofPattern(
                                            "HH:mm"
                                    )
                            ),
                            noiDung,
                            rs.getString(
                                    "HoTen"
                            )
                    );
                },
                startDateTime,
                endDateTime
        );
    }
}