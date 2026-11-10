
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
            item.put(
                    "tenBenhNhan",
                    l.getBenhNhan().getHoTen()
            );
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

            List<ChiDinhYTe> chiDinh = entityManager
                    .createQuery("""
                        SELECT c
                        FROM ChiDinhYTe c
                        JOIN FETCH c.dichVuYTe
                        WHERE c.hoSoBenhAn
                               .lichDangKyKham.maLichKham = :maLichKham
                        ORDER BY c.ngayChiDinh ASC
                        """, ChiDinhYTe.class)
                    .setParameter("maLichKham", l.getMaLichKham())
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
    // BẮT ĐẦU CLS: CHIDINHYTE: CHOTHUCHIEN - DANGTHUCHIEN
    // =====================================================
    @PostMapping("/{maLichKham}/bat-dau")
    @Transactional
    public Map<String, Object> batDau(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        kiemTraQuyen(user);

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

        int soLuong = entityManager.createQuery("""
        UPDATE ChiDinhYTe c
        SET c.trangThai = 'DangThucHien'
        WHERE c.hoSoBenhAn.lichDangKyKham.maLichKham = :maLichKham
          AND c.trangThai = 'ChoThucHien'
        """)
                .setParameter("maLichKham", maLichKham)
                .executeUpdate();

        if (soLuong == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không có chỉ định CLS nào đang chờ thực hiện."
            );
        }

        return Map.of(
                "message", "Đã bắt đầu thực hiện cận lâm sàng.",
                "trangThai", "DangCLS"
        );
    }

    // =====================================================
    // HOÀN THÀNH CLS, CHUYỂN VỀ BÁC SĨ: XET TREN CHIDINHYTE THOI
    // DANGTHUCHIEN - DAHOANTHANH
    // =====================================================
    @PostMapping("/{maLichKham}/hoan-thanh")
    @Transactional
    public Map<String, Object> hoanThanh(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        kiemTraQuyen(user);

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

        int soLuong = entityManager.createQuery("""
        UPDATE ChiDinhYTe c
        SET c.trangThai = 'DaHoanThanh'
        WHERE c.hoSoBenhAn.lichDangKyKham.maLichKham = :maLichKham
          AND c.trangThai = 'DangThucHien'
        """)
                .setParameter("maLichKham", maLichKham)
                .executeUpdate();

        if (soLuong == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không có chỉ định CLS nào đang thực hiện."
            );
        }

        return Map.of(
                "message", "Đã hoàn thành cận lâm sàng.",
                "trangThai", "HoanThanhCLS"
        );
    }

    // =====================================================
    // CẬP NHẬT TRẠNG THÁI ĐỒNG BỘ 3 BẢNG
    // =====================================================

    private Map<String, String> chuyenTrangThai(
            Integer maLichKham,
            String trangThaiCu,
            String trangThaiMoi,
            String thongBao
    ) {
        // Kiểm tra lượt khám phải tồn tại, đúng ngày và đúng trạng thái.
        LichDangKyKham lich = entityManager.find(
                LichDangKyKham.class,
                maLichKham
        );

        if (lich == null ||
                lich.getNgayKham() == null ||
                !lich.getNgayKham().equals(homNay()) ||
                !trangThaiCu.equals(lich.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Lượt khám không tồn tại, không thuộc ngày hôm nay "
                            + "hoặc không còn ở trạng thái " + trangThaiCu + "."
            );
        }


        // 1. Cập nhật LichDangKyKham
        int soLich = entityManager.createQuery("""
        UPDATE LichDangKyKham l
        SET l.trangThai = :trangThaiMoi
        WHERE l.maLichKham = :maLichKham
          AND l.trangThai = :trangThaiCu
          AND l.ngayKham = :ngay
        """)
                .setParameter("trangThaiMoi", trangThaiMoi)
                .setParameter("maLichKham", maLichKham)
                .setParameter("trangThaiCu", trangThaiCu)
                .setParameter("ngay", homNay())
                .executeUpdate();

        if (soLich != 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể cập nhật trạng thái lượt khám."
            );
        }

// 2. Cập nhật TiepNhanBenhNhan
        int soTiepNhan = entityManager.createQuery("""
        UPDATE TiepNhanBenhNhan t
        SET t.trangThai = :trangThaiMoi
        WHERE t.lichDangKyKham.maLichKham = :maLichKham
          AND t.trangThai = :trangThaiCu
        """)
                .setParameter("trangThaiMoi", trangThaiMoi)
                .setParameter("maLichKham", maLichKham)
                .setParameter("trangThaiCu", trangThaiCu)
                .executeUpdate();

        if (soTiepNhan != 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể cập nhật trạng thái tiếp nhận bệnh nhân."
            );
        }

        // 3. Cập nhật HoSoBenhAn
        int soHoSo;

        if ("DangCLS".equals(trangThaiMoi)) {
            // Hồ sơ vẫn giữ ChoCLS trong lúc nhân viên thực hiện CLS.
            soHoSo = entityManager.createQuery("""
            UPDATE HoSoBenhAn h
            SET h.trangThai = 'ChoCLS'
            WHERE h.lichDangKyKham.maLichKham = :maLichKham
              AND h.trangThai = 'ChoCLS'
            """)
                    .setParameter("maLichKham", maLichKham)
                    .executeUpdate();

        } else if ("DangKham".equals(trangThaiMoi)) {
            // Hoàn thành CLS, chuyển hồ sơ về bác sĩ tiếp tục khám.
            soHoSo = entityManager.createQuery("""
            UPDATE HoSoBenhAn h
            SET h.trangThai = 'DangKham'
            WHERE h.lichDangKyKham.maLichKham = :maLichKham
              AND h.trangThai = 'ChoCLS'
            """)
                    .setParameter("maLichKham", maLichKham)
                    .executeUpdate();

        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trạng thái chuyển đổi không hợp lệ."
            );
        }

        if (soHoSo != 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể đồng bộ trạng thái hồ sơ bệnh án."
            );
        }
        return Map.of(
                "message", thongBao,
                "trangThai", trangThaiMoi
        );
    }
}
