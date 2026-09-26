package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Repository.LichDangKyKhamRepository;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.BacSiService;
import QuanLyBenhVien.Service.KhamBenhService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/kham-benh")
public class BacSiKhamBenhController {

    private final BacSiService bacSiService;
    private final KhamBenhService khamBenhService;
    private final LichDangKyKhamRepository lichDangKyKhamRepository;

    public BacSiKhamBenhController(
            BacSiService bacSiService,
            KhamBenhService khamBenhService,
            LichDangKyKhamRepository lichDangKyKhamRepository
    ) {
        this.bacSiService = bacSiService;
        this.khamBenhService = khamBenhService;
        this.lichDangKyKhamRepository = lichDangKyKhamRepository;
    }


    // =========================================================
    // LẤY BÁC SĨ ĐANG ĐĂNG NHẬP
    // =========================================================
    private BacSi layBacSiDangNhap(CustomUserDetails userDetails) {

        if (userDetails == null) {
            throw new RuntimeException("Người dùng chưa đăng nhập");
        }

        Integer maNguoiDung =
                userDetails.getNguoiDung().getMaNguoiDung();

        return bacSiService
                .timBacSiTheoMaNguoiDung(maNguoiDung)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Tài khoản hiện tại không phải bác sĩ"
                        )
                );
    }


    // =========================================================
    // 1. DANH SÁCH BỆNH NHÂN CHỜ KHÁM
    // =========================================================
    @GetMapping("/danh-sach-cho-kham")
    public ResponseEntity<?> danhSachChoKham(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            List<LichDangKyKham> danhSach =
                    lichDangKyKhamRepository.findDanhSachChoKham(
                            bacSi.getMaBacSi(),
                            LocalDate.now()
                    );

            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenLichKhamThanhMap)
                            .toList();

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }
    }


    // =========================================================
    // 2. THỐNG KÊ KHÁM BỆNH TRONG NGÀY
    // =========================================================
    @GetMapping("/thong-ke")
    public ResponseEntity<?> thongKe(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            Integer maBacSi =
                    bacSi.getMaBacSi();

            LocalDate homNay =
                    LocalDate.now();


            long choKham =
                    lichDangKyKhamRepository
                            .countDanhSachChoKham(
                                    maBacSi,
                                    homNay
                            );


            long dangKham =
                    lichDangKyKhamRepository
                            .countByBacSi_MaBacSiAndNgayKhamAndTrangThai(
                                    maBacSi,
                                    homNay,
                                    "DangKham"
                            );


            long daHoanThanh =
                    lichDangKyKhamRepository
                            .countByBacSi_MaBacSiAndNgayKhamAndTrangThai(
                                    maBacSi,
                                    homNay,
                                    "DaKham"
                            );


            Map<String, Object> ketQua =
                    new LinkedHashMap<>();

            ketQua.put(
                    "choKham",
                    choKham
            );

            ketQua.put(
                    "dangKham",
                    dangKham
            );

            ketQua.put(
                    "daHoanThanh",
                    daHoanThanh
            );


            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }
    }


    // =========================================================
    // 3. LỊCH SỬ KHÁM
    //
    // Chỉ lấy những ca đã khám xong của bác sĩ đang đăng nhập.
    //
    // Có thể lọc:
    // /lich-su
    // /lich-su?tuNgay=2026-09-01&denNgay=2026-09-26
    // =========================================================
    @GetMapping("/lich-su")
    public ResponseEntity<?> lichSuKham(
            @RequestParam(required = false)
            LocalDate tuNgay,

            @RequestParam(required = false)
            LocalDate denNgay,

            @AuthenticationPrincipal
            CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            Integer maBacSi =
                    bacSi.getMaBacSi();


            List<LichDangKyKham> danhSach;


            // Nếu không truyền ngày:
            // lấy toàn bộ lịch sử đã khám.
            if (tuNgay == null && denNgay == null) {

                danhSach =
                        lichDangKyKhamRepository
                                .findByBacSi_MaBacSiAndTrangThaiOrderByNgayKhamDescGioKhamDesc(
                                        maBacSi,
                                        "DaKham"
                                );

            } else {

                /*
                    Nếu chỉ nhập một trong hai ngày
                    thì báo lỗi để tránh lọc sai dữ liệu.
                */
                if (tuNgay == null || denNgay == null) {

                    throw new RuntimeException(
                            "Vui lòng chọn đầy đủ từ ngày và đến ngày"
                    );
                }


                if (tuNgay.isAfter(denNgay)) {

                    throw new RuntimeException(
                            "Từ ngày không được lớn hơn đến ngày"
                    );
                }


                danhSach =
                        lichDangKyKhamRepository
                                .findByBacSi_MaBacSiAndTrangThaiAndNgayKhamBetweenOrderByNgayKhamDescGioKhamDesc(
                                        maBacSi,
                                        "DaKham",
                                        tuNgay,
                                        denNgay
                                );
            }


            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenLichSuThanhMap)
                            .toList();


            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }
    }


    // =========================================================
    // 4. BẮT ĐẦU KHÁM
    // =========================================================
    @PostMapping("/{maLichKham}/bat-dau")
    public ResponseEntity<?> batDauKham(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            HoSoBenhAn hoSo =
                    khamBenhService.batDauKham(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            return ResponseEntity.ok(
                    chuyenHoSoThanhMap(hoSo)
            );

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }
    }


    // =========================================================
    // 5. XEM HỒ SƠ KHÁM BỆNH
    // =========================================================
    @GetMapping("/{maLichKham}/ho-so")
    public ResponseEntity<?> xemHoSo(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            HoSoBenhAn hoSo =
                    khamBenhService.xemHoSo(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            return ResponseEntity.ok(
                    chuyenHoSoThanhMap(hoSo)
            );

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }
    }


    // =========================================================
    // 6. CẬP NHẬT HỒ SƠ KHÁM BỆNH
    // =========================================================
    @PutMapping("/{maLichKham}/ho-so")
    public ResponseEntity<?> capNhatHoSo(
            @PathVariable Integer maLichKham,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);


            String trieuChung =
                    layString(
                            request,
                            "trieuChung"
                    );

            String chanDoan =
                    layString(
                            request,
                            "chanDoan"
                    );

            String ketLuan =
                    layString(
                            request,
                            "ketLuan"
                    );

            String huongDieuTri =
                    layString(
                            request,
                            "huongDieuTri"
                    );

            String ghiChuTaiKham =
                    layString(
                            request,
                            "ghiChuTaiKham"
                    );


            LocalDate ngayTaiKham = null;

            Object ngayTaiKhamValue =
                    request.get("ngayTaiKham");


            if (
                    ngayTaiKhamValue != null
                            && !ngayTaiKhamValue
                            .toString()
                            .isBlank()
            ) {

                ngayTaiKham =
                        LocalDate.parse(
                                ngayTaiKhamValue
                                        .toString()
                        );
            }


            HoSoBenhAn hoSo =
                    khamBenhService.capNhatHoSo(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            trieuChung,
                            chanDoan,
                            ketLuan,
                            huongDieuTri,
                            ngayTaiKham,
                            ghiChuTaiKham
                    );


            return ResponseEntity.ok(
                    chuyenHoSoThanhMap(hoSo)
            );

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }
    }


    // =========================================================
    // 7. HOÀN TẤT KHÁM
    // =========================================================
    @PostMapping("/{maLichKham}/hoan-tat")
    public ResponseEntity<?> hoanTatKham(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);


            HoSoBenhAn hoSo =
                    khamBenhService.hoanTatKham(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );


            return ResponseEntity.ok(
                    chuyenHoSoThanhMap(hoSo)
            );

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }
    }


    // =========================================================
    // CHUYỂN LỊCH KHÁM THÀNH JSON
    // =========================================================
    private Map<String, Object> chuyenLichKhamThanhMap(
            LichDangKyKham lich
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();


        map.put(
                "maLichKham",
                lich.getMaLichKham()
        );

        map.put(
                "ngayKham",
                lich.getNgayKham()
        );

        map.put(
                "gioKham",
                lich.getGioKham()
        );

        map.put(
                "lyDoKham",
                lich.getLyDoKham()
        );

        map.put(
                "trangThai",
                lich.getTrangThai()
        );


        if (lich.getSoThuTu() != null) {

            map.put(
                    "soThuTu",
                    lich.getSoThuTu()
                            .getSoThuTu()
            );
        }


        if (lich.getBenhNhan() != null) {

            map.put(
                    "maBenhNhan",
                    lich.getBenhNhan()
                            .getMaBenhNhan()
            );

            map.put(
                    "ngaySinh",
                    lich.getBenhNhan()
                            .getNgaySinh()
            );

            map.put(
                    "gioiTinh",
                    lich.getBenhNhan()
                            .getGioiTinh()
            );


            if (
                    lich.getBenhNhan()
                            .getNguoiDung() != null
            ) {

                map.put(
                        "hoTen",
                        lich.getBenhNhan()
                                .getNguoiDung()
                                .getHoTen()
                );
            }
        }


        return map;
    }


    // =========================================================
    // CHUYỂN LỊCH SỬ KHÁM THÀNH JSON
    // =========================================================
    private Map<String, Object> chuyenLichSuThanhMap(
            LichDangKyKham lich
    ) {

        Map<String, Object> map =
                chuyenLichKhamThanhMap(lich);


        /*
            Chẩn đoán nằm trong HoSoBenhAn.

            Không lấy trực tiếp từ Entity ở đây để tránh
            phụ thuộc quan hệ ngược giữa LichDangKyKham
            và HoSoBenhAn.

            Frontend có thể dùng:
            GET /{maLichKham}/ho-so

            khi người dùng bấm "Xem hồ sơ".
        */

        return map;
    }


    // =========================================================
    // CHUYỂN HỒ SƠ THÀNH JSON
    // =========================================================
    private Map<String, Object> chuyenHoSoThanhMap(
            HoSoBenhAn hoSo
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();


        map.put(
                "maHoSoBenhAn",
                hoSo.getMaHoSoBenhAn()
        );

        map.put(
                "trieuChung",
                hoSo.getTrieuChung()
        );

        map.put(
                "chanDoan",
                hoSo.getChanDoan()
        );

        map.put(
                "ketLuan",
                hoSo.getKetLuan()
        );

        map.put(
                "huongDieuTri",
                hoSo.getHuongDieuTri()
        );

        map.put(
                "ngayTaiKham",
                hoSo.getNgayTaiKham()
        );

        map.put(
                "ghiChuTaiKham",
                hoSo.getGhiChuTaiKham()
        );

        map.put(
                "trangThai",
                hoSo.getTrangThai()
        );


        if (
                hoSo.getLichDangKyKham() != null
        ) {

            LichDangKyKham lich =
                    hoSo.getLichDangKyKham();


            map.put(
                    "maLichKham",
                    lich.getMaLichKham()
            );


            /*
                Thêm thông tin lịch khám vào hồ sơ
                để trang Lịch sử khám hiển thị chi tiết.
            */

            map.put(
                    "ngayKham",
                    lich.getNgayKham()
            );

            map.put(
                    "gioKham",
                    lich.getGioKham()
            );

            map.put(
                    "lyDoKham",
                    lich.getLyDoKham()
            );


            if (lich.getBenhNhan() != null) {

                map.put(
                        "maBenhNhan",
                        lich.getBenhNhan()
                                .getMaBenhNhan()
                );

                map.put(
                        "ngaySinh",
                        lich.getBenhNhan()
                                .getNgaySinh()
                );

                map.put(
                        "gioiTinh",
                        lich.getBenhNhan()
                                .getGioiTinh()
                );


                if (
                        lich.getBenhNhan()
                                .getNguoiDung() != null
                ) {

                    map.put(
                            "hoTen",
                            lich.getBenhNhan()
                                    .getNguoiDung()
                                    .getHoTen()
                    );
                }
            }
        }


        return map;
    }


    // =========================================================
    // HÀM HỖ TRỢ LẤY STRING
    // =========================================================
    private String layString(
            Map<String, Object> request,
            String key
    ) {

        Object value =
                request.get(key);

        if (value == null) {
            return null;
        }

        return value.toString();
    }
}