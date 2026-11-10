package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.LichLamViecAdminRequest;
import QuanLyBenhVien.Entity.*;
import QuanLyBenhVien.Repository.BacSiRepository;
import QuanLyBenhVien.Repository.KhoaRepository;
import QuanLyBenhVien.Repository.PhongChuyenTrachRepository;
import QuanLyBenhVien.Service.LichLamViecService;

import QuanLyBenhVien.Service.ThongBaoService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/lich-lam-viec")
public class LichLamViecAdminController {

    private final LichLamViecService lichLamViecService;
    private final BacSiRepository bacSiRepository;
    private final PhongChuyenTrachRepository phongRepository;
    private final KhoaRepository khoaRepository;
    private final ThongBaoService thongBaoService;

    public LichLamViecAdminController(
            LichLamViecService lichLamViecService,
            BacSiRepository bacSiRepository,
            PhongChuyenTrachRepository phongRepository,
            KhoaRepository khoaRepository,
            ThongBaoService thongBaoService) {

        this.lichLamViecService = lichLamViecService;
        this.bacSiRepository = bacSiRepository;
        this.phongRepository = phongRepository;
        this.khoaRepository = khoaRepository;
        this.thongBaoService = thongBaoService;
    }

    // Danh sách lịch + bộ lọc
    @GetMapping
    public ResponseEntity<?> layDanhSach(
            @RequestParam(required = false) LocalDate tuNgay,
            @RequestParam(required = false) LocalDate denNgay,
            @RequestParam(required = false) Integer maBacSi,
            @RequestParam(required = false) Integer maKhoa) {

        try {
            List<Map<String, Object>> result =
                    lichLamViecService.adminLayDanhSachLich(
                                    tuNgay, denNgay, maBacSi, maKhoa)
                            .stream()
                            .map(this::toLichResponse)
                            .toList();

            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // Danh sách bác sĩ hoạt động
    @GetMapping("/bac-si")
    public ResponseEntity<?> layDanhSachBacSi() {
        List<Map<String, Object>> result =
                bacSiRepository.findBacSiHoatDong()
                        .stream()
                        .map(b -> {
                            Map<String, Object> item = new LinkedHashMap<>();
                            item.put("maBacSi", b.getMaBacSi());
                            item.put("hoTen", b.getNguoiDung().getHoTen());
                            item.put("maKhoa", b.getKhoa().getMaKhoa());
                            item.put("tenKhoa", b.getKhoa().getTenKhoa());
                            return item;
                        })
                        .toList();

        return ResponseEntity.ok(result);
    }

    // Danh sách khoa
    @GetMapping("/khoa")
    public ResponseEntity<?> layDanhSachKhoa() {
        List<Map<String, Object>> result =
                khoaRepository.findAll()
                        .stream()
                        .map(k -> {
                            Map<String, Object> item = new LinkedHashMap<>();
                            item.put("maKhoa", k.getMaKhoa());
                            item.put("tenKhoa", k.getTenKhoa());
                            return item;
                        })
                        .toList();

        return ResponseEntity.ok(result);
    }

    // Lấy phòng hoạt động theo khoa
    @GetMapping("/phong")
    public ResponseEntity<?> layPhongTheoKhoa(
            @RequestParam Integer maKhoa) {

        List<Map<String, Object>> result =
                phongRepository
                        .findByKhoa_MaKhoaAndTrangThaiTrueOrderByTenPhongAsc(maKhoa)
                        .stream()
                        .map(p -> {
                            Map<String, Object> item = new LinkedHashMap<>();
                            item.put("maPhong", p.getMaPhong());
                            item.put("tenPhong", p.getTenPhong());
                            item.put("loaiPhong", p.getLoaiPhong());
                            item.put("viTri", p.getViTri());
                            item.put("maKhoa", p.getKhoa().getMaKhoa());
                            return item;
                        })
                        .toList();

        return ResponseEntity.ok(result);
    }

    // Thêm lịch
    @PostMapping
    public ResponseEntity<?> themLich(
            @RequestBody LichLamViecAdminRequest request) {

        try {
            LichLamViec lich =
                    lichLamViecService.adminThemLichLamViec(
                            request.getMaBacSi(),
                            request.getMaPhong(),
                            request.getNgayLamViec(),
                            request.getGioBatDau(),
                            request.getGioKetThuc()
                    );

            // Lấy tài khoản bác sĩ được phân công
            BacSi bacSi = lich.getBacSi();
            NguoiDung nguoiDung = bacSi != null
                    ? bacSi.getNguoiDung()
                    : null;

            // Tạo nội dung thông báo
            if (nguoiDung != null && nguoiDung.getMaNguoiDung() != null) {
                String ngay = lich.getNgayLamViec()
                        .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

                String gioBatDau = lich.getGioBatDau()
                        .format(DateTimeFormatter.ofPattern("HH:mm"));

                String gioKetThuc = lich.getGioKetThuc()
                        .format(DateTimeFormatter.ofPattern("HH:mm"));

                String tenPhong = lich.getPhong() != null
                        ? lich.getPhong().getTenPhong()
                        : "Chưa xác định";

                String noiDung = String.format(
                        "Bạn được phân công lịch làm việc ngày %s, "
                                + "từ %s đến %s tại phòng %s.",
                        ngay,
                        gioBatDau,
                        gioKetThuc,
                        tenPhong
                );

                // Lưu thông báo + gửi WebSocket realtime
                thongBaoService.taoThongBao(
                        nguoiDung.getMaNguoiDung(),
                        "Lịch làm việc mới",
                        noiDung,
                        "LICH_LAM_VIEC"
                );
            }

            return ResponseEntity.ok(toLichResponse(lich));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =============================================
    // Cập nhật lịch
    // =============================================
    @PutMapping("/{maLich}")
    public ResponseEntity<?> capNhatLich(
            @PathVariable Integer maLich,
            @RequestBody LichLamViecAdminRequest request) {

        try {
            LichLamViec lich =
                    lichLamViecService.adminCapNhatLichLamViec(
                            maLich,
                            request.getMaBacSi(),
                            request.getMaPhong(),
                            request.getNgayLamViec(),
                            request.getGioBatDau(),
                            request.getGioKetThuc()
                    );

            // Gửi thông báo sau khi cập nhật thành công
            guiThongBaoLichLamViec(
                    lich,
                    "Lịch làm việc đã được cập nhật",
                    "Admin đã cập nhật lịch làm việc của bạn: "
                            + moTaLichLamViec(lich)
            );

            return ResponseEntity.ok(toLichResponse(lich));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ==============================================
    // Xóa lịch
    // =============================================
    @DeleteMapping("/{maLich}")
    public ResponseEntity<?> xoaLich(
            @PathVariable Integer maLich) {

        try {
            // Lấy lịch trước khi xóa để giữ thông tin bác sĩ và lịch
            LichLamViec lich = lichLamViecService
                    .adminLayDanhSachLich(null, null, null, null)
                    .stream()
                    .filter(item -> item.getMaLichLamViec().equals(maLich))
                    .findFirst()
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Không tìm thấy lịch làm việc."
                            )
                    );

            String noiDung = "Admin đã hủy lịch làm việc của bạn: "
                    + moTaLichLamViec(lich);

            // Xóa lịch
            lichLamViecService.adminXoaLichLamViec(maLich);

            // Chỉ gửi thông báo khi xóa thành công
            guiThongBaoLichLamViec(
                    lich,
                    "Lịch làm việc đã bị hủy",
                    noiDung
            );

            return ResponseEntity.ok(
                    Map.of("message", "Xóa lịch làm việc thành công.")
            );

        } catch (IllegalStateException e) {
            // Lịch đã có yêu cầu điều chỉnh hoặc không thể xóa theo nghiệp vụ
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));

        } catch (DataIntegrityViolationException e) {
            // Database còn dữ liệu liên quan tham chiếu đến lịch
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "message",
                            "Không thể xóa lịch làm việc này vì đã phát sinh yêu cầu điều chỉnh hoặc dữ liệu liên quan. "
                                    + "Vui lòng ngừng sử dụng lịch thay vì xóa."
                    ));
        }
    }

