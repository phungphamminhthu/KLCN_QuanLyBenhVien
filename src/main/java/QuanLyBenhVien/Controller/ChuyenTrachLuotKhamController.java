
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

    // =====================================================
    // NGÀY HIỆN TẠI
    // =====================================================

    private LocalDate homNay() {
        return LocalDate.now(
                ZoneId.of("Asia/Ho_Chi_Minh")
        );
    }

    // =====================================================
    // KIỂM TRA QUYỀN NHÂN VIÊN CHUYÊN TRÁCH
    // =====================================================

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
    // DANH SÁCH BỆNH NHÂN CLS TRONG NGÀY
    // =====================================================

    @GetMapping("/hom-nay")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> danhSachHomNay(
            @AuthenticationPrincipal CustomUserDetails user
    ) {

        kiemTraQuyen(user);

        List<LichDangKyKham> danhSach = entityManager
                .createQuery("""
                    SELECT l
                    FROM LichDangKyKham l
                    JOIN FETCH l.benhNhan b
                    JOIN FETCH b.nguoiDung
                    WHERE l.ngayKham = :ngay
                    AND l.trangThai IN :trangThai
                    ORDER BY l.gioKham ASC, l.maLichKham ASC
                    """, LichDangKyKham.class)

                .setParameter("ngay", homNay())

                .setParameter(
                        "trangThai",
                        List.of("ChoCLS", "DangCLS")
                )

                .getResultList();

        return danhSach.stream().map(l -> {

            Map<String, Object> item = new LinkedHashMap<>();

            // Thông tin lượt khám
            item.put(
                    "maLichKham",
                    l.getMaLichKham()
            );

            item.put(
                    "maBenhNhan",
                    l.getBenhNhan().getMaBenhNhan()
            );

            item.put(
                    "tenBenhNhan",
                    l.getBenhNhan()
                            .getNguoiDung()
                            .getHoTen()
            );

            item.put(
                    "ngayKham",
                    l.getNgayKham().toString()
            );

            item.put(
                    "gioKham",
                    l.getGioKham().toString()
            );

            item.put(
                    "trangThai",
                    l.getTrangThai()
            );

            // =============================================
            // BÁC SĨ PHỤ TRÁCH
            // Lấy từ NguoiDung thông qua BacSi
            // =============================================

            String tenBacSi = null;

            if (l.getBacSi() != null &&
                    l.getBacSi().getNguoiDung() != null) {

                tenBacSi = l.getBacSi()
                        .getNguoiDung()
                        .getHoTen();
            }

            item.put(
                    "bacSiPhuTrach",
                    tenBacSi
            );

            // =============================================
            // DỊCH VỤ CẬN LÂM SÀNG
            // Lấy từ ChiDinhYTe của đúng lượt khám
            // =============================================

            List<ChiDinhYTe> chiDinh = entityManager
                    .createQuery("""
                        SELECT c
                        FROM ChiDinhYTe c
                        JOIN FETCH c.dichVuYTe
                        WHERE c.hoSoBenhAn
                               .lichDangKyKham.maLichKham = :maLichKham
                        ORDER BY c.ngayChiDinh ASC
                        """, ChiDinhYTe.class)

                    .setParameter(
                            "maLichKham",
                            l.getMaLichKham()
                    )

                    .getResultList();

            List<String> dichVu = chiDinh.stream()
                    .map(c -> c.getDichVuYTe().getTenDichVu())
                    .filter(ten -> ten != null && !ten.isBlank())
                    .distinct()
                    .toList();

            item.put(
                    "dichVu",
                    dichVu.isEmpty()
                            ? "Chưa có chỉ định"
                            : String.join(", ", dichVu)
            );

            return item;

        }).toList();
    }

    // =====================================================
    // BẮT ĐẦU KHÁM CHUYÊN TRÁCH
    // ChoCLS -> DangCLS
    // =====================================================

    @PostMapping("/{maLichKham}/bat-dau")
    @Transactional
    public Map<String, String> batDau(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails user
    ) {

        kiemTraQuyen(user);

        return chuyenTrangThai(
                maLichKham,
                "ChoCLS",
                "DangCLS",
                "Đã bắt đầu khám chuyên trách."
        );
    }

    // =====================================================
    // HOÀN THÀNH KHÁM CHUYÊN TRÁCH
    // DangCLS -> ChoKham
    // =====================================================

    @PostMapping("/{maLichKham}/hoan-thanh")
    @Transactional
    public Map<String, String> hoanThanh(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails user
    ) {

        kiemTraQuyen(user);

        return chuyenTrangThai(
                maLichKham,
                "DangCLS",
                "ChoKham",
                "Đã hoàn thành khám chuyên trách."
        );
    }

    // =====================================================
    // CẬP NHẬT TRẠNG THÁI LƯỢT KHÁM
    // =====================================================

    private Map<String, String> chuyenTrangThai(
            Integer maLichKham,
            String trangThaiCu,
            String trangThaiMoi,
            String thongBao
    ) {

        int soDong = entityManager.createQuery("""
                UPDATE LichDangKyKham l
                SET l.trangThai = :trangThaiMoi
                WHERE l.maLichKham = :maLichKham
                AND l.trangThai = :trangThaiCu
                AND l.ngayKham = :ngay
                """)

                .setParameter(
                        "trangThaiMoi",
                        trangThaiMoi
                )

                .setParameter(
                        "maLichKham",
                        maLichKham
                )

                .setParameter(
                        "trangThaiCu",
                        trangThaiCu
                )

                .setParameter(
                        "ngay",
                        homNay()
                )

                .executeUpdate();

        if (soDong != 1) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Lượt khám không còn ở trạng thái phù hợp."
            );
        }

        return Map.of(
                "message", thongBao,
                "trangThai", trangThaiMoi
        );
    }
}
