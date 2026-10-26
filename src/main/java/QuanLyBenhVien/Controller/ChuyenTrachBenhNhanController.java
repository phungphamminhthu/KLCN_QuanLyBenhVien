
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.ChiDinhYTe;
import QuanLyBenhVien.Entity.HoSoBenhAn;
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
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chuyen-trach/danh-sach-benh-nhan")
public class ChuyenTrachBenhNhanController {

    @PersistenceContext
    private EntityManager em;

    private void kiemTraQuyen(CustomUserDetails user) {
        if (user == null ||
                user.getAuthorities().stream().noneMatch(
                        a -> "ROLE_CHUYENTRACH".equals(a.getAuthority())
                )) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Không có quyền xem danh sách bệnh nhân CLS"
            );
        }
    }

    private LocalDate homNay() {
        return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    private String chuanHoa(String value) {
        if (value == null) return "";

        String normalized = Normalizer.normalize(
                value, Normalizer.Form.NFD
        );

        return normalized
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private List<LichDangKyKham> layLichCLS(
            LocalDate tuNgay,
            LocalDate denNgay
    ) {
        return em.createQuery("""
            SELECT l
            FROM LichDangKyKham l
            JOIN FETCH l.benhNhan b
            JOIN FETCH b.nguoiDung
            JOIN FETCH l.bacSi bs
            JOIN FETCH bs.nguoiDung
            JOIN FETCH l.khoa
            WHERE l.ngayKham BETWEEN :tuNgay AND :denNgay
              AND (
                  l.trangThai IN ('ChoCLS', 'DangCLS')
                  OR (
                      l.trangThai = 'ChoKham'
                      AND EXISTS (
                          SELECT c.maChiDinh
                          FROM ChiDinhYTe c
                          WHERE c.hoSoBenhAn.lichDangKyKham = l
                            AND c.trangThai = 'DaHoanThanh'
                      )
                  )
              )
            ORDER BY l.ngayKham DESC,
                     l.gioKham ASC,
                     l.maLichKham ASC
            """, LichDangKyKham.class)
                .setParameter("tuNgay", tuNgay)
                .setParameter("denNgay", denNgay)
                .getResultList();
    }

    private List<ChiDinhYTe> layChiDinh(List<Integer> maLich) {
        if (maLich.isEmpty()) return List.of();

        return em.createQuery("""
            SELECT c
            FROM ChiDinhYTe c
            JOIN FETCH c.dichVuYTe
            WHERE c.hoSoBenhAn.lichDangKyKham.maLichKham
                  IN :maLich
            ORDER BY c.ngayChiDinh ASC,
                     c.maChiDinh ASC
            """, ChiDinhYTe.class)
                .setParameter("maLich", maLich)
                .getResultList();
    }

    private Map<Integer, String> layTenPhong() {
        Map<Integer, String> result = new TreeMap<>();

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery("""
            SELECT MaPhong, TenPhong
            FROM PhongChuyenTrach
            ORDER BY MaPhong
            """).getResultList();

        for (Object[] row : rows) {
            Integer id = ((Number) row[0]).intValue();
            result.put(id, String.valueOf(row[1]));
        }

        return result;
    }

    private Map<String, Object> taoDong(
            LichDangKyKham l,
            List<ChiDinhYTe> chiDinhs,
            Map<Integer, String> tenPhong
    ) {
        Map<String, Object> row = new LinkedHashMap<>();

        List<String> dichVu = chiDinhs.stream()
                .map(c -> c.getDichVuYTe().getTenDichVu())
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<Integer> maPhong = chiDinhs.stream()
                .map(ChiDinhYTe::getMaPhong)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<String> phong = maPhong.stream()
                .map(id -> tenPhong.getOrDefault(id, "Phòng " + id))
                .toList();

        String trangThaiCLS;

        if ("ChoCLS".equals(l.getTrangThai())) {
            trangThaiCLS = "ChoCLS";
        } else if ("DangCLS".equals(l.getTrangThai())) {
            trangThaiCLS = "DangCLS";
        } else {
            trangThaiCLS = "HoanThanhCLS";
        }

        row.put("maLichKham", l.getMaLichKham());
        row.put("maBenhNhan", l.getBenhNhan().getMaBenhNhan());
        row.put("hoTen",
                l.getBenhNhan().getNguoiDung().getHoTen());
        row.put("ngaySinh", l.getBenhNhan().getNgaySinh());
        row.put("gioiTinh", l.getBenhNhan().getGioiTinh());
        row.put("ngayKham", l.getNgayKham().toString());
        row.put("gioKham", l.getGioKham().toString());

        row.put("maKhoa", l.getKhoa().getMaKhoa());
        row.put("tenKhoa", l.getKhoa().getTenKhoa());

        row.put("bacSiPhuTrach",
                l.getBacSi().getNguoiDung().getHoTen());

        row.put("dichVu", dichVu.isEmpty()
                ? "Chưa có chỉ định"
                : String.join(", ", dichVu));

        row.put("maPhong", maPhong);
        row.put("tenPhong", phong.isEmpty()
                ? "Chưa phân phòng"
                : String.join(", ", phong));

        row.put("trangThai", trangThaiCLS);

        return row;
    }

    // =====================================================
    // DANH SÁCH BỆNH NHÂN + BỘ LỌC + PHÂN TRANG
    // =====================================================

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> danhSach(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) LocalDate tuNgay,
            @RequestParam(required = false) LocalDate denNgay,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String khoa,
            @RequestParam(defaultValue = "") String phong,
            @RequestParam(defaultValue = "") String trangThai,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int pageSize
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
                    "Khoảng ngày phải hợp lệ và không quá 94 ngày"
            );
        }

        page = Math.max(1, page);
        pageSize = Math.max(1, Math.min(pageSize, 50));

        List<LichDangKyKham> lich = layLichCLS(tuNgay, denNgay);

        List<Integer> ids = lich.stream()
                .map(LichDangKyKham::getMaLichKham)
                .toList();

        Map<Integer, List<ChiDinhYTe>> chiDinhTheoLich =
                layChiDinh(ids).stream()
                        .collect(Collectors.groupingBy(
                                c -> c.getHoSoBenhAn()
                                        .getLichDangKyKham()
                                        .getMaLichKham()
                        ));

        Map<Integer, String> tenPhong = layTenPhong();
        Map<Integer, String> khoaOptions = new TreeMap<>();

        List<Map<String, Object>> allRows = new ArrayList<>();

        for (LichDangKyKham l : lich) {
            khoaOptions.put(
                    l.getKhoa().getMaKhoa(),
                    l.getKhoa().getTenKhoa()
            );

            allRows.add(taoDong(
                    l,
                    chiDinhTheoLich.getOrDefault(
                            l.getMaLichKham(), List.of()
                    ),
                    tenPhong
            ));
        }

        String search = chuanHoa(q);

        List<Map<String, Object>> filtered = allRows.stream()
                .filter(r -> {
                    if (search.isBlank()) return true;

                    return chuanHoa(String.valueOf(r.get("hoTen")))
                            .contains(search)
                            || String.valueOf(r.get("maBenhNhan"))
                            .contains(search)
                            || String.valueOf(r.get("maLichKham"))
                            .contains(search);
                })
                .filter(r -> khoa.isBlank() ||
                        khoa.equals(String.valueOf(r.get("maKhoa"))))
                .filter(r -> {
                    if (phong.isBlank()) return true;

                    @SuppressWarnings("unchecked")
                    List<Integer> idsPhong =
                            (List<Integer>) r.get("maPhong");

                    return idsPhong.stream().anyMatch(
                            id -> phong.equals(String.valueOf(id))
                    );
                })
                .filter(r -> trangThai.isBlank() ||
                        trangThai.equals(r.get("trangThai")))
                .toList();

        int total = filtered.size();
        int totalPages = Math.max(
                1, (int) Math.ceil(total / (double) pageSize)
        );

        page = Math.min(page, totalPages);

        int from = (page - 1) * pageSize;
        int to = Math.min(from + pageSize, total);

        List<Map<String, Object>> items =
                filtered.subList(from, to);

        List<Map<String, Object>> dsKhoa = new ArrayList<>();

        khoaOptions.forEach((id, name) -> {
            dsKhoa.add(Map.of(
                    "id", id,
                    "name", name
            ));
        });

        List<Map<String, Object>> dsPhong = new ArrayList<>();

        tenPhong.forEach((id, name) -> {
            dsPhong.add(Map.of(
                    "id", id,
                    "name", name
            ));
        });

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("items", items);
        result.put("total", total);
        result.put("page", page);
        result.put("pageSize", pageSize);
        result.put("totalPages", totalPages);
        result.put("khoa", dsKhoa);
        result.put("phong", dsPhong);

        return result;
    }

    // =====================================================
    // XEM HỒ SƠ BỆNH NHÂN - CHỈ ĐỌC
    // =====================================================

    @GetMapping("/ho-so/{maLichKham}")
    @Transactional(readOnly = true)
    public Map<String, Object> xemHoSo(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        kiemTraQuyen(user);

        LichDangKyKham lich = em.createQuery("""
            SELECT l
            FROM LichDangKyKham l
            JOIN FETCH l.benhNhan b
            JOIN FETCH b.nguoiDung
            JOIN FETCH l.bacSi bs
            JOIN FETCH bs.nguoiDung
            JOIN FETCH l.khoa
            WHERE l.maLichKham = :id
            """, LichDangKyKham.class)
                .setParameter("id", maLichKham)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy lượt khám"
                ));

        List<ChiDinhYTe> dsChiDinh =
                layChiDinh(List.of(maLichKham));

        boolean coCLS =
                "ChoCLS".equals(lich.getTrangThai())
                        || "DangCLS".equals(lich.getTrangThai())
                        || (
                        "ChoKham".equals(lich.getTrangThai())
                                && dsChiDinh.stream().anyMatch(
                                c -> "DaHoanThanh".equals(c.getTrangThai())
                        )
                );

        if (!coCLS) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Lượt khám không thuộc danh sách CLS"
            );
        }

        Map<String, Object> result = taoDong(
                lich, dsChiDinh, layTenPhong()
        );

        result.put("diaChi",
                lich.getBenhNhan().getDiaChi());

        result.put("tienSuBenh",
                lich.getBenhNhan().getTienSuBenh());

        List<HoSoBenhAn> hoSo = em.createQuery("""
            SELECT h
            FROM HoSoBenhAn h
            WHERE h.lichDangKyKham.maLichKham = :id
            """, HoSoBenhAn.class)
                .setParameter("id", maLichKham)
                .getResultList();

        if (!hoSo.isEmpty()) {
            HoSoBenhAn h = hoSo.get(0);

            result.put("maHoSoBenhAn",
                    h.getMaHoSoBenhAn());
            result.put("trieuChung", h.getTrieuChung());
            result.put("chanDoan", h.getChanDoan());
            result.put("ketLuan", h.getKetLuan());
            result.put("huongDieuTri", h.getHuongDieuTri());
        }

        return result;
    }
}
