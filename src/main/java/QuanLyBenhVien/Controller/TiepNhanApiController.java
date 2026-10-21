package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.ChiSoTruocKhamDTO;
import QuanLyBenhVien.Service.ChiSoTruocKhamService;
import QuanLyBenhVien.Service.TiepNhanDashboardService;
import QuanLyBenhVien.Service.TiepNhanPhanCongService;
import QuanLyBenhVien.Service.TiepNhanPhanCongService.CaTrucHienTai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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
    private final TiepNhanPhanCongService phanCongService;
    private final JdbcTemplate jdbcTemplate;

    public TiepNhanApiController(
            TiepNhanDashboardService tiepNhanDashboardService,
            ChiSoTruocKhamService chiSoTruocKhamService,
            TiepNhanPhanCongService phanCongService,
            JdbcTemplate jdbcTemplate
    ) {
        this.tiepNhanDashboardService = tiepNhanDashboardService;
        this.chiSoTruocKhamService = chiSoTruocKhamService;
        this.phanCongService = phanCongService;
        this.jdbcTemplate = jdbcTemplate;
    }

    // =========================================================
    // TRUY VẤN THÔNG TIN LỊCH KHÁM DÙNG CHUNG
    // =========================================================

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
                    ORDER BY
                        lv.GioBatDau DESC,
                        lv.MaLichLamViec DESC
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
             AND s.MaKhoa = lk.MaKhoa
             AND s.NgayCapSo = lk.NgayKham
            """;

    // =========================================================
    // 1. DASHBOARD
    // Service đã kiểm tra tài khoản, ca trực và khoa phụ trách.
    // =========================================================

    @GetMapping("/dashboard-data")
    public ResponseEntity<?> getDashboardData(
            Authentication authentication
    ) {
        return thanhCong(
                tiepNhanDashboardService.getDashboardData()
        );
    }

    // =========================================================
    // 2. GỌI BỆNH NHÂN
    // =========================================================

    public record GoiBenhNhanRequest(Integer maLichKham) {
    }

    @PostMapping("/call-patient")
    public ResponseEntity<?> callPatient(
            Authentication authentication,
            @RequestBody GoiBenhNhanRequest request
    ) {
        CaTrucHienTai caTruc = layCaTruc(authentication);

        if (request == null || !maHopLe(request.maLichKham())) {
            return phanHoiLoi(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn lịch khám cần gọi."
            );
        }

        Integer maLichKham = request.maLichKham();

        Map<String, Object> lichKham =
                layLichKhamTrongKhoa(
                        maLichKham,
                        caTruc.maKhoa()
                );

        boolean daGoi =
                tiepNhanDashboardService.updateTrangThaiHangDoi(
                        String.valueOf(maLichKham),
                        "DaGoi"
                );

        if (!daGoi) {
            return phanHoiLoi(
                    HttpStatus.CONFLICT,
                    "Không thể gọi tiếp nhận lịch này. "
                            + "Lịch phải thuộc hôm nay, ở trạng thái "
                            + "Chờ gọi hoặc Đã gọi và ca trực còn hiệu lực. "
                            + "Hãy làm mới dữ liệu."
            );
        }

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
        response.put("trangThaiHienThi", "Đã gọi");

        return thanhCong(response);
    }

    // =========================================================
    // 3. XEM SỐ ĐO ĐÃ LƯU
    // Có thể xem lịch cũ nhưng phải thuộc khoa đang phụ trách.
    // =========================================================

    @GetMapping("/chi-so-truoc-kham/{maLichKham}")
    public ResponseEntity<ChiSoTruocKhamDTO> getChiSoTruocKham(
            Authentication authentication,
            @PathVariable("maLichKham") Integer maLichKham
    ) {
        phanCongService.kiemTraQuyenVoiLichKham(
                authentication,
                maLichKham
        );

        return thanhCong(
                chiSoTruocKhamService.getChiSo(maLichKham)
        );
    }

    // =========================================================
    // 4. LƯU SỐ ĐO
    // Chỉ cho sửa lịch hôm nay đang ở trạng thái DaGoi.
    // =========================================================

    @PostMapping("/chi-so-truoc-kham")
    @Transactional
    public ResponseEntity<?> luuChiSoTruocKham(
            Authentication authentication,
            @RequestBody ChiSoTruocKhamDTO request
    ) {
        CaTrucHienTai caTruc = layCaTruc(authentication);

        if (request == null || !maHopLe(request.getMaLichKham())) {
            return phanHoiLoi(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn lịch khám cần lưu số đo."
            );
        }

        /*
         * Giữ khóa lịch trong cùng transaction với thao tác lưu.
         * Tránh sửa số đo đồng thời với việc xác nhận tiếp nhận.
         */
        String sql = """
                SELECT MaLichKham
                FROM lichdangkykham
                WHERE MaLichKham = ?
                  AND MaKhoa = ?
                  AND NgayKham = ?
                  AND TrangThai = 'DaGoi'
                FOR UPDATE
                """;

        List<Integer> lichChoPhep = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> rs.getInt("MaLichKham"),
                request.getMaLichKham(),
                caTruc.maKhoa(),
                homNay()
        );

        if (lichChoPhep.isEmpty()) {
            return phanHoiLoi(
                    HttpStatus.CONFLICT,
                    "Không thể sửa số đo. "
                            + "Lịch phải thuộc khoa đang phụ trách, "
                            + "có ngày khám hôm nay và đang ở trạng thái Đã gọi. "
                            + "Hãy làm mới hồ sơ."
            );
        }

        // Kiểm tra lại ca sau khi lấy được khóa lịch khám.
        phanCongService.kiemTraQuyenVoiLichKham(
                authentication,
                request.getMaLichKham()
        );

        chiSoTruocKhamService.luuChiSo(request);

        return thanhCong(
                Map.of(
                        "success", true,
                        "message",
                        "Đã lưu số đo trước khám. "
                                + "Bạn có thể xác nhận Đã tiếp nhận "
                                + "sau khi kiểm tra đầy đủ thông tin.",
                        "maLichKham", request.getMaLichKham()
                )
        );
    }

    // =========================================================
    // 5. XÁC NHẬN ĐÃ TIẾP NHẬN
    // Service cập nhật trạng thái và lưu người tiếp nhận.
    // =========================================================

    public record XacNhanTiepNhanRequest(Integer maLichKham) {
    }

    @PostMapping({
            "/confirm-reception",
            "/checkin"
    })
    public ResponseEntity<?> xacNhanTiepNhan(
            Authentication authentication,
            @RequestBody XacNhanTiepNhanRequest request
    ) {
        CaTrucHienTai caTruc = layCaTruc(authentication);

        if (request == null || !maHopLe(request.maLichKham())) {
            return phanHoiLoi(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn lịch khám cần xác nhận tiếp nhận."
            );
        }

        Integer maLichKham = request.maLichKham();

        kiemTraLichKhamTrongKhoa(
                maLichKham,
                caTruc.maKhoa()
        );

        boolean daTiepNhan =
                tiepNhanDashboardService.xacNhanTiepNhan(
                        String.valueOf(maLichKham)
                );

        if (!daTiepNhan) {
            return phanHoiLoi(
                    HttpStatus.CONFLICT,
                    "Chưa thể xác nhận tiếp nhận. "
                            + "Lịch phải thuộc hôm nay, đang Đã gọi, "
                            + "ca trực còn hiệu lực và đã lưu đủ "
                            + "cân nặng, chiều cao, huyết áp hợp lệ. "
                            + "Hãy làm mới dữ liệu để kiểm tra trạng thái."
            );
        }

        return thanhCong(
                Map.of(
                        "success", true,
                        "message",
                        "Đã tiếp nhận bệnh nhân. "
                                + "Bệnh nhân chờ bác sĩ bắt đầu khám.",
                        "maLichKham", maLichKham,
                        "trangThai", "DaTiepNhan",
                        "trangThaiHienThi", "Đã tiếp nhận"
                )
        );
    }

    // =========================================================
    // 6. TRA CỨU BỆNH NHÂN ĐỂ ĐĂNG KÝ KHÁM
    // Thông tin cơ bản được tra cứu trên toàn bệnh viện.
    // Chi tiết lịch hẹn chỉ trả về trong khoa đang phụ trách.
    // =========================================================

    @GetMapping("/patient-search")
    public ResponseEntity<?> searchPatient(
            Authentication authentication,
            @RequestParam("keyword") String keyword
    ) {
        CaTrucHienTai caTruc = layCaTruc(authentication);

        String tuKhoa = keyword.trim();

        if (tuKhoa.isEmpty() || tuKhoa.length() > 100) {
            return phanHoiLoi(
                    HttpStatus.BAD_REQUEST,
                    "Nhập từ khóa từ 1 đến 100 ký tự."
            );
        }

        String tuKhoaLike = tuKhoa
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");

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
                   OR nd.HoTen LIKE ? ESCAPE '!'
                ORDER BY bn.MaBenhNhan
                LIMIT 2
                """;

        List<Map<String, Object>> danhSach =
                jdbcTemplate.queryForList(
                        sql,
                        tuKhoa,
                        tuKhoa,
                        "%" + tuKhoaLike + "%"
                );

        if (danhSach.isEmpty()) {
            return phanHoiLoi(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy bệnh nhân."
            );
        }

        if (danhSach.size() > 1) {
            return phanHoiLoi(
                    HttpStatus.CONFLICT,
                    "Có nhiều bệnh nhân phù hợp. "
                            + "Hãy tìm bằng mã bệnh nhân hoặc số điện thoại."
            );
        }

        Map<String, Object> patient =
                new HashMap<>(danhSach.get(0));

        Object maBenhNhan = patient.get("MaBenhNhan");

        patient.put(
                "rawMaBenhNhan",
                maBenhNhan.toString()
        );

        LocalDate ngay = homNay();

        List<Map<String, Object>> lichHen =
                jdbcTemplate.queryForList(
                        SQL_LICH_KHAM + """
                                 WHERE lk.MaBenhNhan = ?
                                   AND lk.NgayKham = ?
                                   AND lk.MaKhoa = ?
                                 ORDER BY
                                     lk.GioKham,
                                     lk.MaLichKham
                                """,
                        maBenhNhan,
                        ngay,
                        caTruc.maKhoa()
                );

        /*
         * Không hiểu nhầm là chưa có lịch
         * khi bệnh nhân đã đăng ký ở khoa khác.
         */
        Long soLichKhacKhoa = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM lichdangkykham
                WHERE MaBenhNhan = ?
                  AND NgayKham = ?
                  AND MaKhoa <> ?
                """,
                Long.class,
                maBenhNhan,
                ngay,
                caTruc.maKhoa()
        );

        if (lichHen.isEmpty()
                && soLichKhacKhoa != null
                && soLichKhacKhoa > 0) {

            return phanHoiLoi(
                    HttpStatus.CONFLICT,
                    "Bệnh nhân đã có lịch khám hôm nay tại khoa khác. "
                            + "Vui lòng hướng dẫn bệnh nhân đến khoa đã đăng ký."
            );
        }

        patient.put("coLichHen", !lichHen.isEmpty());
        patient.put("danhSachLichHen", lichHen);

        if (!lichHen.isEmpty()) {
            patient.put("lichHen", lichHen.get(0));
        }

        return thanhCong(patient);
    }

    // =========================================================
    // 7. LỊCH CHỜ GỌI TIẾP THEO CỦA KHOA
    // =========================================================

    @GetMapping("/next-appointment")
    public ResponseEntity<?> getNextAppointment(
            Authentication authentication
    ) {
        CaTrucHienTai caTruc = layCaTruc(authentication);

        String sql = SQL_LICH_KHAM + """
                 WHERE lk.NgayKham = ?
                   AND lk.MaKhoa = ?
                   AND lk.TrangThai = 'ChoGoi'
                 ORDER BY
                     lk.GioKham,
                     s.SoThuTu,
                     lk.MaLichKham
                 LIMIT 1
                """;

        List<Map<String, Object>> danhSach =
                jdbcTemplate.queryForList(
                        sql,
                        homNay(),
                        caTruc.maKhoa()
                );

        if (danhSach.isEmpty()) {
            return thanhCong(
                    Map.of(
                            "hasData", false,
                            "message",
                            "Không còn lịch chờ gọi tiếp nhận hôm nay "
                                    + "tại khoa đang phụ trách."
                    )
            );
        }

        Map<String, Object> response =
                new HashMap<>(danhSach.get(0));

        response.put("hasData", true);

        return thanhCong(response);
    }

    // =========================================================
    // 8. LỊCH HẸN HÔM NAY CỦA KHOA
    // =========================================================

    @GetMapping("/lich-hen-hom-nay")
    public ResponseEntity<?> getLichHenHomNay(
            Authentication authentication
    ) {
        CaTrucHienTai caTruc = layCaTruc(authentication);

        String sql = SQL_LICH_KHAM + """
                 WHERE lk.NgayKham = ?
                   AND lk.MaKhoa = ?
                 ORDER BY
                     lk.GioKham,
                     lk.MaBacSi,
                     lk.MaLichKham
                """;

        return thanhCong(
                jdbcTemplate.queryForList(
                        sql,
                        homNay(),
                        caTruc.maKhoa()
                )
        );
    }

    // =========================================================
    // 9. LỊCH SỬ THAO TÁC TIẾP NHẬN CỦA KHOA
    // Kèm tài khoản đã thực tế tiếp nhận.
    // =========================================================

    @GetMapping("/lich-su-tiep-nhan")
    public ResponseEntity<?> getLichSuTiepNhan(
            Authentication authentication
    ) {
        CaTrucHienTai caTruc = layCaTruc(authentication);

        String sql = """
                SELECT
                    t.MaTiepNhan,
                    t.ThoiGianTiepNhan,
                    t.ThoiGianTiepNhan AS NgayKham,
                    t.TrangThai AS TrangThaiTiepNhan,

                    t.MaNhanVienTiepNhan,
                    t.MaPhanCong,
                    nv.HoTen AS TenNhanVienTiepNhan,
                    nv.TenDangNhap AS TaiKhoanTiepNhan,

                    lk.NgayKham AS NgayHenKham,
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

                LEFT JOIN nguoidung nv
                  ON nv.MaNguoiDung = t.MaNhanVienTiepNhan

                LEFT JOIN sothutu s
                  ON s.MaSoThuTu = lk.MaSoThuTu
                 AND s.MaKhoa = lk.MaKhoa
                 AND s.NgayCapSo = lk.NgayKham

                WHERE lk.MaKhoa = ?

                ORDER BY
                    t.ThoiGianTiepNhan DESC,
                    t.MaTiepNhan DESC

                LIMIT 5
                """;

        return thanhCong(
                jdbcTemplate.queryForList(
                        sql,
                        caTruc.maKhoa()
                )
        );
    }

    // =========================================================
    // HÀM HỖ TRỢ
    // =========================================================

    private CaTrucHienTai layCaTruc(
            Authentication authentication
    ) {
        return phanCongService.layCaTrucHienTai(
                authentication
        );
    }

    private boolean maHopLe(Integer ma) {
        return ma != null && ma > 0;
    }

    private LocalDate homNay() {
        return LocalDate.now(MUI_GIO);
    }

    private Map<String, Object> layLichKhamTrongKhoa(
            Integer maLichKham,
            Integer maKhoa
    ) {
        List<Map<String, Object>> danhSach =
                jdbcTemplate.queryForList(
                        SQL_LICH_KHAM
                                + " WHERE lk.MaLichKham = ?"
                                + " AND lk.MaKhoa = ?",
                        maLichKham,
                        maKhoa
                );

        if (danhSach.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám trong khoa đang phụ trách."
            );
        }

        return danhSach.get(0);
    }

    private void kiemTraLichKhamTrongKhoa(
            Integer maLichKham,
            Integer maKhoa
    ) {
        Long soLuong = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM lichdangkykham
                WHERE MaLichKham = ?
                  AND MaKhoa = ?
                """,
                Long.class,
                maLichKham,
                maKhoa
        );

        if (soLuong == null || soLuong == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám trong khoa đang phụ trách."
            );
        }
    }

    private <T> ResponseEntity<T> thanhCong(T body) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(body);
    }

    private ResponseEntity<?> phanHoiLoi(
            HttpStatus status,
            String message
    ) {
        return ResponseEntity.status(status)
                .cacheControl(CacheControl.noStore())
                .body(
                        Map.of(
                                "success", false,
                                "message", message
                        )
                );
    }

    // =========================================================
    // XỬ LÝ LỖI
    // =========================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        return ResponseEntity.status(exception.getStatusCode())
                .cacheControl(CacheControl.noStore())
                .body(
                        Map.of(
                                "success", false,
                                "message",
                                message == null || message.isBlank()
                                        ? "Yêu cầu không hợp lệ."
                                        : message
                        )
                );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> xuLyDuLieuKhongHopLe(
            IllegalArgumentException exception
    ) {
        return phanHoiLoi(
                HttpStatus.BAD_REQUEST,
                "Dữ liệu gửi lên không hợp lệ. "
                        + "Vui lòng kiểm tra thông tin nhập."
        );
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class
    })
    public ResponseEntity<?> xuLySaiDinhDang(
            Exception exception
    ) {
        return phanHoiLoi(
                HttpStatus.BAD_REQUEST,
                "Dữ liệu yêu cầu không đúng định dạng "
                        + "hoặc thiếu tham số bắt buộc."
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

        return phanHoiLoi(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không thể xử lý dữ liệu. "
                        + "Vui lòng thử lại hoặc liên hệ quản trị viên."
        );
    }
}