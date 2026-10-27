
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.ChiDinhYTe;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Security.CustomUserDetails;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chuyen-trach/danh-sach-chi-dinh")
public class ChuyenTrachChiDinhController {

    @PersistenceContext
    private EntityManager em;

    private void kiemTraQuyen(CustomUserDetails user) {
        if (user == null ||
                user.getAuthorities().stream().noneMatch(
                        a -> "ROLE_CHUYENTRACH".equals(a.getAuthority())
                )) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Không có quyền xem chỉ định CLS"
            );
        }
    }

    private LocalDate homNay() {
        return LocalDate.now(
                ZoneId.of("Asia/Ho_Chi_Minh")
        );
    }

    private String chuanHoa(String text) {
        if (text == null) return "";

        return Normalizer.normalize(
                        text, Normalizer.Form.NFD
                )
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private List<ChiDinhYTe> layChiDinh(
            LocalDate tuNgay,
            LocalDate denNgay
    ) {
        LocalDateTime batDau = tuNgay.atStartOfDay();
        LocalDateTime ketThuc = denNgay.plusDays(1).atStartOfDay();

        return em.createQuery("""
            SELECT c
            FROM ChiDinhYTe c
            JOIN FETCH c.hoSoBenhAn h
            JOIN FETCH h.lichDangKyKham l
            JOIN FETCH l.benhNhan b
            JOIN FETCH b.nguoiDung
            JOIN FETCH l.bacSi bs
            JOIN FETCH bs.nguoiDung
            JOIN FETCH c.dichVuYTe
            WHERE c.ngayChiDinh >= :batDau
              AND c.ngayChiDinh < :ketThuc
            ORDER BY c.ngayChiDinh DESC,
                     c.maChiDinh DESC
            """, ChiDinhYTe.class)
                .setParameter("batDau", batDau)
                .setParameter("ketThuc", ketThuc)
                .getResultList();
    }

    private Map<Integer, String> layTenPhong() {
        Map<Integer, String> phong = new TreeMap<>();

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
            SELECT MaPhong, TenPhong
            FROM PhongChuyenTrach
            ORDER BY MaPhong
            """).getResultList();

        for (Object[] row : rows) {
            Integer id = ((Number) row[0]).intValue();

            phong.put(
                    id,
                    row[1] == null
                            ? "Phòng " + id
                            : String.valueOf(row[1])
            );
        }

        return phong;
    }

    private Map<String, Object> taoDong(
            ChiDinhYTe c,
            Map<Integer, String> phong
    ) {
        LichDangKyKham lich = c.getHoSoBenhAn()
                .getLichDangKyKham();

        Map<String, Object> row = new LinkedHashMap<>();

        Integer maPhong = c.getMaPhong();

        row.put("maChiDinh", c.getMaChiDinh());
        row.put("maLichKham", lich.getMaLichKham());

        row.put(
                "maHoSoBenhAn",
                c.getHoSoBenhAn().getMaHoSoBenhAn()
        );

        row.put(
                "maBenhNhan",
                lich.getBenhNhan().getMaBenhNhan()
        );

        row.put(
                "tenBenhNhan",
                lich.getBenhNhan().getNguoiDung().getHoTen()
        );

        row.put(
                "ngaySinh",
                lich.getBenhNhan().getNgaySinh()
        );

        row.put(
                "gioiTinh",
                lich.getBenhNhan().getGioiTinh()
        );

        row.put(
                "dichVu",
                c.getDichVuYTe().getTenDichVu()
        );

        row.put(
                "bacSiChiDinh",
                lich.getBacSi().getNguoiDung().getHoTen()
        );

        row.put("maPhong", maPhong);

        row.put(
                "tenPhong",
                maPhong == null
                        ? "Chưa phân phòng"
                        : phong.getOrDefault(
                        maPhong, "Phòng " + maPhong
                )
        );

        row.put("ngayChiDinh", c.getNgayChiDinh());
        row.put("trangThaiChiDinh", c.getTrangThai());
        row.put("trangThaiLuotKham", lich.getTrangThai());

        return row;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> danhSach(
            @AuthenticationPrincipal CustomUserDetails user,

            @RequestParam(required = false)
            LocalDate tuNgay,

            @RequestParam(required = false)
            LocalDate denNgay,

            @RequestParam(defaultValue = "")
            String q,

            @RequestParam(defaultValue = "")
            String phong,

            @RequestParam(defaultValue = "")
            String trangThai,

            @RequestParam(defaultValue = "1")
            int page,

            @RequestParam(defaultValue = "10")
            int pageSize
    ) {
        kiemTraQuyen(user);

        LocalDate today = homNay();

        if (tuNgay == null) {
            tuNgay = today.withDayOfMonth(1);
        }

        if (denNgay == null) {
            denNgay = today;
        }

        if (tuNgay.isAfter(denNgay) ||
                ChronoUnit.DAYS.between(tuNgay, denNgay) > 93) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Khoảng ngày không hợp lệ hoặc vượt quá 94 ngày"
            );
        }

        page = Math.max(1, page);
        pageSize = Math.max(1, Math.min(pageSize, 50));

        Map<Integer, String> phongMap = layTenPhong();

        List<Map<String, Object>> rows = layChiDinh(
                tuNgay, denNgay
        )
                .stream()
                .map(c -> taoDong(c, phongMap))
                .toList();

        String keyword = chuanHoa(q);

        List<Map<String, Object>> filtered = rows.stream()
                .filter(row -> {
                    if (keyword.isBlank()) return true;

                    return chuanHoa(
                            String.valueOf(row.get("tenBenhNhan"))
                    ).contains(keyword)
                            || chuanHoa(
                            String.valueOf(row.get("dichVu"))
                    ).contains(keyword)
                            || String.valueOf(
                            row.get("maChiDinh")
                    ).contains(keyword)
                            || String.valueOf(
                            row.get("maBenhNhan")
                    ).contains(keyword);
                })
                .filter(row -> {
                    if (phong.isBlank()) return true;

                    return phong.equals(
                            String.valueOf(row.get("maPhong"))
                    );
                })
                .filter(row -> {
                    if (trangThai.isBlank()) return true;

                    return trangThai.equals(
                            String.valueOf(row.get("trangThaiChiDinh"))
                    );
                })
                .collect(Collectors.toList());

        int total = filtered.size();

        int totalPages = Math.max(
                1,
                (int) Math.ceil(total / (double) pageSize)
        );

        page = Math.min(page, totalPages);

        int from = (page - 1) * pageSize;
        int to = Math.min(from + pageSize, total);

        List<Map<String, Object>> dsPhong =
                new ArrayList<>();

        phongMap.forEach((id, name) -> {
            dsPhong.add(Map.of(
                    "id", id,
                    "name", name
            ));
        });

        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put(
                "items",
                filtered.subList(from, to)
        );

        result.put("total", total);
        result.put("page", page);
        result.put("pageSize", pageSize);
        result.put("totalPages", totalPages);
        result.put("phong", dsPhong);

        return result;
    }

// =====================================================
// CHI TIẾT MỘT CHỈ ĐỊNH CẬN LÂM SÀNG
// Chỉ đọc dữ liệu, không thay đổi trạng thái khám
// =====================================================

    @GetMapping("/{maChiDinh}")
    @Transactional(readOnly = true)
    public Map<String, Object> chiTietChiDinh(
            @PathVariable Integer maChiDinh,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        kiemTraQuyen(user);

        ChiDinhYTe chiDinh = em.createQuery("""
        SELECT c
        FROM ChiDinhYTe c
        JOIN FETCH c.hoSoBenhAn h
        JOIN FETCH h.lichDangKyKham l
        JOIN FETCH l.benhNhan b
        JOIN FETCH b.nguoiDung
        JOIN FETCH l.bacSi bs
        JOIN FETCH bs.nguoiDung
        JOIN FETCH l.khoa
        JOIN FETCH c.dichVuYTe
        WHERE c.maChiDinh = :maChiDinh
        """, ChiDinhYTe.class)
                .setParameter("maChiDinh", maChiDinh)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy chỉ định"
                ));

        LichDangKyKham lich = chiDinh
                .getHoSoBenhAn()
                .getLichDangKyKham();

        Map<String, Object> result = taoDong(
                chiDinh,
                layTenPhong()
        );

        // Thông tin bổ sung phục vụ trang chi tiết
        result.put("tenKhoa", lich.getKhoa().getTenKhoa());


// Địa chỉ lấy từ bảng BenhNhan
        result.put(
                "diaChi",
                lich.getBenhNhan().getDiaChi()
        );

// Số điện thoại lấy từ NguoiDung nếu có
        result.put(
                "soDienThoai",
                docThuocTinhTuyChon(
                        lich.getBenhNhan().getNguoiDung(),
                        "soDienThoai",
                        "sdt",
                        "dienThoai"
                )
        );

        result.put("ngayKham", lich.getNgayKham());
        result.put("gioKham", lich.getGioKham());

        result.put(
                "maDichVu",
                docThuocTinhTuyChon(
                        chiDinh.getDichVuYTe(),
                        "maDichVu"
                )
        );

        // Chỉ lấy ghi chú nếu Entity có thuộc tính tương ứng.
        // Không lấy triệu chứng hay chẩn đoán thay cho
        // ghi chú chỉ định của bác sĩ.
        result.put(
                "ghiChuBacSi",
                docThuocTinhTuyChon(
                        chiDinh,
                        "ghiChu",
                        "ghiChuBacSi",
                        "ghiChuChiDinh"
                )
        );

        return result;
    }


// =====================================================
// ĐỌC THUỘC TÍNH TÙY CHỌN AN TOÀN
// Tránh phụ thuộc vào getter chưa được xác nhận
// =====================================================

    private Object docThuocTinhTuyChon(
            Object object,
            String... properties
    ) {
        if (object == null) {
            return null;
        }

        org.springframework.beans.BeanWrapper wrapper =
                new org.springframework.beans.BeanWrapperImpl(object);

        for (String property : properties) {
            if (!wrapper.isReadableProperty(property)) {
                continue;
            }

            try {
                Object value = wrapper.getPropertyValue(property);

                if (value != null) {
                    return value;
                }
            } catch (org.springframework.beans.BeansException ignored) {
                // Bỏ qua thuộc tính không thể đọc.
            }
        }

        return null;
    }

}
