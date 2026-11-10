package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Repository.BenhNhanRepository;
import QuanLyBenhVien.Security.CustomUserDetails;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import QuanLyBenhVien.Service.ThongBaoService;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/benh-nhan")
public class BenhNhanApiController {

    private final BenhNhanRepository benhNhanRepository;
    private final ThongBaoService thongBaoService;

    public BenhNhanApiController(
            BenhNhanRepository benhNhanRepository,
            ThongBaoService thongBaoService) {

        this.benhNhanRepository = benhNhanRepository;
        this.thongBaoService = thongBaoService;
    }

    @PostMapping("/ho-so")
    @Transactional
    public ResponseEntity<?> taoHoSo(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {

        try {
            // 1. Kiểm tra tài khoản đăng nhập
            if (authentication == null
                    || !(authentication.getPrincipal()
                    instanceof CustomUserDetails userDetails)) {

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "success", false,
                                "message", "Phiên đăng nhập không hợp lệ."
                        ));
            }

            // 2. Lấy thông tin từ request
            String hoTen = getString(request, "hoTen");
            String moiQuanHe = getString(request, "moiQuanHe");
            String ngaySinh = getString(request, "ngaySinh");
            String gioiTinh = getString(request, "gioiTinh");
            String diaChi = getString(request, "diaChi");
            String soDienThoai = getString(
                    request, "soDienThoaiKhanCap");
            String tienSuBenh = getString(request, "tienSuBenh");

            // 3. Kiểm tra dữ liệu bắt buộc
            if (hoTen.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Vui lòng nhập họ tên bệnh nhân."
                ));
            }

            if (moiQuanHe.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Vui lòng chọn mối quan hệ."
                ));
            }

            // 4. Kiểm tra ngày sinh
            LocalDate birthDate = null;

            if (!ngaySinh.isBlank()) {
                birthDate = LocalDate.parse(ngaySinh);

                if (birthDate.isAfter(LocalDate.now())) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "message", "Ngày sinh không hợp lệ."
                    ));
                }
            }

            // 5. Kiểm tra giới tính
            if (!gioiTinh.isBlank()
                    && !gioiTinh.equals("Nam")
                    && !gioiTinh.equals("Nữ")
                    && !gioiTinh.equals("Khác")) {

                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Giới tính không hợp lệ."
                ));
            }

            // 6. Lấy tài khoản từ JWT, không lấy từ Flutter
            var nguoiDung = userDetails.getNguoiDung();

            // 7. Kiểm tra tài khoản đã có hồ sơ chưa
            boolean daCoHoSo = !benhNhanRepository
                    .findByNguoiDung_MaNguoiDung(
                            nguoiDung.getMaNguoiDung())
                    .isEmpty();

            // 8. Tạo hồ sơ
            BenhNhan benhNhan = new BenhNhan();

            benhNhan.setNguoiDung(nguoiDung);
            benhNhan.setHoTen(hoTen.trim());
            benhNhan.setMoiQuanHe(moiQuanHe);
            benhNhan.setLaHoSoMacDinh(!daCoHoSo);
            benhNhan.setNgaySinh(birthDate);
            benhNhan.setGioiTinh(
                    gioiTinh.isBlank() ? null : gioiTinh);
            benhNhan.setDiaChi(
                    diaChi.isBlank() ? null : diaChi);
            benhNhan.setSoDienThoaiKhanCap(
                    soDienThoai.isBlank() ? null : soDienThoai);
            benhNhan.setTienSuBenh(
                    tienSuBenh.isBlank() ? null : tienSuBenh);

            // 9. Lưu database
            BenhNhan saved = benhNhanRepository.save(benhNhan);

            // Gửi thông báo đến tài khoản vừa tạo hồ sơ.
            String noiDungThongBao =
                    "Hồ sơ bệnh nhân " + saved.getHoTen()
                            + " đã được tạo thành công. "
                            + "Bạn có thể sử dụng hồ sơ này để đăng ký lịch khám "
                            + "và theo dõi thông tin khám chữa bệnh.";

            thongBaoService.taoThongBaoVaGuiRealtime(
                    nguoiDung.getMaNguoiDung(),
                    saved,
                    "Tạo hồ sơ bệnh nhân thành công",
                    noiDungThongBao,
                    "HO_SO_BENH_NHAN"
            );

            // 10. Trả kết quả về Flutter
            Map<String, Object> response = new LinkedHashMap<>();

            response.put("success", true);
            response.put("message", "Tạo hồ sơ bệnh nhân thành công.");
            response.put("MaBenhNhan", saved.getMaBenhNhan());
            response.put("HoTen", saved.getHoTen());
            response.put("MoiQuanHe", saved.getMoiQuanHe());
            response.put("LaHoSoMacDinh", saved.getLaHoSoMacDinh());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "success", false,
                            "message", "Không thể tạo hồ sơ bệnh nhân: "
                                    + e.getMessage()
                    ));
        }
    }

    private String getString(
            Map<String, Object> request,
            String key) {

        Object value = request.get(key);

        return value == null ? "" : value.toString().trim();
    }

    // =========================================
// LẤY DANH SÁCH HỒ SƠ CỦA TÀI KHOẢN ĐANG ĐĂNG NHẬP
// =========================================
    @GetMapping("/ho-so")
    @Transactional(readOnly = true)
    public ResponseEntity<?> layDanhSachHoSo(
            Authentication authentication) {

        if (authentication == null
                || !(authentication.getPrincipal()
                instanceof CustomUserDetails userDetails)) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "Phiên đăng nhập không hợp lệ."
                    ));
        }

        var nguoiDung = userDetails.getNguoiDung();

        var danhSach = benhNhanRepository
                .findByNguoiDung_MaNguoiDung(
                        nguoiDung.getMaNguoiDung()
                );

        var ketQua = danhSach.stream()
                .map(benhNhan -> {
                    Map<String, Object> item = new LinkedHashMap<>();

                    item.put("MaBenhNhan", benhNhan.getMaBenhNhan());
                    item.put("HoTen", benhNhan.getHoTen());
                    item.put("MoiQuanHe", benhNhan.getMoiQuanHe());
                    item.put("LaHoSoMacDinh", benhNhan.getLaHoSoMacDinh());
                    item.put("NgaySinh", benhNhan.getNgaySinh());
                    item.put("GioiTinh", benhNhan.getGioiTinh());
                    item.put("DiaChi", benhNhan.getDiaChi());
                    item.put("SoDienThoaiKhanCap",
                            benhNhan.getSoDienThoaiKhanCap());

                    return item;
                })
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("data", ketQua);

        return ResponseEntity.ok(response);
    }
}