
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

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chuyen-trach/luot-kham")
public class ChuyenTrachLuotKhamController {

    @PersistenceContext
    private EntityManager entityManager;

    private LocalDate homNay() {
        return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    }

    private void kiemTraQuyen(CustomUserDetails user) {
        if (user == null ||
                user.getAuthorities().stream().noneMatch(
                        a -> "ROLE_CHUYENTRACH".equals(a.getAuthority())
                )) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền thực hiện chức năng này."
            );
        }
    }

    // =====================================================
    // DANH SÁCH LƯỢT KHÁM CLS TRONG NGÀY
    // =====================================================

    @GetMapping("/hom-nay")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> danhSachHomNay(
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        kiemTraQuyen(user);

        List<LichDangKyKham> danhSach = entityManager
                .createQuery("""
                    SELECT DISTINCT l
                    FROM LichDangKyKham l
                    JOIN FETCH l.benhNhan b
                    JOIN FETCH b.nguoiDung
                    WHERE l.ngayKham = :ngay
                    AND EXISTS (
                        SELECT c.maChiDinh
                        FROM ChiDinhYTe c
                        WHERE c.hoSoBenhAn.lichDangKyKham = l
                        AND c.trangThai IN :trangThaiCLS
                    )
                    ORDER BY l.gioKham ASC, l.maLichKham ASC
                """, LichDangKyKham.class)
                .setParameter("ngay", homNay())
                .setParameter(
                        "trangThaiCLS",
                        List.of("ChoThucHien", "DangThucHien")
                )
                .getResultList();

        return danhSach.stream().map(l -> {

            Map<String, Object> item = new LinkedHashMap<>();

            item.put("maLichKham", l.getMaLichKham());
            item.put("maBenhNhan", l.getBenhNhan().getMaBenhNhan());
            item.put("tenBenhNhan", l.getBenhNhan().getHoTen());
            item.put("ngayKham", l.getNgayKham().toString());
            item.put("gioKham", l.getGioKham().toString());

            String tenBacSi = null;

            if (l.getBacSi() != null &&
                    l.getBacSi().getNguoiDung() != null) {
                tenBacSi = l.getBacSi()
                        .getNguoiDung()
                        .getHoTen();
            }

            item.put("bacSiPhuTrach", tenBacSi);

            // Lấy từng chỉ định còn trong luồng thực hiện CLS
            List<ChiDinhYTe> chiDinh = entityManager
                    .createQuery("""
                        SELECT c
                        FROM ChiDinhYTe c
                        JOIN FETCH c.dichVuYTe
                        WHERE c.hoSoBenhAn
                              .lichDangKyKham.maLichKham = :maLichKham
                        AND c.trangThai IN :trangThai
                        ORDER BY c.ngayChiDinh ASC, c.maChiDinh ASC
                    """, ChiDinhYTe.class)
                    .setParameter("maLichKham", l.getMaLichKham())
                    .setParameter(
                            "trangThai",
                            List.of("ChoThucHien", "DangThucHien")
                    )
                    .getResultList();

            // Trả về chi tiết từng chỉ định
            List<Map<String, Object>> danhSachChiDinh =
                    chiDinh.stream().map(c -> {

                        Map<String, Object> cd = new LinkedHashMap<>();

                        cd.put("maChiDinh", c.getMaChiDinh());
                        cd.put("maDichVu", c.getDichVuYTe().getMaDichVu());
                        cd.put(
                                "tenDichVu",
                                c.getDichVuYTe().getTenDichVu()
                        );
                        cd.put("maPhong", c.getMaPhong());
                        cd.put("trangThai", c.getTrangThai());

                        return cd;
                    }).toList();

            item.put("chiDinh", danhSachChiDinh);

            List<String> dichVu = chiDinh.stream()
                    .map(c -> c.getDichVuYTe().getTenDichVu())
                    .filter(ten -> ten != null && !ten.isBlank())
                    .distinct()
                    .toList();

            // Giữ trường dichVu cũ để giảm ảnh hưởng Frontend
            item.put(
                    "dichVu",
                    dichVu.isEmpty()
                            ? "Chưa có chỉ định"
                            : String.join(", ", dichVu)
            );

            // Trạng thái tổng chỉ mang tính hiển thị
            String trangThaiCLS;

            if (chiDinh.stream().anyMatch(
                    c -> "DangThucHien".equals(c.getTrangThai()))) {
                trangThaiCLS = "DangCLS";
            } else if (chiDinh.stream().anyMatch(
                    c -> "ChoThucHien".equals(c.getTrangThai()))) {
                trangThaiCLS = "ChoCLS";
            } else {
                trangThaiCLS = "HoanThanhCLS";
            }

            item.put("trangThai", trangThaiCLS);

            return item;

        }).toList();
    }

    // =====================================================
    // BẮT ĐẦU MỘT CHỈ ĐỊNH CLS RIÊNG
    // ChoThucHien -> DangThucHien
    // =====================================================

    @PostMapping("/{maLichKham}/chi-dinh/{maChiDinh}/bat-dau")
    @Transactional
    public Map<String, Object> batDau(
            @PathVariable Integer maLichKham,
            @PathVariable Integer maChiDinh,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        kiemTraQuyen(user);

        kiemTraLichKhamHomNay(maLichKham);

        ChiDinhYTe chiDinh = timChiDinh(
                maLichKham,
                maChiDinh
        );

        if (!"ChoThucHien".equals(chiDinh.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ định không ở trạng thái chờ thực hiện."
            );
        }

        int soLuong = entityManager.createQuery("""
            UPDATE ChiDinhYTe c
            SET c.trangThai = 'DangThucHien'
            WHERE c.maChiDinh = :maChiDinh
              AND c.hoSoBenhAn.lichDangKyKham.maLichKham = :maLichKham
              AND c.trangThai = 'ChoThucHien'
        """)
                .setParameter("maChiDinh", maChiDinh)
                .setParameter("maLichKham", maLichKham)
                .executeUpdate();

        if (soLuong != 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể bắt đầu chỉ định CLS này."
            );
        }

        return Map.of(
                "message", "Đã bắt đầu chỉ định CLS.",
                "maLichKham", maLichKham,
                "maChiDinh", maChiDinh,
                "trangThai", "DangThucHien"
        );
    }

    // =====================================================
    // HOÀN THÀNH MỘT CHỈ ĐỊNH CLS RIÊNG
    // DangThucHien -> DaHoanThanh
    // =====================================================

    @PostMapping("/{maLichKham}/chi-dinh/{maChiDinh}/hoan-thanh")
    @Transactional
    public Map<String, Object> hoanThanh(
            @PathVariable Integer maLichKham,
            @PathVariable Integer maChiDinh,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        kiemTraQuyen(user);

        kiemTraLichKhamHomNay(maLichKham);

        ChiDinhYTe chiDinh = timChiDinh(
                maLichKham,
                maChiDinh
        );

        if (!"DangThucHien".equals(chiDinh.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ định không ở trạng thái đang thực hiện."
            );
        }

        // Kiểm tra chỉ định có kết quả đã hoàn thành hay chưa
        Long soKetQua = entityManager.createQuery("""
            SELECT COUNT(k)
            FROM KetQuaDichVu k
            WHERE k.chiDinhYTe.maChiDinh = :maChiDinh
              AND k.trangThai = 'DaHoanThanh'
        """, Long.class)
                .setParameter("maChiDinh", maChiDinh)
                .getSingleResult();

        if (soKetQua == null || soKetQua == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ định chưa có kết quả hoàn thành. "
                            + "Vui lòng lưu kết quả trước."
            );
        }

        int soLuong = entityManager.createQuery("""
            UPDATE ChiDinhYTe c
            SET c.trangThai = 'DaHoanThanh'
            WHERE c.maChiDinh = :maChiDinh
              AND c.hoSoBenhAn.lichDangKyKham.maLichKham = :maLichKham
              AND c.trangThai = 'DangThucHien'
        """)
                .setParameter("maChiDinh", maChiDinh)
                .setParameter("maLichKham", maLichKham)
                .executeUpdate();

        if (soLuong != 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể hoàn thành chỉ định CLS này."
            );
        }

        return Map.of(
                "message", "Đã hoàn thành chỉ định CLS.",
                "maLichKham", maLichKham,
                "maChiDinh", maChiDinh,
                "trangThai", "DaHoanThanh"
        );
    }

    // =====================================================
    // KIỂM TRA LỊCH KHÁM
    // =====================================================

    private void kiemTraLichKhamHomNay(Integer maLichKham) {

        LichDangKyKham lich = entityManager.find(
                LichDangKyKham.class,
                maLichKham
        );

        if (lich == null ||
                lich.getNgayKham() == null ||
                !lich.getNgayKham().equals(homNay())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Lượt khám không tồn tại hoặc không thuộc ngày hôm nay."
            );
        }
    }

    // =====================================================
    // KIỂM TRA CHỈ ĐỊNH THUỘC ĐÚNG LỊCH KHÁM
    // =====================================================

    private ChiDinhYTe timChiDinh(
            Integer maLichKham,
            Integer maChiDinh
    ) {

        List<ChiDinhYTe> danhSach = entityManager
                .createQuery("""
                    SELECT c
                    FROM ChiDinhYTe c
                    WHERE c.maChiDinh = :maChiDinh
                    AND c.hoSoBenhAn.lichDangKyKham.maLichKham = :maLichKham
                """, ChiDinhYTe.class)
                .setParameter("maChiDinh", maChiDinh)
                .setParameter("maLichKham", maLichKham)
                .getResultList();

        if (danhSach.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy chỉ định thuộc lượt khám này."
            );
        }

        return danhSach.get(0);
    }
}
