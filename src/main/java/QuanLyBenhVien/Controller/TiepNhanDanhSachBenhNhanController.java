package QuanLyBenhVien.Controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/benh-nhan")
public class TiepNhanDanhSachBenhNhanController {

    private static final Logger logger =
            LoggerFactory.getLogger(
                    TiepNhanDanhSachBenhNhanController.class
            );

    private final JdbcTemplate jdbcTemplate;

    public TiepNhanDanhSachBenhNhanController(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /*
     * Danh sách bệnh nhân.
     *
     * Nếu có ngày khám, khoa hoặc bác sĩ:
     * chỉ lấy bệnh nhân có lịch khám phù hợp.
     *
     * Một bệnh nhân có nhiều lịch phù hợp
     * vẫn chỉ xuất hiện một lần.
     *
     * Nếu không truyền bộ lọc lịch khám:
     * lấy danh sách bệnh nhân toàn bệnh viện.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> layDanhSach(
            @RequestParam(
                    name = "keyword",
                    defaultValue = ""
            ) String keyword,

            @RequestParam(
                    name = "page",
                    defaultValue = "1"
            ) Integer page,

            @RequestParam(
                    name = "size",
                    defaultValue = "20"
            ) Integer size,

            @RequestParam(
                    name = "ngayKham",
                    required = false
            ) String ngayKham,

            @RequestParam(
                    name = "maKhoa",
                    required = false
            ) Integer maKhoa,

            @RequestParam(
                    name = "maBacSi",
                    required = false
            ) Integer maBacSi,

            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        String tuKhoa = keyword.strip();

        if (tuKhoa.codePointCount(0, tuKhoa.length()) > 100) {
            throw loiDuLieu(
                    "Từ khóa tìm kiếm không được vượt quá 100 ký tự."
            );
        }

        if (page == null || page < 1) {
            throw loiDuLieu(
                    "Số trang phải lớn hơn hoặc bằng 1."
            );
        }

        if (size == null || size < 1 || size > 100) {
            throw loiDuLieu(
                    "Số bệnh nhân mỗi trang phải từ 1 đến 100."
            );
        }

        kiemTraMa(maKhoa, "khoa");
        kiemTraMa(maBacSi, "bác sĩ");

        LocalDate ngay = docNgay(ngayKham);

        String sqlNguon = """
                FROM benhnhan bn
                JOIN nguoidung nd
                  ON nd.MaNguoiDung = bn.MaNguoiDung
                """;

        StringBuilder dieuKien =
                new StringBuilder(" WHERE 1 = 1 ");

        List<Object> thamSo = new ArrayList<>();

        if (!tuKhoa.isEmpty()) {
            dieuKien.append("""
                    AND (
                        CAST(bn.MaBenhNhan AS CHAR) = ?
                        OR nd.HoTen LIKE ? ESCAPE '!'
                        OR nd.SoDienThoai LIKE ? ESCAPE '!'
                    )
                    """);

            String tuKhoaLike = "%"
                    + escapeLike(tuKhoa)
                    + "%";

            thamSo.add(tuKhoa);
            thamSo.add(tuKhoaLike);
            thamSo.add(tuKhoaLike);
        }

        /*
         * Các bộ lọc cùng áp dụng trên một lịch khám.
         * Dùng EXISTS để không nhân bản bệnh nhân
         * khi có nhiều lịch khám.
         */
        if (ngay != null || maKhoa != null || maBacSi != null) {
            dieuKien.append("""
                    AND EXISTS (
                        SELECT 1
                        FROM lichdangkykham l
                        WHERE l.MaBenhNhan = bn.MaBenhNhan
                    """);

            if (ngay != null) {
                dieuKien.append(" AND l.NgayKham = ? ");
                thamSo.add(Date.valueOf(ngay));
            }

            if (maKhoa != null) {
                dieuKien.append(" AND l.MaKhoa = ? ");
                thamSo.add(maKhoa);
            }

            if (maBacSi != null) {
                dieuKien.append(" AND l.MaBacSi = ? ");
                thamSo.add(maBacSi);
            }

            dieuKien.append(") ");
        }

        Long tongBenhNhan = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) " + sqlNguon,
                Long.class
        );

        Long tongKetQua = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) " + sqlNguon + dieuKien,
                Long.class,
                thamSo.toArray()
        );

        long total = tongKetQua != null
                ? tongKetQua
                : 0L;

        long totalPages = total / size
                + (total % size == 0 ? 0 : 1);

        long offset = ((long) page - 1) * size;

        String sqlDanhSach = """
                SELECT
                    bn.MaBenhNhan,
                    nd.HoTen,
                    bn.NgaySinh,
                    bn.GioiTinh,
                    nd.SoDienThoai,
                    bn.DiaChi
                """
                + sqlNguon
                + dieuKien
                + """
                ORDER BY bn.MaBenhNhan DESC
                LIMIT ? OFFSET ?
                """;

        List<Object> thamSoDanhSach =
                new ArrayList<>(thamSo);

        thamSoDanhSach.add(size);
        thamSoDanhSach.add(offset);

        List<Map<String, Object>> danhSach =
                jdbcTemplate.query(
                        sqlDanhSach,
                        (rs, rowNum) -> {
                            Map<String, Object> item =
                                    new LinkedHashMap<>();

                            item.put(
                                    "maBenhNhan",
                                    rs.getInt("MaBenhNhan")
                            );

                            item.put(
                                    "hoTen",
                                    rs.getString("HoTen")
                            );

                            Date ngaySinh = rs.getDate("NgaySinh");

                            item.put(
                                    "ngaySinh",
                                    ngaySinh != null
                                            ? ngaySinh.toLocalDate().toString()
                                            : null
                            );

                            item.put(
                                    "gioiTinh",
                                    rs.getString("GioiTinh")
                            );

                            item.put(
                                    "soDienThoai",
                                    rs.getString("SoDienThoai")
                            );

                            item.put(
                                    "diaChi",
                                    rs.getString("DiaChi")
                            );

                            return item;
                        },
                        thamSoDanhSach.toArray()
                );

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put("success", true);
        response.put("items", danhSach);
        response.put("page", page);
        response.put("size", size);
        response.put("total", total);
        response.put("totalPages", totalPages);

        response.put(
                "tongBenhNhan",
                tongBenhNhan != null ? tongBenhNhan : 0L
        );

        return ResponseEntity.ok(response);
    }

    /*
     * Danh sách khoa dùng cho bộ lọc.
     *
     * GET /api/tiepnhan/benh-nhan/khoa
     */
    @GetMapping("/khoa")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> layDanhSachKhoa(
            Authentication authentication
    ) {
        kiemTraQuyen(authentication);

        String sql = """
                SELECT MaKhoa, TenKhoa
                FROM khoa
                ORDER BY TenKhoa ASC, MaKhoa ASC
                """;

        List<Map<String, Object>> items =
                jdbcTemplate.query(
                        sql,
                        (rs, rowNum) -> {
                            Map<String, Object> item =
                                    new LinkedHashMap<>();

                            item.put(
                                    "maKhoa",
                                    rs.getInt("MaKhoa")
                            );

                            item.put(
                                    "tenKhoa",
                                    rs.getString("TenKhoa")
                            );

                            return item;
                        }
                );

        return ResponseEntity.ok(
                Map.<String, Object>of(
                        "success", true,
                        "items", items
                )
        );
    }

    /*
     * Danh sách bác sĩ dùng cho bộ lọc.
     *
     * Nếu truyền ngày khám:
     * lấy bác sĩ có lịch khám vào ngày đó.
     *
     * Nếu truyền khoa:
     * lấy bác sĩ có lịch khám thuộc khoa đó.
     *
     * GET /api/tiepnhan/benh-nhan/bac-si
     *     ?ngayKham=2026-10-10
     *     &maKhoa=1
     */
    @GetMapping("/bac-si")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> layDanhSachBacSi(
            @RequestParam(
                    name = "ngayKham",
                    required = false
            ) String ngayKham,

            @RequestParam(
                    name = "maKhoa",
                    required = false
            ) Integer maKhoa,

            Authentication authentication
    ) {
        kiemTraQuyen(authentication);
        kiemTraMa(maKhoa, "khoa");

        LocalDate ngay = docNgay(ngayKham);

        StringBuilder sql = new StringBuilder("""
                SELECT bs.MaBacSi, nd.HoTen AS TenBacSi
                FROM bacsi bs
                JOIN nguoidung nd
                  ON nd.MaNguoiDung = bs.MaNguoiDung
                WHERE 1 = 1
                """);

        List<Object> thamSo = new ArrayList<>();

        if (ngay != null || maKhoa != null) {
            sql.append("""
                    AND EXISTS (
                        SELECT 1
                        FROM lichdangkykham l
                        WHERE l.MaBacSi = bs.MaBacSi
                    """);

            if (ngay != null) {
                sql.append(" AND l.NgayKham = ? ");
                thamSo.add(Date.valueOf(ngay));
            }

            if (maKhoa != null) {
                sql.append(" AND l.MaKhoa = ? ");
                thamSo.add(maKhoa);
            }

            sql.append(") ");
        }

        sql.append(" ORDER BY nd.HoTen ASC, bs.MaBacSi ASC ");

        List<Map<String, Object>> items =
                jdbcTemplate.query(
                        sql.toString(),
                        (rs, rowNum) -> {
                            Map<String, Object> item =
                                    new LinkedHashMap<>();

                            item.put(
                                    "maBacSi",
                                    rs.getInt("MaBacSi")
                            );

                            item.put(
                                    "tenBacSi",
                                    rs.getString("TenBacSi")
                            );

                            return item;
                        },
                        thamSo.toArray()
                );

        return ResponseEntity.ok(
                Map.<String, Object>of(
                        "success", true,
                        "items", items
                )
        );
    }

    private LocalDate docNgay(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String value = raw.strip();

        if (!value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw loiDuLieu(
                    "Ngày khám phải có định dạng yyyy-MM-dd."
            );
        }

        try {
            LocalDate ngay = LocalDate.parse(value);

            if (ngay.getYear() < 1000
                    || ngay.getYear() > 9999) {
                throw loiDuLieu(
                        "Năm của ngày khám phải từ 1000 đến 9999."
                );
            }

            return ngay;
        } catch (java.time.format.DateTimeParseException exception) {
            throw loiDuLieu("Ngày khám không hợp lệ.");
        }
    }

    private void kiemTraMa(Integer ma, String ten) {
        if (ma != null && ma < 1) {
            throw loiDuLieu(
                    "Mã " + ten + " phải là số nguyên dương."
            );
        }
    }

    private ResponseStatusException loiDuLieu(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }

    private String escapeLike(String value) {
        return value
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
    }

    private void kiemTraQuyen(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Vui lòng đăng nhập để xem danh sách bệnh nhân."
            );
        }

        boolean coQuyen = authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        "ROLE_TIEPNHAN".equals(
                                authority.getAuthority()
                        )
                );

        if (!coQuyen) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền xem danh sách "
                            + "tại phân hệ tiếp nhận."
            );
        }
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiNghiepVu(
            ResponseStatusException exception
    ) {
        String message = exception.getReason();

        if (message == null || message.isBlank()) {
            message = "Không thể thực hiện yêu cầu.";
        }

        return ResponseEntity
                .status(exception.getStatusCode())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message", message
                ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> xuLySaiKieuDuLieu(
            MethodArgumentTypeMismatchException exception
    ) {
        return ResponseEntity
                .badRequest()
                .body(Map.<String, Object>of(
                        "success", false,
                        "message",
                        "Số trang, số bệnh nhân mỗi trang, "
                                + "mã khoa và mã bác sĩ phải là số nguyên."
                ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        logger.error(
                "Lỗi truy vấn danh sách hoặc bộ lọc bệnh nhân.",
                exception
        );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.<String, Object>of(
                        "success", false,
                        "message",
                        "Không thể tải dữ liệu bệnh nhân. "
                                + "Vui lòng thử lại sau."
                ));
    }
}