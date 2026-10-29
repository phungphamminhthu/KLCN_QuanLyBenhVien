package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.HoaDonThanhToanResponse;
import QuanLyBenhVien.DTO.ThongTinQRResponse;
import QuanLyBenhVien.Entity.HoaDon;
import QuanLyBenhVien.Repository.CTHoaDonRepository;
import QuanLyBenhVien.Repository.HoaDonRepository;
import QuanLyBenhVien.Repository.ThanhToanRepository;
import QuanLyBenhVien.Service.ThanhToanService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/thanh-toan")
public class ThanhToanController {

    private final ThanhToanService thanhToanService;
    private final HoaDonRepository hoaDonRepository;
    private final CTHoaDonRepository ctHoaDonRepository;
    private final ThanhToanRepository thanhToanRepository;

    public ThanhToanController(
            ThanhToanService thanhToanService,
            HoaDonRepository hoaDonRepository,
            CTHoaDonRepository ctHoaDonRepository,
            ThanhToanRepository thanhToanRepository) {
        this.thanhToanService = thanhToanService;
        this.hoaDonRepository = hoaDonRepository;
        this.ctHoaDonRepository = ctHoaDonRepository;
        this.thanhToanRepository = thanhToanRepository;
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
    //    @GetMapping("/lich-kham/{maLichKham}/hoa-don")
    //    public ResponseEntity<?> layHoaDonTheoLichKham(
    //            @PathVariable Integer maLichKham,
    //            Authentication authentication) {
    //
    //        if (authentication == null
    //                || !authentication.isAuthenticated()) {
    //            return ResponseEntity.status(401).body(
    //                    Map.of("message", "Vui lòng đăng nhập.")
    //            );
    //        }
    //
    //        List<HoaDonThanhToanResponse> danhSach =
    //                hoaDonRepository.timHoaDonTheoLichVaBenhNhan(
    //                                maLichKham,
    //                                authentication.getName()
    //                        ).stream()
    //                        .map(h -> new HoaDonThanhToanResponse(
    //                                h.getMaHoaDon(),
    //                                h.getTongTien(),
    //                                h.getLoaiHoaDon(),
    //                                h.getTrangThai()
    //                        ))
    //                        .collect(Collectors.toList());
    //
    //        return ResponseEntity.ok(danhSach);
    //    }
    @GetMapping("/lich-kham/{maLichKham}/hoa-don")
    public ResponseEntity<?> layHoaDonTheoLichKham(
            @PathVariable Integer maLichKham,
            Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        List<Map<String, Object>> danhSach =
                hoaDonRepository.timHoaDonTheoLichVaBenhNhan(
                        maLichKham,
                        authentication.getName()
                ).stream().map(hoaDon -> {

                    Map<String, Object> result = new LinkedHashMap<>();

                    result.put("maHoaDon", hoaDon.getMaHoaDon());
                    result.put("ngayLapHoaDon", hoaDon.getNgayLapHoaDon());
                    result.put("tongTien", hoaDon.getTongTien());
                    result.put("loaiHoaDon", hoaDon.getLoaiHoaDon());
                    result.put("trangThai", hoaDon.getTrangThai());

                    List<Map<String, Object>> chiTiet =
                            ctHoaDonRepository
                                    .findByHoaDon_MaHoaDon(
                                            hoaDon.getMaHoaDon()
                                    )
                                    .stream()
                                    .map(ct -> {
                                        Map<String, Object> detail =
                                                new LinkedHashMap<>();

                                        detail.put(
                                                "maCTHoaDon",
                                                ct.getMaCTHoaDon()
                                        );
                                        detail.put(
                                                "maChiDinh",
                                                ct.getMaChiDinh()
                                        );
                                        detail.put(
                                                "maCTDonThuoc",
                                                ct.getMaCTDonThuoc()
                                        );
                                        detail.put("noiDung", ct.getNoiDung());
                                        detail.put("soLuong", ct.getSoLuong());
                                        detail.put("donGia", ct.getDonGia());
                                        detail.put("thanhTien", ct.getThanhTien());

                                        return detail;
                                    })
                                    .collect(Collectors.toList());

                    result.put("chiTietHoaDon", chiTiet);

                    List<Map<String, Object>> thanhToan =
                            thanhToanRepository
                                    .findByMaHoaDon(hoaDon.getMaHoaDon())
                                    .stream()
                                    .map(tt -> {
                                        Map<String, Object> payment =
                                                new LinkedHashMap<>();

                                        payment.put(
                                                "maThanhToan",
                                                tt.getMaThanhToan()
                                        );
                                        payment.put(
                                                "ngayThanhToan",
                                                tt.getNgayThanhToan()
                                        );
                                        payment.put("soTien", tt.getSoTien());
                                        payment.put(
                                                "phuongThucThanhToan",
                                                tt.getPhuongThucThanhToan()
                                        );
                                        payment.put(
                                                "trangThai",
                                                tt.getTrangThai()
                                        );
                                        payment.put(
                                                "maGiaoDich",
                                                tt.getMaGiaoDich()
                                        );

                                        return payment;
                                    })
                                    .collect(Collectors.toList());

                    result.put("thanhToan", thanhToan);

                    return result;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(danhSach);
    }
}