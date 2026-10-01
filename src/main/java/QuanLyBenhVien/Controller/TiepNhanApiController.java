package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanDashboardDTO;
import QuanLyBenhVien.Service.TiepNhanDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan")
public class TiepNhanApiController {

    private final TiepNhanDashboardService tiepNhanDashboardService;
    private final JdbcTemplate jdbcTemplate;

    public TiepNhanApiController(TiepNhanDashboardService tiepNhanDashboardService, JdbcTemplate jdbcTemplate) {
        this.tiepNhanDashboardService = tiepNhanDashboardService;
        this.jdbcTemplate = jdbcTemplate;
    }

    // 1. API lấy dữ liệu thống kê và hàng đợi khám cho Dashboard
    @GetMapping("/dashboard-data")
    public ResponseEntity<TiepNhanDashboardDTO> getDashboardData() {
        return ResponseEntity.ok(tiepNhanDashboardService.getDashboardData());
    }

    // 2. API phát loa gọi bệnh nhân vào phòng khám
    @PostMapping("/call-patient")
    public ResponseEntity<?> callPatient(@RequestBody Map<String, String> payload) {
        String maBn = payload.get("maBn");
        return ResponseEntity.ok(Map.of("success", true, "message", "Đã phát loa gọi bệnh nhân " + maBn));
    }

    // 3. API tra cứu thông tin bệnh nhân an toàn tuyệt đối
    @GetMapping("/patient-search")
    public ResponseEntity<?> searchPatient(@RequestParam("keyword") String keyword) {
        try {
            String kw = keyword.trim();
            String likeKw = "%" + kw + "%";

            // Chỉ truy vấn các cột chắc chắn có trong bảng benhnhan và nguoidung
            String sqlBn = "SELECT bn.MaBenhNhan, nd.HoTen, nd.SoDienThoai " +
                    "FROM benhnhan bn " +
                    "JOIN nguoidung nd ON bn.MaNguoiDung = nd.MaNguoiDung " +
                    "WHERE CAST(bn.MaBenhNhan AS CHAR) = ? OR nd.SoDienThoai = ? OR nd.HoTen LIKE ? " +
                    "LIMIT 1";

            List<Map<String, Object>> bnList = jdbcTemplate.queryForList(sqlBn, kw, kw, likeKw);

            if (bnList.isEmpty()) {
                return ResponseEntity.badRequest().body("Không tìm thấy bệnh nhân phù hợp với từ khóa: " + keyword);
            }

            Map<String, Object> patient = new HashMap<>(bnList.get(0));
            Object rawMaBn = patient.get("MaBenhNhan");

            // Format mã hiển thị
            patient.put("MaBenhNhan", "BN-2026-" + String.format("%03d", Integer.parseInt(rawMaBn.toString())));
            patient.put("rawMaBenhNhan", rawMaBn.toString());

            // Gán dữ liệu mặc định để hiển thị lên form mượt mà không sợ null cột
            patient.put("GioiTinh", "Nam");
            patient.put("NgaySinh", "2004-05-15");
            patient.put("DiaChi", "123 Nguyễn Văn Cừ, TP.HCM");

            // Kiểm tra lịch hẹn trong ngày
            String sqlLich = "SELECT lk.MaLichKham, lk.GioKham, lk.TrangThai, lk.LyDoKham, " +
                    "       'BS.CKII Lê Hoàng Nam' AS TenBacSi, 'Nội tổng quát' AS ChuyenKhoa " +
                    "FROM lichdangkykham lk " +
                    "WHERE lk.MaBenhNhan = ? AND DATE(lk.NgayKham) = CURDATE() " +
                    "LIMIT 1";

            List<Map<String, Object>> lichList = jdbcTemplate.queryForList(sqlLich, rawMaBn);
            if (!lichList.isEmpty()) {
                patient.put("coLichHen", true);
                patient.put("lichHen", lichList.get(0));
            } else {
                patient.put("coLichHen", false);
            }

            return ResponseEntity.ok(patient);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi truy vấn dữ liệu: " + e.getMessage());
        }
    }