    // =====================================================
    // HELPER GỬI THÔNG BÁO LỊCH LÀM VIỆC
    // =====================================================

    private void guiThongBaoLichLamViec(
            LichLamViec lich,
            String tieuDe,
            String noiDung) {

        if (lich == null || lich.getBacSi() == null) {
            return;
        }

        NguoiDung nguoiDung = lich.getBacSi().getNguoiDung();

        if (nguoiDung == null || nguoiDung.getMaNguoiDung() == null) {
            return;
        }

        thongBaoService.taoThongBao(
                nguoiDung.getMaNguoiDung(),
                tieuDe,
                noiDung,
                "LICH_LAM_VIEC"
        );
    }

    private String moTaLichLamViec(LichLamViec lich) {
        String ngay = lich.getNgayLamViec() != null
                ? lich.getNgayLamViec()
                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "Chưa xác định";

        String gioBatDau = lich.getGioBatDau() != null
                ? lich.getGioBatDau()
                .format(DateTimeFormatter.ofPattern("HH:mm"))
                : "--:--";

        String gioKetThuc = lich.getGioKetThuc() != null
                ? lich.getGioKetThuc()
                .format(DateTimeFormatter.ofPattern("HH:mm"))
                : "--:--";

        String tenPhong = lich.getPhong() != null
                ? lich.getPhong().getTenPhong()
                : "Chưa xác định";

        return String.format(
                "Ngày %s, từ %s đến %s tại phòng %s.",
                ngay,
                gioBatDau,
                gioKetThuc,
                tenPhong
        );
    }

    private Map<String, Object> toLichResponse(LichLamViec l) {
        Map<String, Object> item = new LinkedHashMap<>();

        item.put("maLichLamViec", l.getMaLichLamViec());
        item.put("maBacSi", l.getBacSi().getMaBacSi());
        item.put("hoTenBacSi", l.getBacSi().getNguoiDung().getHoTen());
        item.put("maKhoa", l.getBacSi().getKhoa().getMaKhoa());
        item.put("tenKhoa", l.getBacSi().getKhoa().getTenKhoa());
        item.put("maPhong", l.getPhong().getMaPhong());
        item.put("tenPhong", l.getPhong().getTenPhong());
        item.put("ngayLamViec", l.getNgayLamViec());
        item.put("gioBatDau", l.getGioBatDau());
        item.put("gioKetThuc", l.getGioKetThuc());
        item.put("trangThai", l.getTrangThai());

        return item;
    }
}