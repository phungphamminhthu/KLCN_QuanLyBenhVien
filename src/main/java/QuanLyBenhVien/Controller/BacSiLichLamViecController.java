package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.LichLamViec;
import QuanLyBenhVien.Entity.PhongChuyenTrach;
import QuanLyBenhVien.Repository.LichDangKyKhamRepository;
import QuanLyBenhVien.Repository.LichLamViecRepository;
import QuanLyBenhVien.Repository.PhongChuyenTrachRepository;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.BacSiService;
import QuanLyBenhVien.Service.LichLamViecService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/lich-lam-viec")
public class BacSiLichLamViecController {

    private final LichLamViecService lichLamViecService;
    private final BacSiService bacSiService;
    private final PhongChuyenTrachRepository phongChuyenTrachRepository;
    private final LichDangKyKhamRepository lichDangKyKhamRepository;

    public BacSiLichLamViecController(
            LichLamViecService lichLamViecService,
            BacSiService bacSiService,
            PhongChuyenTrachRepository phongChuyenTrachRepository,
            LichDangKyKhamRepository lichDangKyKhamRepository) {
        this.lichLamViecService = lichLamViecService;
        this.bacSiService = bacSiService;
        this.phongChuyenTrachRepository = phongChuyenTrachRepository;
        this.lichDangKyKhamRepository = lichDangKyKhamRepository;

    }

    // Lấy lịch làm việc của bác sĩ đang đăng nhập

    @GetMapping
    public ResponseEntity<?> layLichLamViec(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate tuNgay,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate denNgay) {

        long start = System.currentTimeMillis();
        System.out.println("[LichLamViec API] Bắt đầu xử lý");

        if (userDetails == null) {
            System.out.println("[LichLamViec API] Không có userDetails");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            System.out.println(
                    "[LichLamViec API] maNguoiDung = " + maNguoiDung
            );

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."
                    ));

            System.out.println(
                    "[LichLamViec API] Tìm thấy bác sĩ: "
                            + bacSi.getMaBacSi()
            );

            var danhSach = lichLamViecService.layLichLamViec(
                    bacSi.getMaBacSi(),
                    tuNgay,
                    denNgay
            );

            System.out.println(
                    "[LichLamViec API] Lấy lịch xong, số lượng = "
                            + danhSach.size()
            );

            System.out.println(
                    "[LichLamViec API] Tổng thời gian = "
                            + (System.currentTimeMillis() - start)
                            + " ms"
            );

            //return ResponseEntity.ok(danhSach);

            List<Map<String, Object>> result = new ArrayList<>();