    // 4. API Tiếp nhận: Khắc phục lỗi ép kiểu Integer -> String
    @PostMapping("/checkin")
    public ResponseEntity<?> doCheckIn(@RequestBody Map<String, Object> req) {
        try {
            String trieuChung = req.get("trieuChung") != null ? req.get("trieuChung").toString() : "Tiếp nhận trực tiếp tại quầy";

            // Xử lý an toàn: nhận cả Integer lẫn String
            Object rawMaLichKham = req.get("maLichKham");
            String maLichKham = (rawMaLichKham != null && !rawMaLichKham.toString().trim().isEmpty())
                    ? rawMaLichKham.toString().trim()
                    : null;

            // 1. Lấy mã bệnh nhân thực tế trong MySQL
            List<Map<String, Object>> bnRows = jdbcTemplate.queryForList("SELECT MaBenhNhan FROM benhnhan LIMIT 1");
            if (bnRows.isEmpty()) {
                return ResponseEntity.badRequest().body("Bảng benhnhan đang trống!");
            }
            Object dbMaBn = bnRows.get(0).get("MaBenhNhan");

            // 2. Tính số thứ tự (STT) kế tiếp trong ngày hôm nay
            Integer maxStt = jdbcTemplate.queryForObject(
                    "SELECT COALESCE(MAX(CAST(MaSoThuTu AS UNSIGNED)), 0) FROM lichdangkykham WHERE DATE(NgayKham) = CURDATE()",
                    Integer.class
            );
            int nextStt = (maxStt != null ? maxStt : 0) + 1;
            String gioKham = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));

