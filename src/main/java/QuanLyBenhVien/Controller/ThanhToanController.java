package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.HoaDonThanhToanResponse;
import QuanLyBenhVien.DTO.ThongTinQRResponse;
import QuanLyBenhVien.Entity.HoaDon;
import QuanLyBenhVien.Repository.HoaDonRepository;
import QuanLyBenhVien.Service.ThanhToanService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/thanh-toan")
public class ThanhToanController {

    private final ThanhToanService thanhToanService;
    private final HoaDonRepository hoaDonRepository;

    public ThanhToanController(
            ThanhToanService thanhToanService,
            HoaDonRepository hoaDonRepository) {
        this.thanhToanService = thanhToanService;
        this.hoaDonRepository = hoaDonRepository;
    }

    @GetMapping("/hoa-don/{maHoaDon}/qr")
    public ResponseEntity<?> layQR(
            @PathVariable Integer maHoaDon,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        try {
            ThongTinQRResponse response =
                    thanhToanService.taoThongTinQR(
                            maHoaDon,
                            authentication.getName()
                    );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", ex.getMessage())
            );
        }
    }

    @GetMapping("/hoa-don/{maHoaDon}/trang-thai")
    public ResponseEntity<?> layTrangThai(
            @PathVariable Integer maHoaDon,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        HoaDon hoaDon = hoaDonRepository
                .timHoaDonCuaBenhNhan(
                        maHoaDon,
                        authentication.getName()
                )
                .orElse(null);

        if (hoaDon == null) {
            return ResponseEntity.status(404).body(
                    Map.of(
                            "message",
                            "Không tìm thấy hóa đơn."
                    )
            );
        }

        return ResponseEntity.ok(
                Map.of(
                        "maHoaDon", hoaDon.getMaHoaDon(),
                        "trangThai", hoaDon.getTrangThai(),
                        "soTien", hoaDon.getTongTien()
                )
        );
    }

    // ============================================
    // LẤY HÓA ĐƠN THEO LỊCH KHAM
    // ============================================
    @GetMapping("/lich-kham/{maLichKham}/hoa-don")
    public ResponseEntity<?> layHoaDonTheoLichKham(
            @PathVariable Integer maLichKham,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        List<HoaDonThanhToanResponse> danhSach =
                hoaDonRepository.timHoaDonTheoLichVaBenhNhan(
                                maLichKham,
                                authentication.getName()
                        ).stream()
                        .map(h -> new HoaDonThanhToanResponse(
                                h.getMaHoaDon(),
                                h.getTongTien(),
                                h.getLoaiHoaDon(),
                                h.getTrangThai()
                        ))
                        .collect(Collectors.toList());

        return ResponseEntity.ok(danhSach);
    }
}