            for (LichLamViec lich : danhSach) {
                long soBenhNhanDaDat =
                        lichDangKyKhamRepository.countLuotDatTrongKhungGio(
                                bacSi.getMaBacSi(),
                                lich.getNgayLamViec(),
                                lich.getGioBatDau(),
                                lich.getGioKetThuc()
                        );

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("maLichLamViec", lich.getMaLichLamViec());
                item.put("ngayLamViec", lich.getNgayLamViec());
                item.put("gioBatDau", lich.getGioBatDau());
                item.put("gioKetThuc", lich.getGioKetThuc());
                item.put("maPhong", lich.getPhong() != null
                        ? lich.getPhong().getMaPhong() : null);
                item.put("soBenhNhanDaDat", soBenhNhanDaDat);
                item.put("hetCho", soBenhNhanDaDat >= 10);
                item.put("trangThai", lich.getTrangThai());

                result.add(item);
            }

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }


    // Lấy phòng khám thuộc khoa của bác sĩ đang đăng nhập
    @GetMapping("/phong-kham")
    public ResponseEntity<?> layDanhSachPhongKham(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Không tìm thấy hồ sơ bác sĩ."
                            ));

            Integer maKhoa = bacSi.getKhoa().getMaKhoa();

            List<PhongChuyenTrach> phongKham =
                    phongChuyenTrachRepository
                            .findByKhoa_MaKhoaAndTrangThaiTrueOrderByTenPhongAsc(maKhoa);

            List<Map<String, Object>> result = phongKham.stream()
                    .map(phong -> Map.<String, Object>of(
                            "maPhong", phong.getMaPhong(),
                            "tenPhong", phong.getTenPhong(),
                            "tenKhoa", phong.getKhoa().getTenKhoa()
                    ))
                    .toList();

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> themLichLamViec(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody QuanLyBenhVien.DTO.LichLamViecRequest request
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."
                    ));

            var lich = lichLamViecService.themLichLamViec(
                    bacSi.getMaBacSi(),
                    request.maPhong(),
                    request.ngayLamViec(),
                    request.gioBatDau(),
                    request.gioKetThuc()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(lich);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =============================================
    // CÂP NHẬT LỊCH LÀM VIỆC
    // =============================================
    @PutMapping("/{id}")
    public ResponseEntity<?> capNhatLichLamViec(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Integer id,
            @RequestBody QuanLyBenhVien.DTO.LichLamViecRequest request
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."
                    ));

            var lich = lichLamViecService.capNhatLichLamViec(
                    id,
                    bacSi.getMaBacSi(),
                    request.maPhong(),
                    request.ngayLamViec(),
                    request.gioBatDau(),
                    request.gioKetThuc()
            );

            return ResponseEntity.ok(lich);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ===================================================
    //    XÓA LỊCH LÀM VIỆC
    // ===================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<?> xoaLichLamViec(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Integer id) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."
                    ));

            lichLamViecService.xoaLichLamViec(
                    id,
                    bacSi.getMaBacSi()
            );

            return ResponseEntity.ok(
                    Map.of("message", "Xóa lịch làm việc thành công.")
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // API lấy danh sách bác sĩ có lịch làm việc
// phục vụ bệnh nhân đặt lịch khám.
    @GetMapping("/danh-sach")
    public ResponseEntity<?> layDanhSachBacSiDatKham(
            @RequestParam Integer maKhoa,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate ngayLamViec) {

        if (maKhoa == null || ngayLamViec == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Vui lòng chọn khoa và ngày khám."
                    ));
        }

        List<LichLamViec> danhSach =
                lichLamViecService.layLichBacSiDatKham(
                        maKhoa,
                        ngayLamViec
                );

        List<Map<String, Object>> result = new ArrayList<>();

        for (LichLamViec lich : danhSach) {
            BacSi bacSi = lich.getBacSi();

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("maBacSi", bacSi.getMaBacSi());
            item.put("hoTen", bacSi.getNguoiDung().getHoTen());
            item.put("chuyenMon", bacSi.getChuyenMon());
            item.put("trinhDo", bacSi.getTrinhDo());

            // THÔNG TIN CHỨNG CHỈ HÀNH NGHỀ
            item.put(
                    "soChungChiHanhNghe",
                    bacSi.getSoChungChiHanhNghe()
            );

            // ẢNH ĐẠI DIỆN
            item.put(
                    "anhDaiDien",
                    bacSi.getNguoiDung() != null
                            ? bacSi.getNguoiDung().getAnhDaiDien()
                            : null
            );
            item.put("maLichLamViec", lich.getMaLichLamViec());

            // Thông tin phòng khám của lịch làm việc
            PhongChuyenTrach phong = lich.getPhong();

            item.put(
                    "maPhong",
                    phong != null ? phong.getMaPhong() : null
            );
            item.put(
                    "tenPhong",
                    phong != null ? phong.getTenPhong() : null
            );

            item.put("gioBatDau", lich.getGioBatDau());
            item.put("gioKetThuc", lich.getGioKetThuc());

            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/khung-gio")
    public ResponseEntity<?> layKhungGioKham(
            @RequestParam Integer maBacSi,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate ngayKham) {

        if (maBacSi == null || ngayKham == null) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Vui lòng chọn bác sĩ và ngày khám.")
            );
        }

        List<LichLamViec> lichLamViec =
                lichLamViecService.layLichLamViec(
                        maBacSi, ngayKham, ngayKham
                );

        List<Map<String, Object>> result = new ArrayList<>();

        for (LichLamViec lich : lichLamViec) {
            LocalTime batDau = lich.getGioBatDau();
            LocalTime ketThuc = lich.getGioKetThuc();

            while (!batDau.plusMinutes(30).isAfter(ketThuc)) {
                LocalTime gioKetThucKhung = batDau.plusMinutes(30);

                long daDat =
                        lichDangKyKhamRepository.countLuotDatTrongKhungGio(
                                maBacSi, ngayKham, batDau, gioKetThucKhung
                        );

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("gioBatDau", batDau.toString());
                item.put("gioKetThuc", gioKetThucKhung.toString());
                item.put("daDat", daDat);
                item.put("conTrong", Math.max(0, 10 - daDat));
                item.put("hetCho", daDat >= 10);

                result.add(item);
                batDau = gioKetThucKhung;
            }
        }

        return ResponseEntity.ok(result);
    }
}