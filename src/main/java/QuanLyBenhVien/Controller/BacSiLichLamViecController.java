package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.LichLamViecRequest;
import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.LichLamViec;
import QuanLyBenhVien.Entity.PhongChuyenTrach;
import QuanLyBenhVien.Repository.LichDangKyKhamRepository;
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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;

@RestController
@RequestMapping("/api/bac-si/lich-lam-viec")
public class BacSiLichLamViecController {

    private static final int THOI_LUONG_SLOT_PHUT = 30;
    private static final int SUC_CHUA_SLOT = 10;

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

    // =========================================================
    // LẤY LỊCH LÀM VIỆC CỦA BÁC SĨ ĐANG ĐĂNG NHẬP
    // GET /api/bac-si/lich-lam-viec
    // =========================================================
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
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        try {
            if (tuNgay != null && denNgay != null && tuNgay.isAfter(denNgay)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Từ ngày không được sau đến ngày."));
            }

            Integer maNguoiDung =
                    userDetails.getNguoiDung().getMaNguoiDung();

            BacSi bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."));

            Integer maBacSi = bacSi.getMaBacSi();

            System.out.println("[LichLamViec API] maBacSi = " + maBacSi);

            List<LichLamViec> danhSach =
                    lichLamViecService.layLichLamViec(
                            maBacSi,
                            tuNgay,
                            denNgay
                    );

            System.out.println(
                    "[LichLamViec API] Số lịch lấy được = " + danhSach.size()
            );

            List<Map<String, Object>> result = new ArrayList<>();

            // Cache thống kê lượt đặt theo ngày
            Map<LocalDate, NavigableMap<LocalTime, Long>> cacheThongKeTheoNgay =
                    new HashMap<>();

            // Khung giờ làm việc được phép
            // test hoi dong
            //LocalTime gioBatDauChoPhep = LocalTime.of(7, 0);
            //LocalTime gioKetThucChoPhep = LocalTime.of(17, 30);

            for (LichLamViec lich : danhSach) {

                LocalDate ngayLamViec = lich.getNgayLamViec();
                LocalTime batDauCa = lich.getGioBatDau();
                LocalTime ketThucCa = lich.getGioKetThuc();

                System.out.println(
                        "[LichLamViec API] Đang xử lý lịch "
                                + lich.getMaLichLamViec()
                                + ", ngày=" + ngayLamViec
                                + ", giờ=" + batDauCa
                                + "-" + ketThucCa
                );

                // Kiểm tra dữ liệu lịch
                if (ngayLamViec == null
                        || batDauCa == null
                        || ketThucCa == null
                        || !batDauCa.isBefore(ketThucCa)) {

                    System.err.println(
                            "[LichLamViec API] Bỏ qua lịch không hợp lệ: "
                                    + lich.getMaLichLamViec()
                    );
                    continue;
                }

                // Bỏ qua lịch cũ nằm ngoài khung 07:00–17:30
                // test hoi dong
                //                if (batDauCa.isBefore(gioBatDauChoPhep)
                //                        || ketThucCa.isAfter(gioKetThucChoPhep)) {
                //
                //                    System.err.println(
                //                            "[LichLamViec API] Bỏ qua lịch ngoài khung giờ "
                //                                    + "07:00-17:30: "
                //                                    + lich.getMaLichLamViec()
                //                    );
                //                    continue;
                //                }

                // Lấy thống kê lượt đặt một lần cho mỗi ngày
                NavigableMap<LocalTime, Long> thongKeTheoGio =
                        cacheThongKeTheoNgay.get(ngayLamViec);

                if (thongKeTheoGio == null) {
                    System.out.println(
                            "[LichLamViec API] Bắt đầu lấy thống kê ngày "
                                    + ngayLamViec
                    );

                    thongKeTheoGio =
                            layThongKeLuotDatTheoGio(maBacSi, ngayLamViec);

                    if (thongKeTheoGio == null) {
                        thongKeTheoGio = new TreeMap<>();
                    }

                    cacheThongKeTheoNgay.put(
                            ngayLamViec,
                            thongKeTheoGio
                    );

                    System.out.println(
                            "[LichLamViec API] Đã lấy thống kê ngày "
                                    + ngayLamViec
                                    + ", số mốc giờ="
                                    + thongKeTheoGio.size()
                    );
                }

                long tongBenhNhanDaDat = 0;
                int tongSoSlot = 0;

                List<Map<String, Object>> chiTietKhungGio =
                        new ArrayList<>();

                LocalTime batDauKhung = batDauCa;

                // Chia ca thành các slot 30 phút
                while (batDauKhung.isBefore(ketThucCa)) {

                    LocalTime ketThucKhung =
                            batDauKhung.plusMinutes(THOI_LUONG_SLOT_PHUT);

                    // Dừng nếu slot không hợp lệ hoặc vượt giờ kết thúc ca
                    if (!ketThucKhung.isAfter(batDauKhung)
                            || ketThucKhung.isAfter(ketThucCa)) {
                        break;
                    }

                    long daDat = demLuotDatTrongKhungGio(
                            thongKeTheoGio,
                            batDauKhung,
                            ketThucKhung
                    );

                    int soBenhNhan = (int) Math.min(
                            daDat,
                            (long) Integer.MAX_VALUE
                    );

                    int conTrong = Math.max(
                            0,
                            SUC_CHUA_SLOT - soBenhNhan
                    );

                    Map<String, Object> slot = new LinkedHashMap<>();
                    slot.put("gioBatDau", batDauKhung.toString());
                    slot.put("gioKetThuc", ketThucKhung.toString());
                    slot.put("daDat", soBenhNhan);
                    slot.put("tongSoSlot", SUC_CHUA_SLOT);
                    slot.put("conTrong", conTrong);
                    slot.put("hetCho", soBenhNhan >= SUC_CHUA_SLOT);

                    chiTietKhungGio.add(slot);

                    tongBenhNhanDaDat += daDat;
                    tongSoSlot += SUC_CHUA_SLOT;

                    // Chuyển sang slot tiếp theo
                    batDauKhung = ketThucKhung;
                }

                int soSlotConTrong = (int) Math.max(
                        0L,
                        (long) tongSoSlot - tongBenhNhanDaDat
                );

                Map<String, Object> item = new LinkedHashMap<>();

                item.put("maLichLamViec", lich.getMaLichLamViec());
                item.put("ngayLamViec", ngayLamViec);
                item.put("gioBatDau", batDauCa);
                item.put("gioKetThuc", ketThucCa);

                item.put(
                        "maPhong",
                        lich.getPhong() != null
                                ? lich.getPhong().getMaPhong()
                                : null
                );

                item.put("soBenhNhanDaDat", tongBenhNhanDaDat);
                item.put("tongSoSlot", tongSoSlot);
                item.put("soSlotConTrong", soSlotConTrong);
                item.put(
                        "hetCho",
                        tongSoSlot > 0 && soSlotConTrong == 0
                );
                item.put("chiTietKhungGio", chiTietKhungGio);
                item.put("trangThai", lich.getTrangThai());

                result.add(item);

                System.out.println(
                        "[LichLamViec API] Hoàn tất lịch "
                                + lich.getMaLichLamViec()
                                + ", số slot=" + chiTietKhungGio.size()
                );
            }

            System.out.println(
                    "[LichLamViec API] Hoàn tất response. Số lịch trả về = "
                            + result.size()
            );

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));

        } finally {
            System.out.println(
                    "[LichLamViec API] Tổng thời gian xử lý = "
                            + (System.currentTimeMillis() - start)
                            + " ms"
            );
        }
    }

    // =========================================================
    // LẤY PHÒNG KHÁM THUỘC KHOA CỦA BÁC SĨ ĐANG ĐĂNG NHẬP
    // GET /api/bac-si/lich-lam-viec/phong-kham
    // =========================================================
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
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy hồ sơ bác sĩ."));

            if (bacSi.getKhoa() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Bác sĩ chưa được phân công khoa."
                        ));
            }

            Integer maKhoa = bacSi.getKhoa().getMaKhoa();

            List<PhongChuyenTrach> phongKham =
                    phongChuyenTrachRepository
                            .findByKhoa_MaKhoaAndTrangThaiTrueOrderByTenPhongAsc(
                                    maKhoa
                            );

            List<Map<String, Object>> result = phongKham.stream()
                    .map(phong -> {
                        Map<String, Object> item = new LinkedHashMap<>();

                        item.put("maPhong", phong.getMaPhong());
                        item.put("tenPhong", phong.getTenPhong());
                        item.put(
                                "tenKhoa",
                                phong.getKhoa() != null
                                        ? phong.getKhoa().getTenKhoa()
                                        : null
                        );

                        return item;
                    })
                    .toList();

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =========================================================
    // THÊM LỊCH LÀM VIỆC
    // POST /api/bac-si/lich-lam-viec
    // =========================================================
    @PostMapping
    public ResponseEntity<?> themLichLamViec(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody LichLamViecRequest request) {

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
                            "Không tìm thấy hồ sơ bác sĩ."));

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

    // =========================================================
    // CẬP NHẬT LỊCH LÀM VIỆC
    // PUT /api/bac-si/lich-lam-viec/{id}
    // =========================================================
    @PutMapping("/{id}")
    public ResponseEntity<?> capNhatLichLamViec(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Integer id,
            @RequestBody LichLamViecRequest request) {

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
                            "Không tìm thấy hồ sơ bác sĩ."));

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

    // =========================================================
    // XÓA LỊCH LÀM VIỆC
    // DELETE /api/bac-si/lich-lam-viec/{id}
    // =========================================================
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
                            "Không tìm thấy hồ sơ bác sĩ."));

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

    // =========================================================
    // DANH SÁCH BÁC SĨ CÓ LỊCH LÀM VIỆC
    // GET /api/bac-si/lich-lam-viec/danh-sach
    // =========================================================
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
            item.put(
                    "hoTen",
                    bacSi.getNguoiDung() != null
                            ? bacSi.getNguoiDung().getHoTen()
                            : null
            );
            item.put("chuyenMon", bacSi.getChuyenMon());
            item.put("trinhDo", bacSi.getTrinhDo());
            item.put(
                    "soChungChiHanhNghe",
                    bacSi.getSoChungChiHanhNghe()
            );
            item.put(
                    "anhDaiDien",
                    bacSi.getNguoiDung() != null
                            ? bacSi.getNguoiDung().getAnhDaiDien()
                            : null
            );
            item.put("maLichLamViec", lich.getMaLichLamViec());

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

    // =========================================================
    // LẤY CÁC KHUNG GIỜ KHÁM CỦA BÁC SĨ
    // GET /api/bac-si/lich-lam-viec/khung-gio
    // =========================================================
    @GetMapping("/khung-gio")
    public ResponseEntity<?> layKhungGioKham(
            @RequestParam Integer maBacSi,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate ngayKham) {

        if (maBacSi == null || ngayKham == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Vui lòng chọn bác sĩ và ngày khám."
                    ));
        }

        List<LichLamViec> lichLamViec =
                lichLamViecService.layLichLamViec(
                        maBacSi,
                        ngayKham,
                        ngayKham
                );

        List<Map<String, Object>> result = new ArrayList<>();

        NavigableMap<LocalTime, Long> thongKeTheoGio =
                layThongKeLuotDatTheoGio(maBacSi, ngayKham);

        for (LichLamViec lich : lichLamViec) {
            LocalTime batDau = lich.getGioBatDau();
            LocalTime ketThuc = lich.getGioKetThuc();

            if (batDau == null
                    || ketThuc == null
                    || !batDau.isBefore(ketThuc)) {
                continue;
            }

            while (!batDau.plusMinutes(THOI_LUONG_SLOT_PHUT)
                    .isAfter(ketThuc)) {

                LocalTime gioKetThucKhung =
                        batDau.plusMinutes(THOI_LUONG_SLOT_PHUT);

                long daDat = demLuotDatTrongKhungGio(
                        thongKeTheoGio,
                        batDau,
                        gioKetThucKhung
                );

                Map<String, Object> item = new LinkedHashMap<>();

                item.put("maLichLamViec", lich.getMaLichLamViec());
                item.put("gioBatDau", batDau.toString());
                item.put("gioKetThuc", gioKetThucKhung.toString());
                item.put("daDat", daDat);
                item.put("conTrong", Math.max(0L, SUC_CHUA_SLOT - daDat));
                item.put("hetCho", daDat >= SUC_CHUA_SLOT);

                result.add(item);

                batDau = gioKetThucKhung;
            }
        }

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // THỐNG KÊ LƯỢT ĐẶT THEO GIỜ
    // =========================================================
    private NavigableMap<LocalTime, Long> layThongKeLuotDatTheoGio(
            Integer maBacSi,
            LocalDate ngayKham) {

        NavigableMap<LocalTime, Long> thongKe = new TreeMap<>();

        List<Object[]> rows =
                lichDangKyKhamRepository.thongKeLuotDatTheoGio(
                        maBacSi,
                        ngayKham
                );

        if (rows == null || rows.isEmpty()) {
            return thongKe;
        }

        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null) {
                continue;
            }

            LocalTime gioKham = (LocalTime) row[0];
            long soLuong = ((Number) row[1]).longValue();

            thongKe.put(gioKham, soLuong);
        }

        return thongKe;
    }

    // =========================================================
    // ĐẾM LƯỢT ĐẶT TRONG MỘT KHUNG GIỜ
    // =========================================================
    private long demLuotDatTrongKhungGio(
            NavigableMap<LocalTime, Long> thongKe,
            LocalTime gioBatDau,
            LocalTime gioKetThuc) {

        if (thongKe == null
                || gioBatDau == null
                || gioKetThuc == null
                || !gioBatDau.isBefore(gioKetThuc)) {
            return 0;
        }

        long tong = 0;

        for (Map.Entry<LocalTime, Long> entry
                : thongKe.entrySet()) {

            LocalTime gioKham = entry.getKey();
            Long soLuong = entry.getValue();

            if (gioKham != null
                    && soLuong != null
                    && !gioKham.isBefore(gioBatDau)
                    && gioKham.isBefore(gioKetThuc)) {

                tong += soLuong;
            }
        }

        return tong;
    }
}