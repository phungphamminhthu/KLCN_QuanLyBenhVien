
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO;
import QuanLyBenhVien.Service.TiepNhanHoaDonService;
import QuanLyBenhVien.Service.TiepNhanPhanCongService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan")
public class TiepNhanKiemTraTiepNhanController {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanHoaDonService hoaDonService;
    private final TiepNhanPhanCongService phanCongService;

    public TiepNhanKiemTraTiepNhanController(
            JdbcTemplate jdbcTemplate,
            TiepNhanHoaDonService hoaDonService,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.hoaDonService = hoaDonService;
        this.phanCongService = phanCongService;
    }

    private record LichKham(
            LocalDate ngayKham,
            String trangThai
    ) {}

    private record SoDo(
            String trangThai,
            BigDecimal canNang,
            BigDecimal chieuCao,
            BigDecimal huyetApTamThu,
            BigDecimal huyetApTamTruong
    ) {}

    @GetMapping("/kiem-tra-tiep-nhan/{maLichKham}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> kiemTra(
            @PathVariable Integer maLichKham,
            Authentication authentication
    ) {
        if (maLichKham == null || maLichKham <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã lịch khám không hợp lệ."
            );
        }

        // Kiểm tra quyền và khoa đang phụ trách.
        var caTruc = phanCongService
                .kiemTraQuyenVoiLichKham(
                        authentication,
                        maLichKham
                );

        List<LichKham> lich = jdbcTemplate.query(
                """
                SELECT NgayKham, TrangThai
                FROM LichDangKyKham
                WHERE MaLichKham = ?
                  AND MaKhoa = ?
                """,
                (rs, rowNum) -> new LichKham(
                        rs.getObject(
                                "NgayKham",
                                LocalDate.class
                        ),
                        rs.getString("TrangThai")
                ),
                maLichKham,
                caTruc.maKhoa()
        );

        if (lich.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám trong khoa phụ trách."
            );
        }

        LichKham item = lich.get(0);

        List<String> lyDo = new ArrayList<>();

        // =================================================
        // 1. KIỂM TRA NGÀY KHÁM
        // =================================================

        if (!LocalDate.now(MUI_GIO)
                .equals(item.ngayKham())) {

            lyDo.add(
                    "Lịch khám không thuộc ngày hôm nay."
            );
        }

        // =================================================
        // 2. KIỂM TRA TRẠNG THÁI BỆNH NHÂN
        // =================================================

        String trangThai = item.trangThai();

        if ("ChoGoi".equals(trangThai)) {
            lyDo.add(
                    "Bệnh nhân chưa được gọi. "
                            + "Vui lòng gọi bệnh nhân trước khi tiếp nhận."
            );

        } else if ("DaTiepNhan".equals(trangThai)) {
            lyDo.add(
                    "Bệnh nhân đã được tiếp nhận trước đó."
            );

        } else if (!"DaGoi".equals(trangThai)) {
            lyDo.add(
                    "Lịch khám hiện có trạng thái "
                            + trangThai
                            + ", không thể xác nhận tiếp nhận."
            );
        }

        // =================================================
        // 3. KIỂM TRA THANH TOÁN PHÍ KHÁM
        // =================================================

        TiepNhanHoaDonDTO hoaDon =
                hoaDonService.layDanhSachHoaDon(
                        maLichKham,
                        authentication
                );

        if (!hoaDon.daThanhToanPhiKham()) {
            lyDo.add(
                    "Bệnh nhân chưa thanh toán đủ phí khám. "
                            + "Vui lòng hoàn tất thanh toán viện phí."
            );
        }

        // =================================================
        // 4. KIỂM TRA HỒ SƠ VÀ SỐ ĐO TRƯỚC KHÁM
        // =================================================

        List<SoDo> danhSachSoDo = jdbcTemplate.query(
                """
                SELECT
                    TrangThai,
                    CanNang,
                    ChieuCao,
                    HuyetApTamThu,
                    HuyetApTamTruong
                FROM HoSoBenhAn
                WHERE MaLichKham = ?
                """,
                (rs, rowNum) -> new SoDo(
                        rs.getString("TrangThai"),
                        rs.getBigDecimal("CanNang"),
                        rs.getBigDecimal("ChieuCao"),
                        rs.getBigDecimal("HuyetApTamThu"),
                        rs.getBigDecimal("HuyetApTamTruong")
                ),
                maLichKham
        );

        List<SoDo> hoSoHopLeTrangThai =
                danhSachSoDo.stream()
                        .filter(h ->
                                "DaGoi".equals(h.trangThai())
                                        || "ChoKham".equals(h.trangThai())
                        )
                        .toList();

        if (danhSachSoDo.isEmpty()) {
            lyDo.add(
                    "Chưa có hồ sơ lưu số đo trước khám."
            );

        } else if (hoSoHopLeTrangThai.isEmpty()) {
            lyDo.add(
                    "Hồ sơ trước khám chưa ở trạng thái "
                            + "cho phép xác nhận tiếp nhận."
            );

        } else {
            boolean coBoSoDoDayDu =
                    hoSoHopLeTrangThai.stream()
                            .anyMatch(this::soDoDayDu);

            if (!coBoSoDoDayDu) {
                // Mặc định lấy hồ sơ đầu tiên thuộc
                // trạng thái trước khám để chỉ rõ lỗi.
                SoDo soDo = hoSoHopLeTrangThai.get(0);

                kiemTraChiSo(
                        lyDo,
                        "cân nặng",
                        soDo.canNang()
                );

                kiemTraChiSo(
                        lyDo,
                        "chiều cao",
                        soDo.chieuCao()
                );

                kiemTraChiSo(
                        lyDo,
                        "huyết áp tâm thu",
                        soDo.huyetApTamThu()
                );

                kiemTraChiSo(
                        lyDo,
                        "huyết áp tâm trương",
                        soDo.huyetApTamTruong()
                );

                if (duong(soDo.huyetApTamThu())
                        && duong(soDo.huyetApTamTruong())
                        && soDo.huyetApTamThu().compareTo(
                        soDo.huyetApTamTruong()
                ) <= 0) {

                    lyDo.add(
                            "Huyết áp tâm thu phải lớn hơn "
                                    + "huyết áp tâm trương."
                    );
                }
            }
        }

        boolean duDieuKien = lyDo.isEmpty();

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "maLichKham", maLichKham,
                        "duDieuKien", duDieuKien,
                        "lyDo", lyDo
                )
        );
    }

    private void kiemTraChiSo(
            List<String> lyDo,
            String tenChiSo,
            BigDecimal giaTri
    ) {
        if (giaTri == null) {
            lyDo.add(
                    "Chưa nhập " + tenChiSo + "."
            );

        } else if (!duong(giaTri)) {
            lyDo.add(
                    "Chỉ số " + tenChiSo
                            + " không hợp lệ."
            );
        }
    }

    private boolean duong(BigDecimal giaTri) {
        return giaTri != null
                && giaTri.compareTo(BigDecimal.ZERO) > 0;
    }

    private boolean soDoDayDu(SoDo soDo) {
        return duong(soDo.canNang())
                && duong(soDo.chieuCao())
                && duong(soDo.huyetApTamThu())
                && duong(soDo.huyetApTamTruong())
                && soDo.huyetApTamThu().compareTo(
                soDo.huyetApTamTruong()
        ) > 0;
    }
}
