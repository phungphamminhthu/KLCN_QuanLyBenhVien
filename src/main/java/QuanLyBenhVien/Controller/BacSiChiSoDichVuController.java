package QuanLyBenhVien.Controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Chỉ đọc cấu hình thông số; không ghi kết quả bệnh nhân. */
@RestController
@RequestMapping("/api/bac-si/kham-benh/dich-vu")
public class BacSiChiSoDichVuController {

    private final JdbcTemplate jdbcTemplate;

    public BacSiChiSoDichVuController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/{maDichVu}/chi-so")
    public List<Map<String, Object>> layThongSo(
            @PathVariable Integer maDichVu) {
        return jdbcTemplate.queryForList("""
            SELECT
                MaChiSoDichVu AS maChiSoDichVu,
                TenChiSo AS tenChiSo,
                DonVi AS donVi,
                GiaTriThamChieu AS giaTriThamChieu,
                LoaiDuLieu AS loaiDuLieu,
                NhomChiSo AS nhomChiSo,
                ThuTuHienThi AS thuTuHienThi,
                BatBuoc AS batBuoc
            FROM ChiSoDichVu
            WHERE MaDichVu = ?
              AND TrangThai = 1
            ORDER BY ThuTuHienThi, MaChiSoDichVu
            """, maDichVu);
    }
}
