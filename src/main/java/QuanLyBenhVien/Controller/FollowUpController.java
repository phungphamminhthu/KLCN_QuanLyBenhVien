
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Repository.HoSoBenhAnRepository;
import QuanLyBenhVien.Security.BenhNhanAccessService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/follow-ups")
public class FollowUpController {

    private final HoSoBenhAnRepository hoSoBenhAnRepository;
    private final BenhNhanAccessService benhNhanAccessService;

    public FollowUpController(
            HoSoBenhAnRepository hoSoBenhAnRepository,
            BenhNhanAccessService benhNhanAccessService) {

        this.hoSoBenhAnRepository = hoSoBenhAnRepository;
        this.benhNhanAccessService = benhNhanAccessService;
    }

    // =============================================
    // LẤY LỊCH TÁI KHÁM THEO HỒ SƠ ĐANG CHỌN
    // GET /api/follow-ups/my?maBenhNhan=1
    // =============================================
    @GetMapping("/my")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyFollowUps(
            @RequestParam Integer maBenhNhan,
            Authentication authentication) {

        // 1. Kiểm tra đăng nhập
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        // 2. Kiểm tra mã hồ sơ
        if (maBenhNhan == null || maBenhNhan <= 0) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Vui lòng chọn hồ sơ bệnh nhân.")
            );
        }

        try {
            // 3. Xác minh hồ sơ thuộc tài khoản đăng nhập
            BenhNhan benhNhan =
                    benhNhanAccessService.kiemTraQuyenSoHuu(
                            maBenhNhan
                    );

            // 4. Chỉ lấy lịch tái khám của hồ sơ đang chọn
            List<HoSoBenhAn> hoSoList =
                    hoSoBenhAnRepository
                            .findByLichDangKyKham_BenhNhan_MaBenhNhanAndNgayTaiKhamIsNotNullOrderByNgayTaiKhamAsc(
                                    benhNhan.getMaBenhNhan()
                            );

            // 5. Chuyển dữ liệu thành response
            List<Map<String, Object>> result =
                    hoSoList.stream()
                            .map(this::toResponse)
                            .toList();

            return ResponseEntity.ok(result);

        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    Map.of(
                            "message",
                            "Bạn không có quyền truy cập hồ sơ bệnh nhân này."
                    )
            );
        }
    }

    // =============================================
    // CHUYỂN HỒ SƠ BỆNH ÁN THÀNH RESPONSE
    // Giữ nguyên cấu trúc JSON Flutter đang sử dụng
    // =============================================
    private Map<String, Object> toResponse(HoSoBenhAn hs) {

        Map<String, Object> item = new LinkedHashMap<>();

        item.put("maHoSoBenhAn", hs.getMaHoSoBenhAn());
        item.put("ngayTaiKham", hs.getNgayTaiKham());
        item.put("ghiChuTaiKham", hs.getGhiChuTaiKham());
        item.put("trangThai", hs.getTrangThai());
        item.put("trieuChung", hs.getTrieuChung());
        item.put("chanDoan", hs.getChanDoan());
        item.put("ketLuan", hs.getKetLuan());
        item.put("huongDieuTri", hs.getHuongDieuTri());

        var lich = hs.getLichDangKyKham();

        if (lich != null) {

            item.put("maLichKham", lich.getMaLichKham());
            item.put("ngayKham", lich.getNgayKham());
            item.put("gioKham", lich.getGioKham());
            item.put("lyDoKham", lich.getLyDoKham());

            item.put(
                    "tenKhoa",
                    lich.getKhoa() != null
                            ? lich.getKhoa().getTenKhoa()
                            : null
            );

            item.put(
                    "tenBacSi",
                    lich.getBacSi() != null
                            && lich.getBacSi().getNguoiDung() != null
                            ? lich.getBacSi()
                            .getNguoiDung()
                            .getHoTen()
                            : null
            );
        }

        return item;
    }
}
