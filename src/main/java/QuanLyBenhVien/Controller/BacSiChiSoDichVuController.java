
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.BacSiService;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/kham-benh/dich-vu")
public class BacSiChiSoDichVuController {

    private final JdbcTemplate jdbcTemplate;
    private final BacSiService bacSiService;

    public BacSiChiSoDichVuController(
            JdbcTemplate jdbcTemplate,
            BacSiService bacSiService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.bacSiService = bacSiService;
    }

    @GetMapping("/{maDichVu}/chi-so")
    public ResponseEntity<?> layThongSo(
            @PathVariable Integer maDichVu,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        Integer maNguoiDung =
                userDetails.getNguoiDung().getMaNguoiDung();

        BacSi bacSi = bacSiService
                .timBacSiTheoMaNguoiDung(maNguoiDung)
                .orElse(null);

        if (bacSi == null) {
            return ResponseEntity.status(403).body(
                    Map.of("message", "Không có quyền bác sĩ.")
            );
        }

        if (maDichVu == null || maDichVu <= 0) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Mã dịch vụ không hợp lệ.")
            );
        }

        String sql = """
                SELECT
                    MaChiSoDichVu AS maChiSoDichVu,
                    MaDichVu AS maDichVu,
                    TenChiSo AS tenChiSo,
                    DonVi AS donVi,
                    GiaTriThamChieu AS giaTriThamChieu,
                    LoaiDuLieu AS loaiDuLieu,
                    NhomChiSo AS nhomChiSo,
                    ThuTuHienThi AS thuTuHienThi,
                    BatBuoc AS batBuoc,
                    MoTa AS moTa,
                    TrangThai AS trangThai
                FROM ChiSoDichVu
                WHERE MaDichVu = ?
                  AND TrangThai = 1
                ORDER BY ThuTuHienThi, MaChiSoDichVu
                """;

        List<Map<String, Object>> danhSach =
                jdbcTemplate.queryForList(sql, maDichVu);

        return ResponseEntity.ok(danhSach);
    }
}
