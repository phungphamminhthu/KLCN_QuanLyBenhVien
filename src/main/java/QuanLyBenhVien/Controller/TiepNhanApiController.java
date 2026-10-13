package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.ChiSoTruocKhamDTO;
import QuanLyBenhVien.Service.ChiSoTruocKhamService;
import QuanLyBenhVien.Service.TiepNhanDashboardService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

//BỔ SUNG CODE CHO VỊ TRÍ PHÒNG

@RestController
@RequestMapping("/api/tiepnhan")
public class TiepNhanApiController {

    private static final Logger log =
            LoggerFactory.getLogger(TiepNhanApiController.class);

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final TiepNhanDashboardService tiepNhanDashboardService;
    private final ChiSoTruocKhamService chiSoTruocKhamService;
    private final JdbcTemplate jdbcTemplate;

    public TiepNhanApiController(
            TiepNhanDashboardService tiepNhanDashboardService,
            ChiSoTruocKhamService chiSoTruocKhamService,
            JdbcTemplate jdbcTemplate
    ) {
        this.tiepNhanDashboardService = tiepNhanDashboardService;
        this.chiSoTruocKhamService = chiSoTruocKhamService;
        this.jdbcTemplate = jdbcTemplate;
    }

    // Truy vấn thông tin lịch khám dùng chung.
    private static final String SQL_LICH_KHAM = """
            SELECT
                lk.MaLichKham,
                lk.MaBenhNhan,
                lk.MaBacSi,
                lk.MaKhoa,
                lk.MaSoThuTu,
                lk.NgayKham,
                lk.GioKham,
                lk.TrangThai,
                lk.LyDoKham,

                nd.HoTen,
                nd.SoDienThoai,

                bn.NgaySinh,
                bn.GioiTinh,
                bn.DiaChi,

                k.TenKhoa AS ChuyenKhoa,
                ndBacSi.HoTen AS TenBacSi,
                s.SoThuTu,

                (
                    SELECT p.TenPhong
                    FROM lichlamviec lv
                    JOIN phongchuyentrach p
                      ON p.MaPhong = lv.MaPhong
                    WHERE lv.MaBacSi = lk.MaBacSi
                      AND lv.NgayLamViec = lk.NgayKham
                      AND lk.GioKham >= lv.GioBatDau
                      AND lk.GioKham < lv.GioKetThuc
                    ORDER BY lv.MaLichLamViec
                    LIMIT 1
                ) AS TenPhong,
                (
                    SELECT p.ViTri
                    FROM lichlamviec lv
                    JOIN phongchuyentrach p
                      ON p.MaPhong = lv.MaPhong
                    WHERE lv.MaBacSi = lk.MaBacSi
                      AND lv.NgayLamViec = lk.NgayKham
                      AND lk.GioKham >= lv.GioBatDau
                      AND lk.GioKham < lv.GioKetThuc
                    ORDER BY lv.MaLichLamViec
                    LIMIT 1
                ) AS ViTriPhong

            FROM lichdangkykham lk

            JOIN benhnhan bn
              ON bn.MaBenhNhan = lk.MaBenhNhan

            JOIN nguoidung nd
              ON nd.MaNguoiDung = bn.MaNguoiDung

            JOIN bacsi bs
              ON bs.MaBacSi = lk.MaBacSi

            JOIN nguoidung ndBacSi
              ON ndBacSi.MaNguoiDung = bs.MaNguoiDung

            JOIN khoa k
              ON k.MaKhoa = lk.MaKhoa

            LEFT JOIN sothutu s
              ON s.MaSoThuTu = lk.MaSoThuTu
            """;

    // 1. Dashboard.
    @GetMapping("/dashboard-data")
    public ResponseEntity<?> getDashboardData(
            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        return ResponseEntity.ok(
                tiepNhanDashboardService.getDashboardData()
        );
    }

    // 2. Gọi bệnh nhân.
    // JavaScript phát loa sau khi API thành công.
    public record GoiBenhNhanRequest(Integer maLichKham) {
    }

