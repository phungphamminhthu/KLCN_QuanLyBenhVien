
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.HoaDonThanhToanResponse;
import QuanLyBenhVien.DTO.ThongTinQRResponse;
import QuanLyBenhVien.Entity.HoaDon;
import QuanLyBenhVien.Repository.CTHoaDonRepository;
import QuanLyBenhVien.Repository.HoaDonRepository;
import QuanLyBenhVien.Repository.ThanhToanRepository;
import QuanLyBenhVien.Security.BenhNhanAccessService;
import QuanLyBenhVien.Service.ThanhToanService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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
    private final BenhNhanAccessService benhNhanAccessService;

    public ThanhToanController(
            ThanhToanService thanhToanService,
            HoaDonRepository hoaDonRepository,
            CTHoaDonRepository ctHoaDonRepository,
            ThanhToanRepository thanhToanRepository,
            BenhNhanAccessService benhNhanAccessService) {

        this.thanhToanService = thanhToanService;
        this.hoaDonRepository = hoaDonRepository;
        this.ctHoaDonRepository = ctHoaDonRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.benhNhanAccessService = benhNhanAccessService;
    }

    // =========================================
    // KIỂM TRA ĐĂNG NHẬP
    // =========================================
    private boolean chuaDangNhap(Authentication authentication) {
        return authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName());
    }

    // =========================================
    // LẤY QR THANH TOÁN
    // GET /hoa-don/{maHoaDon}/qr?maBenhNhan=...
    // =========================================
    @GetMapping("/hoa-don/{maHoaDon}/qr")
    public ResponseEntity<?> layQR(
            @PathVariable Integer maHoaDon,
            @RequestParam Integer maBenhNhan,
            Authentication authentication) {

        if (chuaDangNhap(authentication)) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        try {
            // 1. Kiểm tra quyền sở hữu hồ sơ
            benhNhanAccessService.kiemTraQuyenSoHuu(maBenhNhan);

            // 2. Tạo QR theo đúng hồ sơ bệnh nhân
            ThongTinQRResponse response =
                    thanhToanService.taoThongTinQR(
                            maHoaDon,
                            maBenhNhan
                    );

            return ResponseEntity.ok(response);

        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(403).body(
                    Map.of("message", ex.getMessage())
            );

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", ex.getMessage())
            );
        }
    }

    // =========================================
    // LẤY TRẠNG THÁI HÓA ĐƠN
    // GET /hoa-don/{maHoaDon}/trang-thai?maBenhNhan=...
    // =========================================
    @GetMapping("/hoa-don/{maHoaDon}/trang-thai")
    public ResponseEntity<?> layTrangThai(
            @PathVariable Integer maHoaDon,
            @RequestParam Integer maBenhNhan,
            Authentication authentication) {

        if (chuaDangNhap(authentication)) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        if (maHoaDon == null || maHoaDon <= 0
                || maBenhNhan == null || maBenhNhan <= 0) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", "Thông tin hóa đơn không hợp lệ.")
            );
        }

        try {
            // 1. Xác minh quyền sở hữu hồ sơ
            benhNhanAccessService.kiemTraQuyenSoHuu(maBenhNhan);

            // 2. Lấy hóa đơn thuộc đúng hồ sơ
            HoaDon hoaDon = hoaDonRepository
                    .timHoaDonTheoMaVaBenhNhan(
                            maHoaDon,
                            maBenhNhan
                    )
                    .orElse(null);

            if (hoaDon == null) {
                return ResponseEntity.status(404).body(
                        Map.of("message", "Không tìm thấy hóa đơn.")
                );
            }

            return ResponseEntity.ok(
                    Map.of(
                            "maHoaDon", hoaDon.getMaHoaDon(),
                            "trangThai", hoaDon.getTrangThai(),
                            "soTien", hoaDon.getTongTien()
                    )
            );

        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(403).body(
                    Map.of("message", ex.getMessage())
            );
        }
    }

    // ============================================
    // LẤY HÓA ĐƠN THEO LỊCH KHÁM VÀ HỒ SƠ
    // GET /lich-kham/{maLichKham}/hoa-don?maBenhNhan=...
    // ============================================
    @GetMapping("/lich-kham/{maLichKham}/hoa-don")
    public ResponseEntity<?> layHoaDonTheoLichKham(
            @PathVariable Integer maLichKham,
            @RequestParam Integer maBenhNhan,
            Authentication authentication) {

        // 1. Kiểm tra đăng nhập
        if (chuaDangNhap(authentication)) {
            return ResponseEntity.status(401).body(
                    Map.of("message", "Vui lòng đăng nhập.")
            );
        }

        // 2. Kiểm tra dữ liệu đầu vào
        if (maLichKham == null || maLichKham <= 0
                || maBenhNhan == null || maBenhNhan <= 0) {

            return ResponseEntity.badRequest().body(
                    Map.of("message", "Thông tin lịch khám không hợp lệ.")
            );
        }

        try {
            // 3. Xác minh hồ sơ thuộc tài khoản đăng nhập
            benhNhanAccessService.kiemTraQuyenSoHuu(maBenhNhan);

            // 4. Chỉ lấy hóa đơn của lịch khám thuộc hồ sơ đang chọn
            List<HoaDon> hoaDons =
                    hoaDonRepository.timHoaDonTheoLichVaHoSoBenhNhan(
                            maLichKham,
                            maBenhNhan
                    );

            // 5. Chuyển dữ liệu thành response
            List<Map<String, Object>> danhSach =
                    hoaDons.stream().map(hoaDon -> {

                        Map<String, Object> result =
                                new LinkedHashMap<>();

                        result.put(
                                "maHoaDon",
                                hoaDon.getMaHoaDon()
                        );

                        result.put(
                                "ngayLapHoaDon",
                                hoaDon.getNgayLapHoaDon()
                        );

                        result.put(
                                "tongTien",
                                hoaDon.getTongTien()
                        );

                        result.put(
                                "loaiHoaDon",
                                hoaDon.getLoaiHoaDon()
                        );

                        result.put(
                                "trangThai",
                                hoaDon.getTrangThai()
                        );

                        // Chi tiết hóa đơn
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

                                            detail.put(
                                                    "noiDung",
                                                    ct.getNoiDung()
                                            );

                                            detail.put(
                                                    "soLuong",
                                                    ct.getSoLuong()
                                            );

                                            detail.put(
                                                    "donGia",
                                                    ct.getDonGia()
                                            );

                                            detail.put(
                                                    "thanhTien",
                                                    ct.getThanhTien()
                                            );

                                            return detail;

                                        })
                                        .collect(Collectors.toList());

                        result.put("chiTietHoaDon", chiTiet);

                        // Lịch sử thanh toán
                        List<Map<String, Object>> thanhToan =
                                thanhToanRepository
                                        .findByMaHoaDon(
                                                hoaDon.getMaHoaDon()
                                        )
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

                                            payment.put(
                                                    "soTien",
                                                    tt.getSoTien()
                                            );

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

        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(403).body(
                    Map.of("message", ex.getMessage())
            );
        }
    }
}
