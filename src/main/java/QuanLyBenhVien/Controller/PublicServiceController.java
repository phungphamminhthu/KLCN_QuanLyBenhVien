
package QuanLyBenhVien.Controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Controller
public class PublicServiceController {

    private final JdbcTemplate jdbcTemplate;

    public PublicServiceController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/services")
    public String servicesPage(Model model) {

        // Gộp các dòng hoàn toàn giống nhau về
        // loại, tên, mô tả và giá.
        // Không sửa hoặc xóa dữ liệu trong MySQL.
        String sql = """
            SELECT
                MIN(MaDichVu) AS maDichVu,
                TenDichVu AS tenDichVu,
                COALESCE(
                    NULLIF(TRIM(LoaiDichVu), ''),
                    'Khác'
                ) AS loaiDichVu,
                COALESCE(MoTa, '') AS moTa,
                Gia AS gia
            FROM DichVuYTe
            GROUP BY
                TenDichVu,
                COALESCE(
                    NULLIF(TRIM(LoaiDichVu), ''),
                    'Khác'
                ),
                COALESCE(MoTa, ''),
                Gia
            ORDER BY
                loaiDichVu,
                tenDichVu,
                gia
            """;

        List<Map<String, Object>> services =
                jdbcTemplate.queryForList(sql);

        NumberFormat formatter = NumberFormat
                .getNumberInstance(
                        Locale.forLanguageTag("vi-VN")
                );

        // Chia dịch vụ thành các nhóm theo LoaiDichVu
        Map<String, List<Map<String, Object>>> grouped =
                new LinkedHashMap<>();

        for (Map<String, Object> service : services) {

            String category =
                    String.valueOf(service.get("loaiDichVu"));

            Object rawPrice = service.get("gia");

            if (rawPrice instanceof BigDecimal price) {
                service.put(
                        "giaHienThi",
                        formatter.format(price) + " đ"
                );
            } else if (rawPrice instanceof Number price) {
                service.put(
                        "giaHienThi",
                        formatter.format(price) + " đ"
                );
            } else {
                service.put(
                        "giaHienThi",
                        "Liên hệ"
                );
            }

            String description = String.valueOf(
                    service.getOrDefault("moTa", "")
            ).trim();

            service.put(
                    "moTaHienThi",
                    description.isEmpty()
                            ? "Chưa có mô tả chi tiết cho dịch vụ này."
                            : description
            );

            grouped.computeIfAbsent(
                    category,
                    key -> new ArrayList<>()
            ).add(service);
        }

        List<Map<String, Object>> categories =
                new ArrayList<>();

        for (Map.Entry<String, List<Map<String, Object>>>
                entry : grouped.entrySet()) {

            Map<String, Object> category =
                    new LinkedHashMap<>();

            category.put("tenLoai", entry.getKey());
            category.put("dichVu", entry.getValue());
            category.put("soLuong", entry.getValue().size());

            categories.add(category);
        }

        model.addAttribute("categories", categories);
        model.addAttribute("totalServices", services.size());
        model.addAttribute("totalCategories", categories.size());

        return "Public/services";
    }
}
