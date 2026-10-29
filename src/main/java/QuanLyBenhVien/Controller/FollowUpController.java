package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Repository.HoSoBenhAnRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/follow-ups")
public class FollowUpController {

    private final HoSoBenhAnRepository hoSoBenhAnRepository;

    public FollowUpController(
            HoSoBenhAnRepository hoSoBenhAnRepository) {
        this.hoSoBenhAnRepository = hoSoBenhAnRepository;
    }

    /**
     * Lấy danh sách lịch tái khám của bệnh nhân đang đăng nhập.
     * Chỉ trả về hồ sơ có ngày tái khám.
     */
    @GetMapping("/my")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getMyFollowUps(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập"));
        }

        String tenDangNhap = authentication.getName();

        List<HoSoBenhAn> hoSoList =
                hoSoBenhAnRepository
                        .findByLichDangKyKham_BenhNhan_NguoiDung_TenDangNhapAndNgayTaiKhamIsNotNullOrderByNgayTaiKhamAsc(
                                tenDangNhap
                        );

        List<Map<String, Object>> result = hoSoList.stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(result);
    }

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