    @PostMapping("/call-patient")
    public ResponseEntity<?> callPatient(
            Authentication authentication,
            @RequestBody GoiBenhNhanRequest request
    ) {
        kiemTraQuyen(authentication);

        if (request == null
                || request.maLichKham() == null
                || request.maLichKham() <= 0) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "success", false,
                            "message", "Vui lòng chọn lịch khám cần gọi."
                    )
            );
        }

        Integer maLichKham = request.maLichKham();

        List<Map<String, Object>> danhSach =
                jdbcTemplate.queryForList(
                        SQL_LICH_KHAM + " WHERE lk.MaLichKham = ?",
                        maLichKham
                );

        if (danhSach.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of(
                            "success", false,
                            "message", "Không tìm thấy lịch khám."
                    )
            );
        }

        boolean thanhCong =
                tiepNhanDashboardService.updateTrangThaiHangDoi(
                        String.valueOf(maLichKham),
                        "DaGoi"
                );

        if (!thanhCong) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of(
                            "success", false,
                            "message",
                            "Không thể gọi lịch này. "
                                    + "Chỉ gọi lịch hôm nay "
                                    + "chưa được tiếp nhận khám."
                    )
            );
        }

        Map<String, Object> lichKham = danhSach.get(0);
        Map<String, Object> response = new HashMap<>();

        response.put("success", true);
        response.put("message", "Đã ghi nhận gọi bệnh nhân.");
        response.put("maLichKham", maLichKham);
        response.put("maBenhNhan", lichKham.get("MaBenhNhan"));
        response.put("tenBenhNhan", lichKham.get("HoTen"));
        response.put("soThuTu", lichKham.get("SoThuTu"));
        response.put("phong", lichKham.get("TenPhong"));
        response.put("khoa", lichKham.get("ChuyenKhoa"));
        response.put("trangThai", "DaGoi");

        return ResponseEntity.ok(response);
    }

    // 3. Đọc số đo đã lưu theo mã lịch khám.
    @GetMapping("/chi-so-truoc-kham/{maLichKham}")
    public ResponseEntity<ChiSoTruocKhamDTO> getChiSoTruocKham(
            Authentication authentication,
            @PathVariable("maLichKham") Integer maLichKham
    ) {
        kiemTraQuyen(authentication);

        return ResponseEntity.ok(
                chiSoTruocKhamService.getChiSo(maLichKham)
        );
    }

    // 4. Lưu số đo trước khám.
    // Không xác nhận tiếp nhận và không chuyển sang DangKham.
    @PostMapping("/chi-so-truoc-kham")
    public ResponseEntity<?> luuChiSoTruocKham(
            Authentication authentication,
            @RequestBody ChiSoTruocKhamDTO request
    ) {
        kiemTraQuyen(authentication);

        chiSoTruocKhamService.luuChiSo(request);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Đã lưu số đo trước khám.",
                        "maLichKham", request.getMaLichKham()
                )
        );
    }

    // 5. Tra cứu bệnh nhân.
    @GetMapping("/patient-search")
    public ResponseEntity<?> searchPatient(
            Authentication authentication,
            @RequestParam("keyword") String keyword
    ) {
        kiemTraQuyen(authentication);

        String tuKhoa = keyword.trim();

        if (tuKhoa.isEmpty() || tuKhoa.length() > 100) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "Nhập từ khóa từ 1 đến 100 ký tự."
                    )
            );
        }

        String sql = """
                SELECT
                    bn.MaBenhNhan,
                    bn.NgaySinh,
                    bn.GioiTinh,
                    bn.DiaChi,
                    nd.HoTen,
                    nd.SoDienThoai

                FROM benhnhan bn
                JOIN nguoidung nd
                  ON nd.MaNguoiDung = bn.MaNguoiDung

                WHERE CAST(bn.MaBenhNhan AS CHAR) = ?
                   OR nd.SoDienThoai = ?
                   OR nd.HoTen LIKE ?

                ORDER BY bn.MaBenhNhan
                LIMIT 2
                """;

        List<Map<String, Object>> danhSach =
                jdbcTemplate.queryForList(
                        sql,
                        tuKhoa,
                        tuKhoa,
                        "%" + tuKhoa + "%"
                );

        if (danhSach.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("message", "Không tìm thấy bệnh nhân.")
            );
        }

        if (danhSach.size() > 1) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of(
                            "message",
                            "Có nhiều bệnh nhân phù hợp. "
                                    + "Hãy tìm bằng mã bệnh nhân "
                                    + "hoặc số điện thoại."
                    )
            );
        }

        Map<String, Object> patient =
                new HashMap<>(danhSach.get(0));

        patient.put(
                "rawMaBenhNhan",
                patient.get("MaBenhNhan").toString()
        );

        List<Map<String, Object>> lichHen =
                jdbcTemplate.queryForList(
                        SQL_LICH_KHAM + """
                                 WHERE lk.MaBenhNhan = ?
                                   AND lk.NgayKham = ?
                                 ORDER BY lk.GioKham, lk.MaLichKham
                                """,
                        patient.get("MaBenhNhan"),
                        homNay()
                );

        patient.put("coLichHen", !lichHen.isEmpty());
        patient.put("danhSachLichHen", lichHen);

        if (!lichHen.isEmpty()) {
            patient.put("lichHen", lichHen.get(0));
        }

        return ResponseEntity.ok(patient);
    }

    // 6. Chặn luồng tiếp nhận cũ.
    // Bác sĩ thực hiện xác nhận tiếp nhận khám.
    @PostMapping("/checkin")
    public ResponseEntity<?> doCheckIn(
            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of(
                        "success", false,
                        "message",
                        "Xác nhận tiếp nhận khám thuộc bác sĩ. "
                                + "Nhân viên thực hiện gọi bệnh nhân "
                                + "và ghi thông tin trước khám."
                )
        );
    }

    // 7. Lịch chờ gọi tiếp theo hôm nay.
    @GetMapping("/next-appointment")
    public ResponseEntity<?> getNextAppointment(
            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        String sql = SQL_LICH_KHAM + """
                 WHERE lk.NgayKham = ?
                   AND lk.TrangThai IN (
                       'ChoKham',
                       'DaDat',
                       'DaXacNhan'
                   )
                   AND NOT EXISTS (
                       SELECT 1
                       FROM hosobenhan h
                       WHERE h.MaLichKham = lk.MaLichKham
                         AND h.TrangThai IN (
                             'DangKham',
                             'HoanTat'
                         )
                   )
                 ORDER BY lk.GioKham, lk.MaLichKham
                 LIMIT 1
                """;

        List<Map<String, Object>> danhSach =
                jdbcTemplate.queryForList(sql, homNay());

        if (danhSach.isEmpty()) {
            return ResponseEntity.ok(
                    Map.of(
                            "hasData", false,
                            "message", "Không còn lịch chờ gọi hôm nay."
                    )
            );
        }

        Map<String, Object> response =
                new HashMap<>(danhSach.get(0));

        response.put("hasData", true);

        return ResponseEntity.ok(response);
    }

    // 8. Toàn bộ lịch hẹn hôm nay.
    @GetMapping("/lich-hen-hom-nay")
    public ResponseEntity<?> getLichHenHomNay(
            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        String sql = SQL_LICH_KHAM + """
                 WHERE lk.NgayKham = ?
                 ORDER BY lk.GioKham, lk.MaBacSi, lk.MaLichKham
                """;

        return ResponseEntity.ok(
                jdbcTemplate.queryForList(sql, homNay())
        );
    }

    // 9. Lịch sử tiếp nhận đã ghi trong database.
    @GetMapping("/lich-su-tiep-nhan")
    public ResponseEntity<?> getLichSuTiepNhan(
            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        String sql = """
                SELECT
                    t.MaTiepNhan,
                    t.ThoiGianTiepNhan,
                    t.ThoiGianTiepNhan AS NgayKham,
                    lk.MaLichKham,
                    lk.MaBenhNhan,
                    lk.TrangThai,
                    nd.HoTen,
                    k.TenKhoa AS Khoa,
                    s.SoThuTu

                FROM tiepnhanbenhnhan t

                JOIN lichdangkykham lk
                  ON lk.MaLichKham = t.MaLichKham

                JOIN benhnhan bn
                  ON bn.MaBenhNhan = lk.MaBenhNhan

                JOIN nguoidung nd
                  ON nd.MaNguoiDung = bn.MaNguoiDung

                JOIN khoa k
                  ON k.MaKhoa = lk.MaKhoa

                LEFT JOIN sothutu s
                  ON s.MaSoThuTu = lk.MaSoThuTu

                ORDER BY
                    t.ThoiGianTiepNhan DESC,
                    t.MaTiepNhan DESC
                LIMIT 5
                """;

        return ResponseEntity.ok(
                jdbcTemplate.queryForList(sql)
        );
    }

    // Kiểm tra tài khoản có quyền nhân viên tiếp nhận.
    private void kiemTraQuyen(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(
                authentication.getPrincipal()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập."
            );
        }

        boolean laNhanVienTiepNhan =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(
                                quyen -> "ROLE_TIEPNHAN".equals(
                                        quyen.getAuthority()
                                )
                        );

        if (!laNhanVienTiepNhan) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản không có quyền tiếp nhận."
            );
        }
    }

    private LocalDate homNay() {
        return LocalDate.now(MUI_GIO);
    }

    // Trả lỗi quyền và lỗi kiểm tra nghiệp vụ dưới dạng JSON.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> xuLyLoiQuyen(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        return ResponseEntity.status(
                exception.getStatusCode()
        ).body(
                Map.of(
                        "success", false,
                        "message",
                        message != null
                                ? message
                                : "Yêu cầu không hợp lệ."
                )
        );
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        log.error(
                "Lỗi truy vấn API nhân viên tiếp nhận",
                exception
        );

        return ResponseEntity.internalServerError().body(
                Map.of(
                        "success", false,
                        "message",
                        "Không thể xử lý dữ liệu. "
                                + "Kiểm tra nhật ký Spring Boot."
                )
        );
    }
}