package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DuocSiHistoryResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class DuocSiHistoryService {

    private final JdbcTemplate jdbcTemplate;


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public DuocSiHistoryService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }


    // =====================================================
    // LẤY LỊCH SỬ CẤP THUỐC
    // =====================================================

    public List<DuocSiHistoryResponse> getHistory(

            String keyword,

            String fromDate,

            String toDate,

            String status

    ) {

        StringBuilder sql =
                new StringBuilder("""
                    SELECT

                        p.MaPhieuCapThuoc,

                        p.MaDonThuoc,

                        p.ThoiGianCap,

                        p.TongTien,

                        p.TrangThai AS TrangThaiCapThuoc,

                        nd_cap.HoTen AS TenNguoiCap,

                        nd_bn.HoTen AS TenBenhNhan,

                        nd_bs.HoTen AS TenBacSi,

                        d.NgayKeThuoc,

                        d.TrangThai AS TrangThaiDonThuoc

                    FROM PhieuCapThuoc p

                    INNER JOIN DonThuoc d
                        ON d.MaDonThuoc = p.MaDonThuoc

                    INNER JOIN HoSoBenhAn hs
                        ON hs.MaHoSoBenhAn =
                           d.MaHoSoBenhAn

                    INNER JOIN LichDangKyKham lk
                        ON lk.MaLichKham =
                           hs.MaLichKham

                    INNER JOIN BenhNhan bn
                        ON bn.MaBenhNhan =
                           lk.MaBenhNhan

                    INNER JOIN Nguoidung nd_bn
                        ON nd_bn.MaNguoiDung =
                           bn.MaNguoiDung

                    INNER JOIN BacSi bs
                        ON bs.MaBacSi =
                           d.MaBacSi

                    INNER JOIN Nguoidung nd_bs
                        ON nd_bs.MaNguoiDung =
                           bs.MaNguoiDung

                    INNER JOIN Nguoidung nd_cap
                        ON nd_cap.MaNguoiDung =
                           p.MaNguoiCap

                    WHERE 1 = 1
                    """);


        List<Object> params =
                new ArrayList<>();


        // =====================================================
        // TÌM KIẾM KEYWORD
        // =====================================================
        //
        // Keyword có thể tìm:
        //
        // 1. Mã đơn dạng INT
        //      2
        //
        // 2. Mã hiển thị
        //      DP00002
        //
        // 3. Tên bệnh nhân
        //
        // 4. Tên bác sĩ
        //
        // Ví dụ:
        //
        // keyword = DP00002
        //       -> MaDonThuoc = 2
        //
        // keyword = Nguyễn Văn A
        //       -> tìm bệnh nhân
        //
        // keyword = Trần Văn B
        //       -> tìm bác sĩ
        //
        // =====================================================

        if (
                keyword != null
                        &&
                        !keyword.trim().isEmpty()
        ) {

            String keywordValue =
                    keyword.trim();


            String keywordLike =
                    "%" +
                            keywordValue +
                            "%";


            sql.append("""
                AND (

                    CONCAT(
                        'DP',
                        LPAD(
                            d.MaDonThuoc,
                            5,
                            '0'
                        )
                    ) LIKE ?

                    OR

                    CAST(
                        d.MaDonThuoc
                        AS CHAR
                    ) LIKE ?

                    OR

                    nd_bn.HoTen LIKE ?

                    OR

                    nd_bs.HoTen LIKE ?

                )
                """);


            // DP00002
            params.add(
                    keywordLike
            );


            // 2
            params.add(
                    keywordLike
            );


            // Bệnh nhân
            params.add(
                    keywordLike
            );


            // Bác sĩ
            params.add(
                    keywordLike
            );
        }


        // =====================================================
        // TỪ NGÀY
        // =====================================================
        //
        // Ví dụ:
        //
        // fromDate = 2026-10-01
        //
        // sẽ lấy từ:
        //
        // 2026-10-01 00:00:00
        //
        // =====================================================

        if (
                fromDate != null
                        &&
                        !fromDate.trim().isEmpty()
        ) {

            try {

                LocalDate from =
                        LocalDate.parse(
                                fromDate.trim()
                        );


                LocalDateTime startDateTime =
                        from.atStartOfDay();


                sql.append("""
                    AND p.ThoiGianCap >= ?
                    """);


                params.add(
                        Timestamp.valueOf(
                                startDateTime
                        )
                );


            } catch (Exception e) {

                throw new IllegalArgumentException(
                        "Từ ngày không hợp lệ: "
                                + fromDate
                );
            }
        }


        // =====================================================
        // ĐẾN NGÀY
        // =====================================================
        //
        // Ví dụ:
        //
        // toDate = 2026-10-07
        //
        // Không dùng:
        //
        // <= 2026-10-07 00:00:00
        //
        // vì sẽ bỏ mất dữ liệu trong ngày 07.
        //
        // Thay vào đó:
        //
        // < 2026-10-08 00:00:00
        //
        // =====================================================

        if (
                toDate != null
                        &&
                        !toDate.trim().isEmpty()
        ) {

            try {

                LocalDate to =
                        LocalDate.parse(
                                toDate.trim()
                        );


                LocalDateTime nextDay =
                        to
                                .plusDays(1)
                                .atStartOfDay();


                sql.append("""
                    AND p.ThoiGianCap < ?
                    """);


                params.add(
                        Timestamp.valueOf(
                                nextDay
                        )
                );


            } catch (Exception e) {

                throw new IllegalArgumentException(
                        "Đến ngày không hợp lệ: "
                                + toDate
                );
            }
        }


        // =====================================================
        // KIỂM TRA KHOẢNG NGÀY
        // =====================================================

        if (
                fromDate != null
                        &&
                        !fromDate.trim().isEmpty()
                        &&
                        toDate != null
                        &&
                        !toDate.trim().isEmpty()
        ) {

            try {

                LocalDate from =
                        LocalDate.parse(
                                fromDate.trim()
                        );


                LocalDate to =
                        LocalDate.parse(
                                toDate.trim()
                        );


                if (from.isAfter(to)) {

                    throw new IllegalArgumentException(
                            "Từ ngày không được lớn hơn đến ngày."
                    );
                }


            } catch (
                    java.time.format.DateTimeParseException e
            ) {

                throw new IllegalArgumentException(
                        "Khoảng ngày không hợp lệ."
                );
            }
        }


        // =====================================================
        // TRẠNG THÁI
        // =====================================================

        if (
                status != null
                        &&
                        !status.trim().isEmpty()
        ) {

            sql.append("""
                AND p.TrangThai = ?
                """);


            params.add(
                    status.trim()
            );

        } else {

            // =================================================
            // MẶC ĐỊNH
            // =================================================
            //
            // Khi người dùng chọn "Tất cả"
            // thì trang lịch sử vẫn mặc định
            // hiển thị các phiếu đã cấp.
            //
            // Nếu bạn muốn "Tất cả" thật sự là tất cả
            // trạng thái thì bỏ phần ELSE này.
            //
            // =================================================

            sql.append("""
                AND p.TrangThai = 'DaCapThuoc'
                """);
        }


        // =====================================================
        // SẮP XẾP
        // =====================================================

        sql.append("""
            ORDER BY
                p.ThoiGianCap DESC
            """);


        // =====================================================
        // DEBUG
        // =====================================================

        System.out.println(
                "=========================================="
        );

        System.out.println(
                "SQL LỊCH SỬ CẤP THUỐC:"
        );

        System.out.println(
                sql
        );

        System.out.println(
                "PARAMS:"
        );

        System.out.println(
                params
        );

        System.out.println(
                "=========================================="
        );


        // =====================================================
        // QUERY
        // =====================================================

        return jdbcTemplate.query(

                sql.toString(),

                params.toArray(),

                (rs, rowNum) -> {

                    DuocSiHistoryResponse item =
                            new DuocSiHistoryResponse();


                    // =========================================
                    // MÃ ĐƠN THUỐC
                    // =========================================

                    int maDonThuoc =
                            rs.getInt(
                                    "MaDonThuoc"
                            );


                    item.setMaDonThuoc(
                            maDonThuoc
                    );


                    // =========================================
                    // MÃ HIỂN THỊ
                    // =========================================

                    item.setMaHienThi(
                            "DP" +
                                    String.format(
                                            "%05d",
                                            maDonThuoc
                                    )
                    );


                    // =========================================
                    // BỆNH NHÂN
                    // =========================================

                    String tenBenhNhan =
                            rs.getString(
                                    "TenBenhNhan"
                            );


                    item.setBenhNhan(
                            tenBenhNhan != null
                                    &&
                                    !tenBenhNhan.trim().isEmpty()
                                    ?
                                    tenBenhNhan
                                    :
                                    "-"
                    );


                    // =========================================
                    // BÁC SĨ
                    // =========================================

                    String tenBacSi =
                            rs.getString(
                                    "TenBacSi"
                            );


                    if (
                            tenBacSi != null
                                    &&
                                    !tenBacSi.trim().isEmpty()
                    ) {

                        item.setBacSi(
                                "BS. " +
                                        tenBacSi
                        );

                    } else {

                        item.setBacSi(
                                "-"
                        );
                    }


                    // =========================================
                    // NGÀY KÊ
                    // =========================================

                    Timestamp ngayKe =
                            rs.getTimestamp(
                                    "NgayKeThuoc"
                            );


                    item.setNgayKe(
                            formatDate(
                                    ngayKe
                            )
                    );


                    // =========================================
                    // NGÀY CẤP
                    // =========================================

                    Timestamp thoiGianCap =
                            rs.getTimestamp(
                                    "ThoiGianCap"
                            );


                    item.setNgayCap(
                            formatDate(
                                    thoiGianCap
                            )
                    );


                    // =========================================
                    // NGƯỜI CẤP
                    // =========================================

                    String nguoiCap =
                            rs.getString(
                                    "TenNguoiCap"
                            );


                    item.setNguoiCap(
                            nguoiCap != null
                                    &&
                                    !nguoiCap.trim().isEmpty()
                                    ?
                                    nguoiCap
                                    :
                                    "-"
                    );


                    // =========================================
                    // TỔNG TIỀN
                    // =========================================

                    double tongTien =
                            rs.getDouble(
                                    "TongTien"
                            );


                    item.setTongTien(
                            tongTien
                    );


                    // =========================================
                    // TRẠNG THÁI
                    // =========================================

                    String trangThai =
                            rs.getString(
                                    "TrangThaiCapThuoc"
                            );


                    item.setTrangThai(
                            trangThai
                    );


                    return item;
                }
        );
    }


    // =====================================================
    // FORMAT NGÀY
    // =====================================================

    private String formatDate(
            Timestamp timestamp
    ) {

        if (timestamp == null) {

            return "-";
        }


        LocalDateTime dateTime =
                timestamp.toLocalDateTime();


        return dateTime.format(
                DateTimeFormatter.ofPattern(
                        "dd/MM/yyyy"
                )
        );
    }
}