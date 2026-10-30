package QuanLyBenhVien.Service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class NhacTaiKhamScheduler {

    private final JdbcTemplate jdbcTemplate;
    private final ThongBaoService thongBaoService;

    public NhacTaiKhamScheduler(
            JdbcTemplate jdbcTemplate,
            ThongBaoService thongBaoService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.thongBaoService = thongBaoService;
    }

    private record LichTaiKham(
            Integer maHoSoBenhAn,
            Integer maNguoiDung,
            LocalDate ngayTaiKham,
            String ghiChu
    ) {}

    // Chạy mỗi ngày lúc 08:00 theo giờ Việt Nam
    @Scheduled(
            cron = "0 0 8 * * *",
            zone = "Asia/Ho_Chi_Minh"
    )
    @Transactional
    public void nhacLichTaiKham() {

        LocalDate ngayMai = LocalDate.now(
                java.time.ZoneId.of("Asia/Ho_Chi_Minh")
        ).plusDays(1);

        // 1. Lấy danh sách hồ sơ có lịch tái khám vào ngày mai
        List<LichTaiKham> danhSach = jdbcTemplate.query(
                """
                SELECT
                    hs.MaHoSoBenhAn,
                    bn.MaNguoiDung,
                    hs.NgayTaiKham,
                    hs.GhiChuTaiKham
                FROM HoSoBenhAn hs
                JOIN LichDangKyKham lk
                    ON lk.MaLichKham = hs.MaLichKham
                JOIN BenhNhan bn
                    ON bn.MaBenhNhan = lk.MaBenhNhan
                WHERE hs.NgayTaiKham = ?
                  AND hs.TrangThai = 'HoanTat'
                  AND bn.MaNguoiDung IS NOT NULL
                """,
                (rs, rowNum) -> new LichTaiKham(
                        rs.getInt("MaHoSoBenhAn"),
                        rs.getInt("MaNguoiDung"),
                        rs.getDate("NgayTaiKham").toLocalDate(),
                        rs.getString("GhiChuTaiKham")
                ),
                Date.valueOf(ngayMai)
        );

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd/MM/yyyy");

        // 2. Duyệt từng hồ sơ
        for (LichTaiKham lich : danhSach) {

            // 3. Ghi nhận hồ sơ đã được gửi nhắc
            // INSERT IGNORE kết hợp UNIQUE để chống gửi trùng
            int soDong = jdbcTemplate.update(
                    """
                    INSERT IGNORE INTO NhacTaiKhamDaGui (
                        MaHoSoBenhAn,
                        NgayTaiKham
                    )
                    VALUES (?, ?)
                    """,
                    lich.maHoSoBenhAn(),
                    Date.valueOf(lich.ngayTaiKham())
            );

            // Đã gửi trước đó thì bỏ qua
            if (soDong != 1) {
                continue;
            }

            // 4. Tạo nội dung thông báo
            String noiDung =
                    "Bạn có lịch tái khám vào ngày "
                            + lich.ngayTaiKham().format(formatter)
                            + ". Vui lòng đến bệnh viện đúng lịch.";

            if (lich.ghiChu() != null
                    && !lich.ghiChu().isBlank()) {

                noiDung += " Ghi chú: " + lich.ghiChu();
            }

            // 5. Gửi thông báo cho bệnh nhân
            thongBaoService.taoThongBao(
                    lich.maNguoiDung(),
                    "Nhắc lịch tái khám",
                    noiDung,
                    "TAI_KHAM"
            );
        }
    }
}