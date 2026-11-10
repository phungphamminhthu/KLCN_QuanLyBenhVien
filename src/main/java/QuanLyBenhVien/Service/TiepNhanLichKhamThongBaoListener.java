
package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Repository.BenhNhanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class TiepNhanLichKhamThongBaoListener {

    private static final Logger log =
            LoggerFactory.getLogger(
                    TiepNhanLichKhamThongBaoListener.class
            );

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private static final DateTimeFormatter DINH_DANG_NGAY =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final DateTimeFormatter DINH_DANG_GIO =
            DateTimeFormatter.ofPattern("HH:mm");

    private final JdbcTemplate jdbcTemplate;
    private final ThongBaoService thongBaoService;
    private final TransactionTemplate transactionTemplate;
    private final BenhNhanRepository benhNhanRepository;

    // Sự kiện phát ra sau khi tạo lịch khám.
    // taiKhoanTao dùng để không thông báo cho chính
    // nhân viên vừa thực hiện đăng ký tại quầy.
    public record LichKhamMoiEvent(
            Integer maLichKham,
            String taiKhoanTao
    ) {}

    private record ThongTinLich(
            Integer maLichKham,
            Integer maBenhNhan,
            Integer maKhoa,
            String tenBenhNhan,
            String tenKhoa,
            LocalDate ngayKham,
            LocalTime gioKham
    ) {}

    public TiepNhanLichKhamThongBaoListener(
            JdbcTemplate jdbcTemplate,
            ThongBaoService thongBaoService,
            PlatformTransactionManager transactionManager,
            BenhNhanRepository benhNhanRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.thongBaoService = thongBaoService;
        this.benhNhanRepository = benhNhanRepository;

        this.transactionTemplate =
                new TransactionTemplate(transactionManager);

        this.transactionTemplate.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_REQUIRES_NEW
        );
    }

    // =====================================================
    // 1. NHẬN SỰ KIỆN SAU KHI LƯU LỊCH KHÁM
    // =====================================================

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT
    )
    public void khiDangKyKhamThanhCong(
            LichKhamMoiEvent event
    ) {
        if (event == null
                || event.maLichKham() == null
                || event.maLichKham() <= 0) {
            return;
        }

        try {
            transactionTemplate.executeWithoutResult(
                    status -> guiThongBao(event)
            );

        } catch (Exception exception) {
            // Lịch khám đã lưu thành công.
            // Không để lỗi thông báo khiến nhân viên
            // hiểu nhầm việc đăng ký khám bị thất bại.
            log.error(
                    "Không thể phát thông báo cho lịch khám {}",
                    event.maLichKham(),
                    exception
            );
        }
    }

    // =====================================================
    // 2. LẤY THÔNG TIN LỊCH KHÁM VỪA ĐĂNG KÝ
    // =====================================================

    private void guiThongBao(LichKhamMoiEvent event) {

        String sqlLichKham = """
            SELECT
                l.MaLichKham,
                l.MaBenhNhan,
                l.MaKhoa,
                l.NgayKham,
                l.GioKham,
                bn.HoTen AS TenBenhNhan,
                k.TenKhoa
    
            FROM LichDangKyKham l
    
            JOIN BenhNhan bn
                ON bn.MaBenhNhan = l.MaBenhNhan
    
            JOIN Khoa k
                ON k.MaKhoa = l.MaKhoa
    
            WHERE l.MaLichKham = ?
              AND l.TrangThai <> 'DaHuy'
            """;

        List<ThongTinLich> danhSach = jdbcTemplate.query(
                sqlLichKham,
                (rs, rowNum) -> {

                    Time gio = rs.getTime("GioKham");

                    return new ThongTinLich(
                            rs.getInt("MaLichKham"),
                            rs.getInt("MaBenhNhan"),
                            rs.getInt("MaKhoa"),
                            rs.getString("TenBenhNhan"),
                            rs.getString("TenKhoa"),
                            rs.getObject("NgayKham", LocalDate.class),
                            gio == null ? null : gio.toLocalTime()
                    );
                },
                event.maLichKham()
        );

        if (danhSach.isEmpty()) {
            log.warn(
                    "Không tìm thấy lịch khám {} để gửi thông báo",
                    event.maLichKham()
            );
            return;
        }

        ThongTinLich lich = danhSach.get(0);

        // =================================================
        // 3. TÌM NHÂN VIÊN ĐANG PHỤ TRÁCH KHOA
        // =================================================

        LocalDateTime hienTai =
                LocalDateTime.now(MUI_GIO);

        Timestamp thoiDiem =
                Timestamp.valueOf(hienTai);

        String taiKhoanTao = event.taiKhoanTao() == null
                ? ""
                : event.taiKhoanTao().trim();

        String sqlNguoiNhan = """
                SELECT DISTINCT
                    nd.MaNguoiDung

                FROM phancongtiepnhan pc

                JOIN nguoidung nd
                  ON nd.MaNguoiDung =
                     pc.MaNhanVienTiepNhan

                JOIN vaitro vt
                  ON vt.MaVaiTro = nd.MaVaiTro

                WHERE pc.MaKhoa = ?
                  AND pc.TrangThai = 1
                  AND pc.ThoiGianBatDau <= ?
                  AND pc.ThoiGianKetThuc > ?
                  AND nd.TrangThai = 1
                  AND UPPER(vt.TenVaiTro) = 'TIEPNHAN'

                  AND (
                      ? = ''
                      OR nd.TenDangNhap <> ?
                  )

                ORDER BY nd.MaNguoiDung
                """;

        List<Integer> nguoiNhans = jdbcTemplate.query(
                sqlNguoiNhan,
                (rs, rowNum) -> rs.getInt("MaNguoiDung"),
                lich.maKhoa(),
                thoiDiem,
                thoiDiem,
                taiKhoanTao,
                taiKhoanTao
        );

        if (nguoiNhans.isEmpty()) {
            log.info(
                    "Lịch khám {} chưa có nhân viên khác "
                            + "đang trực để nhận thông báo",
                    lich.maLichKham()
            );
            return;
        }

        // =================================================
        // 4. TẠO NỘI DUNG THÔNG BÁO
        // =================================================

        String gio = lich.gioKham() == null
                ? "chưa xác định"
                : lich.gioKham().format(DINH_DANG_GIO);

        String ngay = lich.ngayKham() == null
                ? "chưa xác định"
                : lich.ngayKham().format(DINH_DANG_NGAY);

        String tieuDe = "Có lịch khám mới";

        String noiDung =
                "Bệnh nhân "
                        + lich.tenBenhNhan()
                        + " vừa đăng ký lịch khám mã #"
                        + lich.maLichKham()
                        + " tại "
                        + lich.tenKhoa()
                        + ", lúc "
                        + gio
                        + " ngày "
                        + ngay
                        + ". Vui lòng kiểm tra danh sách lịch khám.";

        // =================================================
        // 5. LƯU MYSQL VÀ PHÁT WEBSOCKET
        // =================================================

        BenhNhan benhNhan = benhNhanRepository
                .findById(lich.maBenhNhan())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy hồ sơ bệnh nhân có mã: "
                                        + lich.maBenhNhan()
                        )
                );

        for (Integer maNguoiNhan : nguoiNhans) {

            thongBaoService.taoThongBaoVaGuiRealtime(
                    maNguoiNhan,
                    benhNhan,
                    tieuDe,
                    noiDung,
                    "LICH_KHAM_MOI"
            );
        }

        log.info(
                "Đã tạo thông báo lịch khám {} cho {} nhân viên",
                lich.maLichKham(),
                nguoiNhans.size()
        );
    }
}
