package QuanLyBenhVien.Controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * KPI cho Dashboard nhân viên chuyên trách.
 * Chỉ đọc dữ liệu hiện có; không sửa trạng thái bệnh nhân hoặc chỉ định.
 */
@RestController
@RequestMapping("/api/chuyen-trach/thong-ke")
public class ChuyenTrachThongKeController {

    private final JdbcTemplate jdbcTemplate;

    public ChuyenTrachThongKeController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/hom-nay")
    public Map<String, Object> thongKeHomNay(Authentication authentication) {
        boolean coQuyen = authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream().anyMatch(
                a -> "ROLE_CHUYENTRACH".equals(a.getAuthority())
        );

        if (!coQuyen) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bạn không có quyền xem thống kê chuyên trách.");
        }

        LocalDate ngay = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        // Một dòng cho MỖI lượt khám; chỉ tính lượt có chỉ định CLS đủ điều kiện.
        // Không đếm những lượt chỉ có chỉ định ChoThanhToan hoặc chưa có chỉ định.
        String sql = """
                SELECT l.MaLichKham,
                       COUNT(*) AS TongChiDinh,
                       SUM(CASE WHEN cd.TrangThai = 'DangThucHien'
                                THEN 1 ELSE 0 END) AS ChiDinhDangThucHien,
                       SUM(CASE WHEN cd.TrangThai = 'ChoThucHien'
                                THEN 1 ELSE 0 END) AS ChiDinhChoThucHien,
                       SUM(CASE WHEN cd.TrangThai = 'DaHoanThanh'
                                THEN 1 ELSE 0 END) AS ChiDinhHoanThanh
                  FROM LichDangKyKham l
                  JOIN HoSoBenhAn hs
                    ON hs.MaLichKham = l.MaLichKham
                  JOIN ChiDinhYTe cd
                    ON cd.MaHoSoBenhAn = hs.MaHoSoBenhAn
                 WHERE l.NgayKham = ?
                   AND cd.TrangThai IN ('ChoThucHien', 'DangThucHien', 'DaHoanThanh')
                 GROUP BY l.MaLichKham
                """;

        List<Map<String, Object>> luotKham = jdbcTemplate.queryForList(
                sql, Date.valueOf(ngay)
        );

        int choThucHien = 0;
        int dangThucHien = 0;
        int daHoanThanh = 0;

        for (Map<String, Object> luot : luotKham) {
            int tongChiDinh = ((Number) luot.get("TongChiDinh")).intValue();
            int soChiDinhDangThucHien = ((Number) luot.get("ChiDinhDangThucHien")).intValue();
            int soChiDinhChoThucHien = ((Number) luot.get("ChiDinhChoThucHien")).intValue();
            int soChiDinhHoanThanh = ((Number) luot.get("ChiDinhHoanThanh")).intValue();

            // CLS chỉ hoàn thành khi TẤT CẢ chỉ định đủ điều kiện đã hoàn thành.
            // Ưu tiên DangThucHien trước ChoThucHien theo quy tắc tổng hợp hiện tại.
            if (tongChiDinh > 0 && tongChiDinh == soChiDinhHoanThanh) {
                daHoanThanh++;
            } else if (soChiDinhDangThucHien > 0) {
                dangThucHien++;
            } else if (soChiDinhChoThucHien > 0) {
                choThucHien++;
            }
        }

        Map<String, Object> ketQua = new LinkedHashMap<>();
        ketQua.put("ngay", ngay.toString());
        ketQua.put("tongLuotCLS", luotKham.size());
        ketQua.put("choThucHien", choThucHien);
        ketQua.put("dangThucHien", dangThucHien);
        ketQua.put("daHoanThanh", daHoanThanh);
        return ketQua;
    }
}