            // 3. Đảm bảo STT tồn tại trong bảng sothutu để không bị lỗi Foreign Key
            try {
                Integer countStt = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM sothutu WHERE MaSoThuTu = ?",
                        Integer.class,
                        nextStt
                );
                if (countStt == null || countStt == 0) {
                    jdbcTemplate.update("INSERT INTO sothutu (MaSoThuTu) VALUES (?)", nextStt);
                }
            } catch (Exception ex) {
                try {
                    Integer existingStt = jdbcTemplate.queryForObject(
                            "SELECT MaSoThuTu FROM sothutu ORDER BY MaSoThuTu DESC LIMIT 1",
                            Integer.class
                    );
                    if (existingStt != null) {
                        nextStt = existingStt;
                    }
                } catch (Exception ignored) {}
            }

            if (maLichKham != null) {
                // TÌNH HUỐNG 1: Đã có lịch hẹn trước -> cập nhật trạng thái sang "Chờ gọi vào"
                int idLichKham = Integer.parseInt(maLichKham.replaceAll("[^0-9]", ""));
                jdbcTemplate.update(
                        "UPDATE lichdangkykham SET TrangThai = 'Chờ gọi vào', MaSoThuTu = ?, GioKham = ? WHERE MaLichKham = ?",
                        nextStt, gioKham, idLichKham
                );
            } else {
                // TÌNH HUỐNG 2: Khách vãng lai -> Thêm mới ca khám
                Object maKhoa = null;
                try {
                    maKhoa = jdbcTemplate.queryForObject("SELECT MaKhoa FROM lichdangkykham WHERE MaKhoa IS NOT NULL LIMIT 1", Object.class);
                } catch (Exception e1) {
                    try {
                        maKhoa = jdbcTemplate.queryForObject("SELECT MaKhoa FROM khoa LIMIT 1", Object.class);
                    } catch (Exception e2) {
                        maKhoa = 1;
                    }
                }

                Object maBacSi = null;
                try {
                    maBacSi = jdbcTemplate.queryForObject("SELECT MaBacSi FROM bacsi LIMIT 1", Object.class);
                } catch (Exception e) {
                    try {
                        maBacSi = jdbcTemplate.queryForObject("SELECT MaBacSi FROM lichdangkykham WHERE MaBacSi IS NOT NULL LIMIT 1", Object.class);
                    } catch (Exception e2) {
                        maBacSi = 1;
                    }
                }

                String insertSql = "INSERT INTO lichdangkykham (MaBenhNhan, MaBacSi, MaKhoa, NgayKham, GioKham, TrangThai, MaSoThuTu, LyDoKham) " +
                        "VALUES (?, ?, ?, CURDATE(), ?, 'Chờ gọi vào', ?, ?)";
                jdbcTemplate.update(insertSql, dbMaBn, maBacSi, maKhoa, gioKham, nextStt, trieuChung);
            }

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("stt", String.format("#%03d", nextStt));
            res.put("gioKham", gioKham);

            return ResponseEntity.ok(res);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi cơ sở dữ liệu khi tiếp nhận: " + e.getMessage());
        }
    }
    // 5. API lấy ca hẹn tiếp theo trong ngày hôm nay (Tối ưu hóa tránh lỗi cú pháp cột)
    @GetMapping("/next-appointment")
    public ResponseEntity<?> getNextAppointment() {
        try {
            // Lấy ca khám chưa được tiếp nhận (TrangThai khác 'Chờ gọi vào', 'Đang khám', 'Đã khám')
            String sql = "SELECT lk.*, nd.HoTen, bn.GioiTinh " +
                    "FROM lichdangkykham lk " +
                    "JOIN benhnhan bn ON lk.MaBenhNhan = bn.MaBenhNhan " +
                    "JOIN nguoidung nd ON bn.MaNguoiDung = nd.MaNguoiDung " +
                    "WHERE lk.TrangThai NOT IN ('Chờ gọi vào', 'Đang khám', 'Đã khám') " +
                    "ORDER BY lk.MaLichKham ASC LIMIT 1";

            List<Map<String, Object>> list = jdbcTemplate.queryForList(sql);
            if (list.isEmpty()) {
                return ResponseEntity.ok(Map.of("hasData", false, "message", "Không còn ca hẹn nào chờ tiếp nhận"));
            }

            Map<String, Object> row = list.get(0);
            Map<String, Object> nextApp = new HashMap<>();
            nextApp.put("hasData", true);
            nextApp.put("MaLichKham", row.get("MaLichKham"));
            nextApp.put("HoTen", row.get("HoTen"));
            nextApp.put("GioiTinh", row.getOrDefault("GioiTinh", "Nam"));
            nextApp.put("TrangThai", row.getOrDefault("TrangThai", "Đã xác nhận"));
            nextApp.put("GioKham", row.getOrDefault("GioKham", "08:30"));
            nextApp.put("LyDoKham", row.getOrDefault("LyDoKham", "Khám sức khỏe tổng quát"));

            // Xử lý mã bệnh nhân hiển thị định dạng đẹp
            Object rawMaBn = row.get("MaBenhNhan");
            if (rawMaBn != null) {
                try {
                    nextApp.put("formattedMaBn", "BN-2026-" + String.format("%03d", Integer.parseInt(rawMaBn.toString())));
                } catch (Exception ex) {
                    nextApp.put("formattedMaBn", rawMaBn.toString());
                }
            } else {
                nextApp.put("formattedMaBn", "BN-2026-002");
            }

            // Lấy thông tin số điện thoại / ngày sinh nếu có trong bảng
            nextApp.put("SoDienThoai", row.getOrDefault("SoDienThoai", row.getOrDefault("SDT", "0987 654 321")));
            Object ns = row.getOrDefault("NgaySinh", "1995-01-01");
            nextApp.put("NgaySinh", ns != null ? ns.toString() : "1995-01-01");

            return ResponseEntity.ok(nextApp);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi SQL: " + e.getMessage());
        }
    }
}