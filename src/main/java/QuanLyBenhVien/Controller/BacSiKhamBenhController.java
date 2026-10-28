package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.DonThuocRequest;
import org.springframework.data.domain.Page;
import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.CTDonThuoc;
import QuanLyBenhVien.Entity.ChiDinhYTe;
import QuanLyBenhVien.Entity.ChiTietKetQua;
import QuanLyBenhVien.Entity.DichVuYTe;
import QuanLyBenhVien.Entity.DonThuoc;
import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Entity.KetQuaDichVu;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Entity.Thuoc;

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
import java.util.Optional;
import QuanLyBenhVien.Repository.ChiDinhYTeRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.util.Set;
@RestController
@RequestMapping("/api/bac-si/kham-benh")
public class BacSiKhamBenhController {

    private final BacSiService bacSiService;
    private final KhamBenhService khamBenhService;
    private final LichDangKyKhamRepository lichDangKyKhamRepository;
    private final ChiDinhYTeRepository chiDinhYTeRepository;
    private final JdbcTemplate jdbcTemplate;


    public BacSiKhamBenhController(
            BacSiService bacSiService,
            KhamBenhService khamBenhService,
            LichDangKyKhamRepository lichDangKyKhamRepository,
            ChiDinhYTeRepository chiDinhYTeRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.bacSiService = bacSiService;
        this.khamBenhService = khamBenhService;
        this.lichDangKyKhamRepository = lichDangKyKhamRepository;
        this.chiDinhYTeRepository = chiDinhYTeRepository;
        this.jdbcTemplate = jdbcTemplate;
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

            BacSi bacSi = layBacSiDangNhap(userDetails);

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
            return loi(e);
        }
    }


    // =========================================================
    // 2. DANH SÁCH BỆNH NHÂN ĐANG KHÁM
    // =========================================================
    @GetMapping("/danh-sach-dang-kham")
    public ResponseEntity<?> danhSachDangKham(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi = layBacSiDangNhap(userDetails);

            List<LichDangKyKham> danhSach =
                    lichDangKyKhamRepository
                            .findByBacSi_MaBacSiAndNgayKhamAndTrangThaiInOrderByGioKhamAsc(
                                    bacSi.getMaBacSi(),
                                    LocalDate.now(),
                                    List.of("DangKham", "ChoCLS")
                            );

            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenLichKhamThanhMap)
                            .toList();

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 3. THỐNG KÊ KHÁM BỆNH TRONG NGÀY
    // =========================================================
    @GetMapping("/thong-ke")
    public ResponseEntity<?> thongKe(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi = layBacSiDangNhap(userDetails);

            Integer maBacSi = bacSi.getMaBacSi();
            LocalDate homNay = LocalDate.now();

            long choKham =
                    lichDangKyKhamRepository
                            .countDanhSachChoKham(
                                    maBacSi,
                                    homNay
                            );


            long dangKham =
                    lichDangKyKhamRepository
                            .countByBacSi_MaBacSiAndNgayKhamAndTrangThaiIn(
                                    maBacSi,
                                    homNay,
                                    List.of("DangKham", "ChoCLS")
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

            ketQua.put("choKham", choKham);
            ketQua.put("dangKham", dangKham);
            ketQua.put("daHoanThanh", daHoanThanh);

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 4. LỊCH SỬ KHÁM
    // =========================================================
    @GetMapping("/lich-su")
    public ResponseEntity<?> lichSuKham(
            @RequestParam(required = false) LocalDate tuNgay,
            @RequestParam(required = false) LocalDate denNgay,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi = layBacSiDangNhap(userDetails);
            Integer maBacSi = bacSi.getMaBacSi();

            List<LichDangKyKham> danhSach;

            if (tuNgay == null && denNgay == null) {

                danhSach =
                        lichDangKyKhamRepository
                                .findByBacSi_MaBacSiAndTrangThaiOrderByNgayKhamDescGioKhamDesc(
                                        maBacSi,
                                        "DaKham"
                                );

            } else {

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
                            .map(lich -> {
                                Map<String, Object> map =
                                        chuyenLichKhamThanhMap(lich);

                                if (lich.getBenhNhan() != null) {
                                    map.put(
                                            "tienSuBenh",
                                            lich.getBenhNhan().getTienSuBenh()
                                    );
                                }

                                return map;
                            })
                            .toList();
            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 5. BẮT ĐẦU KHÁM
    // =========================================================
    @PostMapping("/{maLichKham}/bat-dau")
    public ResponseEntity<?> batDauKham(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi = layBacSiDangNhap(userDetails);

            HoSoBenhAn hoSo =
                    khamBenhService.batDauKham(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            return ResponseEntity.ok(
                    chuyenHoSoThanhMap(hoSo)
            );

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 6. XEM / TIẾP TỤC HỒ SƠ KHÁM BỆNH
    // =========================================================
    @GetMapping("/{maLichKham}/ho-so")
    public ResponseEntity<?> xemHoSo(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi = layBacSiDangNhap(userDetails);

            HoSoBenhAn hoSo =
                    khamBenhService.xemHoSo(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            return ResponseEntity.ok(
                    chuyenHoSoThanhMap(hoSo)
            );

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 7. CẬP NHẬT HỒ SƠ KHÁM BỆNH
    // =========================================================
    @PutMapping("/{maLichKham}/ho-so")
    public ResponseEntity<?> capNhatHoSo(
            @PathVariable Integer maLichKham,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi = layBacSiDangNhap(userDetails);

            String trieuChung =
                    layString(request, "trieuChung");

            String chanDoan =
                    layString(request, "chanDoan");

            String ketLuan =
                    layString(request, "ketLuan");

            String huongDieuTri =
                    layString(request, "huongDieuTri");

            String ghiChuTaiKham =
                    layString(request, "ghiChuTaiKham");

            LocalDate ngayTaiKham = null;

            Object ngayTaiKhamValue =
                    request.get("ngayTaiKham");

            if (ngayTaiKhamValue != null
                    && !ngayTaiKhamValue.toString().isBlank()) {

                ngayTaiKham =
                        LocalDate.parse(
                                ngayTaiKhamValue.toString()
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
            return loi(e);
        }
    }


    // =========================================================
    // 8. HOÀN TẤT KHÁM
    // =========================================================
    @PostMapping("/{maLichKham}/hoan-tat")
    public ResponseEntity<?> hoanTatKham(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi = layBacSiDangNhap(userDetails);

            HoSoBenhAn hoSo =
                    khamBenhService.hoanTatKham(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            return ResponseEntity.ok(
                    chuyenHoSoThanhMap(hoSo)
            );

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 9. DANH SÁCH DỊCH VỤ Y TẾ
    // =========================================================
    @GetMapping("/dich-vu")
    public ResponseEntity<?> danhSachDichVu(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            layBacSiDangNhap(userDetails);

            List<DichVuYTe> danhSach =
                    khamBenhService.layDanhSachDichVu();

            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenDichVuThanhMap)
                            .toList();

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 10. TẠO CHỈ ĐỊNH CẬN LÂM SÀNG
    // =========================================================
    @PostMapping("/{maLichKham}/chi-dinh")
    public ResponseEntity<?> taoChiDinh(
            @PathVariable Integer maLichKham,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            Integer maDichVu =
                    layIntegerBatBuoc(
                            request,
                            "maDichVu",
                            "Vui lòng chọn dịch vụ cần chỉ định."
                    );

            Integer maPhong =
                    layIntegerKhongBatBuoc(
                            request,
                            "maPhong"
                    );

            ChiDinhYTe chiDinh =
                    khamBenhService.taoChiDinh(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            maDichVu,
                            maPhong
                    );

            return ResponseEntity.ok(
                    chuyenChiDinhThanhMap(chiDinh)
            );

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 11. DANH SÁCH CHỈ ĐỊNH CỦA CA KHÁM
    // =========================================================
    @GetMapping("/{maLichKham}/chi-dinh")
    public ResponseEntity<?> danhSachChiDinh(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            List<ChiDinhYTe> danhSach =
                    khamBenhService.layDanhSachChiDinh(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenChiDinhThanhMap)
                            .toList();

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 12. DANH SÁCH TẤT CẢ CHỈ ĐỊNH CỦA BÁC SĨ
    // =========================================================
    @GetMapping("/chi-dinh")
    public ResponseEntity<?> danhSachTatCaChiDinh(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            List<ChiDinhYTe> danhSach =
                    khamBenhService.layTatCaChiDinhCuaBacSi(
                            bacSi.getMaBacSi()
                    );

            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenChiDinhTongQuatThanhMap)
                            .toList();

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 13. XEM MỘT CHỈ ĐỊNH
    // =========================================================
    @GetMapping("/{maLichKham}/chi-dinh/{maChiDinh}")
    public ResponseEntity<?> xemChiDinh(
            @PathVariable Integer maLichKham,
            @PathVariable Integer maChiDinh,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            ChiDinhYTe chiDinh =
                    khamBenhService.xemChiDinh(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            maChiDinh
                    );

            return ResponseEntity.ok(
                    chuyenChiDinhThanhMap(chiDinh)
            );

        } catch (Exception e) {
            return loi(e);

        }

    }

    @GetMapping("/{maLichKham}/chi-dinh/{maChiDinh}/chi-tiet-day-du")
    public ResponseEntity<?> chiTietChiDinhDayDu(
            @PathVariable Integer maLichKham,
            @PathVariable Integer maChiDinh,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            BacSi bacSi = layBacSiDangNhap(userDetails);

            ChiDinhYTe chiDinh = khamBenhService.xemChiDinh(
                    bacSi.getMaBacSi(),
                    maLichKham,
                    maChiDinh
            );

            Map<String, Object> map =
                    chuyenChiDinhThanhMap(chiDinh);

            HoSoBenhAn hoSo = chiDinh.getHoSoBenhAn();

            if (hoSo != null && hoSo.getLichDangKyKham() != null) {
                LichDangKyKham lich = hoSo.getLichDangKyKham();

                map.put("maLichKham", lich.getMaLichKham());
                map.put("ngayKham", lich.getNgayKham());

                if (lich.getBenhNhan() != null &&
                        lich.getBenhNhan().getNguoiDung() != null) {

                    map.put(
                            "hoTen",
                            lich.getBenhNhan()
                                    .getNguoiDung()
                                    .getHoTen()
                    );
                }
            }

            if (chiDinh.getDichVuYTe() != null) {
                Integer maDichVu =
                        chiDinh.getDichVuYTe().getMaDichVu();

                List<Map<String, Object>> chiSo =
                        jdbcTemplate.queryForList(
                                """
                                SELECT
                                    MaChiSoDichVu AS maChiSoDichVu,
                                    TenChiSo AS tenChiSo,
                                    DonVi AS donVi,
                                    GiaTriThamChieu AS giaTriThamChieu
                                FROM ChiSoDichVu
                                WHERE MaDichVu = ?
                                ORDER BY ThuTuHienThi, MaChiSoDichVu
                                """,
                                maDichVu
                        );

                map.put("chiSo", chiSo);
            } else {
                map.put("chiSo", List.of());
            }

            return ResponseEntity.ok(map);

        } catch (Exception e) {
            return loi(e);
        }
    }

    @GetMapping("/{maLichKham}/phieu-chi-dinh/{maPhieuChiDinh}")
    public ResponseEntity<?> xemChiTietPhieuChiDinh(
            @PathVariable Integer maLichKham,
            @PathVariable String maPhieuChiDinh,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            BacSi bacSi = layBacSiDangNhap(userDetails);

            if (maPhieuChiDinh == null ||
                    !maPhieuChiDinh.matches(
                            "[0-9a-fA-F-]{36}"
                    )) {
                throw new IllegalArgumentException(
                        "Mã phiếu chỉ định không hợp lệ."
                );
            }

            List<Integer> danhSachMaChiDinh =
                    jdbcTemplate.queryForList(
                            """
                            SELECT MaChiDinh
                            FROM ChiDinhYTe
                            WHERE MaPhieuChiDinh = ?
                            ORDER BY MaChiDinh ASC
                            """,
                            Integer.class,
                            maPhieuChiDinh
                    );

            if (danhSachMaChiDinh.isEmpty()) {
                throw new IllegalArgumentException(
                        "Không tìm thấy phiếu chỉ định."
                );
            }

            List<Map<String, Object>> dichVuTrongPhieu =
                    new java.util.ArrayList<>();

            Map<String, Object> ketQua = new LinkedHashMap<>();
            java.util.List<String> trangThaiDichVu =
                    new java.util.ArrayList<>();

            Integer maHoSoChung = null;

            for (Integer maChiDinh : danhSachMaChiDinh) {

                // Kiểm tra chỉ định thuộc lịch khám và bác sĩ
                ChiDinhYTe chiDinh =
                        khamBenhService.xemChiDinh(
                                bacSi.getMaBacSi(),
                                maLichKham,
                                maChiDinh
                        );

                HoSoBenhAn hoSo = chiDinh.getHoSoBenhAn();

                if (maHoSoChung == null) {
                    maHoSoChung = hoSo.getMaHoSoBenhAn();
                } else if (!maHoSoChung.equals(
                        hoSo.getMaHoSoBenhAn())) {
                    throw new IllegalStateException(
                            "Phiếu có chỉ định thuộc nhiều hồ sơ."
                    );
                }

                if (dichVuTrongPhieu.isEmpty()) {
                    ketQua.putAll(
                            chuyenChiDinhTongQuatThanhMap(chiDinh)
                    );
                }

                Map<String, Object> dichVu =
                        chuyenChiDinhThanhMap(chiDinh);

                Integer maDichVu =
                        chiDinh.getDichVuYTe().getMaDichVu();

                List<Map<String, Object>> chiSo =
                        jdbcTemplate.queryForList(
                                """
                                SELECT
                                    MaChiSoDichVu AS maChiSoDichVu,
                                    TenChiSo AS tenChiSo,
                                    DonVi AS donVi,
                                    GiaTriThamChieu AS giaTriThamChieu
                                FROM ChiSoDichVu
                                WHERE MaDichVu = ?
                                ORDER BY ThuTuHienThi, MaChiSoDichVu
                                """,
                                maDichVu
                        );

                List<Map<String, Object>> thongTinDanhMuc =
                        jdbcTemplate.queryForList(
                                """
                                SELECT Nhom AS nhom,
                                       TenHienThi AS tenHienThi,
                                       ThuTu AS thuTu
                                FROM PhieuXetNghiemDanhMuc
                                WHERE MaDichVu = ?
                                ORDER BY ThuTu, MaMuc
                                LIMIT 1
                                """,
                                maDichVu
                        );

                if (!thongTinDanhMuc.isEmpty()) {
                    Map<String, Object> danhMuc = thongTinDanhMuc.get(0);

                    dichVu.put("nhom", danhMuc.get("nhom"));
                    dichVu.put("tenHienThi", danhMuc.get("tenHienThi"));
                    dichVu.put("thuTu", danhMuc.get("thuTu"));
                } else {
                    dichVu.put("nhom", "Dịch vụ khác");
                    dichVu.put("tenHienThi", dichVu.get("tenDichVu"));
                    dichVu.put("thuTu", 9999);
                }


                dichVu.put("chiSo", chiSo);
                dichVu.remove("gia");

                dichVuTrongPhieu.add(dichVu);
                trangThaiDichVu.add(chiDinh.getTrangThai());
            }

            String trangThaiPhieu;

            if (trangThaiDichVu.stream()
                    .allMatch("DaHoanThanh"::equals)) {
                trangThaiPhieu = "DaHoanThanh";
            } else if (trangThaiDichVu.stream()
                    .anyMatch(t -> "DangThucHien".equals(t)
                            || "DaHoanThanh".equals(t))) {
                trangThaiPhieu = "DangThucHien";
            } else {
                trangThaiPhieu = "ChoThucHien";
            }

            ketQua.put("maPhieuChiDinh", maPhieuChiDinh);
            ketQua.put("soDichVu", dichVuTrongPhieu.size());
            ketQua.put("danhSachDichVu", dichVuTrongPhieu);
            ketQua.put("trangThai", trangThaiPhieu);
            ketQua.remove("gia");

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    @PatchMapping("/{maLichKham}/chi-dinh/{maChiDinh}/trang-thai")
    public ResponseEntity<?> capNhatTrangThaiChiDinh(
            @PathVariable Integer maLichKham,
            @PathVariable Integer maChiDinh,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {
            BacSi bacSi = layBacSiDangNhap(userDetails);

            ChiDinhYTe chiDinh = khamBenhService.xemChiDinh(
                    bacSi.getMaBacSi(),
                    maLichKham,
                    maChiDinh
            );

            String trangThai = String.valueOf(
                    request.getOrDefault("trangThai", "")
            );

            Set<String> hopLe = Set.of(
                    "ChoThucHien",
                    "DangThucHien",
                    "DaHoanThanh"
            );

            if (!hopLe.contains(trangThai)) {
                return ResponseEntity.badRequest().body(
                        Map.of("message", "Trạng thái không hợp lệ.")
                );
            }

            String hienTai = chiDinh.getTrangThai();

            boolean chuyenHopLe =
                    trangThai.equals(hienTai)
                            || ("ChoThucHien".equals(hienTai)
                            && "DangThucHien".equals(trangThai))
                            || ("DangThucHien".equals(hienTai)
                            && "DaHoanThanh".equals(trangThai));

            if (!chuyenHopLe) {
                return ResponseEntity.badRequest().body(
                        Map.of("message", "Không thể chuyển sang trạng thái này.")
                );
            }

            chiDinh.setTrangThai(trangThai);
            chiDinhYTeRepository.save(chiDinh);

            return ResponseEntity.ok(Map.of(
                    "message", "Cập nhật trạng thái thành công.",
                    "maChiDinh", maChiDinh,
                    "trangThai", trangThai
            ));

        } catch (Exception e) {
            return loi(e);
        }
    }



    // =========================================================
    // 14. XEM KẾT QUẢ CẬN LÂM SÀNG
    // =========================================================
    @GetMapping("/{maLichKham}/chi-dinh/{maChiDinh}/ket-qua")
    public ResponseEntity<?> xemKetQua(
            @PathVariable Integer maLichKham,
            @PathVariable Integer maChiDinh,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            Optional<KetQuaDichVu> optionalKetQua =
                    khamBenhService.xemKetQuaChiDinh(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            maChiDinh
                    );

            if (optionalKetQua.isEmpty()) {

                Map<String, Object> response =
                        new LinkedHashMap<>();

                response.put("coKetQua", false);
                response.put(
                        "message",
                        "Chỉ định chưa có kết quả."
                );

                return ResponseEntity.ok(response);
            }

            KetQuaDichVu ketQua =
                    optionalKetQua.get();

            List<ChiTietKetQua> chiTiet =
                    khamBenhService.xemChiTietKetQua(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            maChiDinh
                    );

            Map<String, Object> response =
                    chuyenKetQuaThanhMap(
                            ketQua,
                            chiTiet
                    );

            response.put("coKetQua", true);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
    // 15. DANH SÁCH KẾT QUẢ CẬN LÂM SÀNG CỦA BÁC SĨ
    // =========================================================
    @GetMapping("/ket-qua-can-lam-sang")
    public ResponseEntity<?> danhSachKetQuaCanLamSang(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            /*
             * Lấy tất cả chỉ định thay vì chỉ lấy KetQuaDichVu.
             *
             * Nhờ vậy:
             * - Chỉ định chưa có kết quả vẫn được hiển thị.
             * - Chỉ định có kết quả sẽ hiển thị nút Xem.
             */
            List<ChiDinhYTe> danhSach =
                    khamBenhService.layTatCaChiDinhCuaBacSi(
                            bacSi.getMaBacSi()
                    );

            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenChiDinhThanhKetQuaTongQuat)
                            .toList();

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }



    // =========================================================
// 16. DANH SÁCH THUỐC
// =========================================================
    @GetMapping("/thuoc")
    public ResponseEntity<?> danhSachThuoc(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            // Chỉ bác sĩ đang đăng nhập mới được lấy danh sách thuốc
            layBacSiDangNhap(userDetails);

            List<Thuoc> danhSach =
                    khamBenhService.layDanhSachThuoc();

            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenThuocThanhMap)
                            .toList();

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
// 17. TẠO ĐƠN THUỐC CHO CA KHÁM
// =========================================================
    @PostMapping("/{maLichKham}/don-thuoc")
    public ResponseEntity<?> taoDonThuoc(
            @PathVariable Integer maLichKham,
            @RequestBody DonThuocRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            DonThuoc donThuoc =
                    khamBenhService.taoDonThuoc(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            request
                    );

            List<CTDonThuoc> chiTiet =
                    khamBenhService.xemChiTietDonThuoc(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            return ResponseEntity.ok(
                    chuyenDonThuocThanhMap(
                            donThuoc,
                            chiTiet
                    )
            );

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
// 18. XEM ĐƠN THUỐC CỦA CA KHÁM
// =========================================================
    @GetMapping("/{maLichKham}/don-thuoc")
    public ResponseEntity<?> xemDonThuoc(
            @PathVariable Integer maLichKham,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            Optional<DonThuoc> optionalDonThuoc =
                    khamBenhService.xemDonThuoc(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            if (optionalDonThuoc.isEmpty()) {

                Map<String, Object> response =
                        new LinkedHashMap<>();

                response.put("coDonThuoc", false);
                response.put(
                        "message",
                        "Ca khám này chưa có đơn thuốc."
                );

                return ResponseEntity.ok(response);
            }

            DonThuoc donThuoc =
                    optionalDonThuoc.get();

            List<CTDonThuoc> chiTiet =
                    khamBenhService.xemChiTietDonThuoc(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            Map<String, Object> response =
                    chuyenDonThuocThanhMap(
                            donThuoc,
                            chiTiet
                    );

            response.put("coDonThuoc", true);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
// 19. CẬP NHẬT ĐƠN THUỐC
// =========================================================
    @PutMapping("/{maLichKham}/don-thuoc")
    public ResponseEntity<?> capNhatDonThuoc(
            @PathVariable Integer maLichKham,
            @RequestBody DonThuocRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            DonThuoc donThuoc =
                    khamBenhService.capNhatDonThuoc(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            request
                    );

            List<CTDonThuoc> chiTiet =
                    khamBenhService.xemChiTietDonThuoc(
                            bacSi.getMaBacSi(),
                            maLichKham
                    );

            return ResponseEntity.ok(
                    chuyenDonThuocThanhMap(
                            donThuoc,
                            chiTiet
                    )
            );

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
// 20. DANH SÁCH TẤT CẢ ĐƠN THUỐC CỦA BÁC SĨ
// =========================================================
    @GetMapping("/don-thuoc")
    public ResponseEntity<?> danhSachDonThuoc(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            List<DonThuoc> danhSach =
                    khamBenhService
                            .layTatCaDonThuocCuaBacSi(
                                    bacSi.getMaBacSi()
                            );

            List<Map<String, Object>> ketQua =
                    danhSach.stream()
                            .map(this::chuyenDonThuocTongQuatThanhMap)
                            .toList();

            return ResponseEntity.ok(ketQua);

        } catch (Exception e) {
            return loi(e);
        }
    }


    // =========================================================
// =========================================================
// 21. LỊCH SỬ KHÁM CỦA BỆNH NHÂN ĐANG KHÁM - PHÂN TRANG
// =========================================================
    @GetMapping("/{maLichKham}/lich-su-kham")
    public ResponseEntity<?> lichSuKhamBenhNhan(
            @PathVariable Integer maLichKham,

            @RequestParam(defaultValue = "0") int page,

            @RequestParam(defaultValue = "5") int size,

            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            // Lấy lịch sử khám theo trang
            Page<HoSoBenhAn> trangLichSu =
                    khamBenhService.layLichSuKham(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            page,
                            size
                    );

            // Chuyển Entity -> JSON cho danh sách của trang hiện tại
            List<Map<String, Object>> noiDung =
                    trangLichSu
                            .getContent()
                            .stream()
                            .map(this::chuyenLichSuBenhNhanThanhMap)
                            .toList();


            // =====================================================
            // RESPONSE PHÂN TRANG
            // =====================================================
            Map<String, Object> response =
                    new LinkedHashMap<>();

            // Danh sách lịch sử của trang hiện tại
            response.put(
                    "content",
                    noiDung
            );

            // Trang hiện tại.
            // Spring bắt đầu từ 0.
            response.put(
                    "page",
                    trangLichSu.getNumber()
            );

            // Số bản ghi tối đa trên một trang
            response.put(
                    "size",
                    trangLichSu.getSize()
            );

            // Tổng số lần khám cũ
            response.put(
                    "totalElements",
                    trangLichSu.getTotalElements()
            );

            // Tổng số trang
            response.put(
                    "totalPages",
                    trangLichSu.getTotalPages()
            );

            // Có phải trang đầu tiên không
            response.put(
                    "first",
                    trangLichSu.isFirst()
            );

            // Có phải trang cuối cùng không
            response.put(
                    "last",
                    trangLichSu.isLast()
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return loi(e);
        }
    }
    // =========================================================
// 22. XEM CHI TIẾT MỘT LẦN KHÁM TRONG LỊCH SỬ
// =========================================================
    @GetMapping("/{maLichKham}/lich-su-kham/{maHoSoBenhAn}")
    public ResponseEntity<?> xemChiTietLichSuKham(
            @PathVariable Integer maLichKham,
            @PathVariable Integer maHoSoBenhAn,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        try {

            BacSi bacSi =
                    layBacSiDangNhap(userDetails);

            Integer maBacSi = bacSi.getMaBacSi();

            // =====================================================
            // 1. LẤY HỒ SƠ LỊCH SỬ
            // Đồng thời kiểm tra hồ sơ thuộc đúng bệnh nhân hiện tại
            // =====================================================
            HoSoBenhAn hoSo =
                    khamBenhService.xemChiTietLichSuKham(
                            maBacSi,
                            maLichKham,
                            maHoSoBenhAn
                    );

            Map<String, Object> response =
                    chuyenHoSoThanhMap(hoSo);


            // =====================================================
            // 2. LẤY CẬN LÂM SÀNG CỦA LẦN KHÁM CŨ
            // =====================================================
            List<ChiDinhYTe> danhSachChiDinh =
                    khamBenhService.layChiDinhLichSuKham(
                            maBacSi,
                            maLichKham,
                            maHoSoBenhAn
                    );

            List<Map<String, Object>> canLamSang =
                    danhSachChiDinh.stream()
                            .map(chiDinh -> {

                                Map<String, Object> chiDinhMap =
                                        chuyenChiDinhThanhMap(chiDinh);

                                Optional<KetQuaDichVu> optionalKetQua =
                                        khamBenhService.layKetQuaLichSuKham(
                                                maBacSi,
                                                maLichKham,
                                                maHoSoBenhAn,
                                                chiDinh.getMaChiDinh()
                                        );

                                if (optionalKetQua.isPresent()) {

                                    KetQuaDichVu ketQua =
                                            optionalKetQua.get();

                                    List<ChiTietKetQua> chiTietKetQua =
                                            khamBenhService
                                                    .layChiTietKetQuaLichSu(
                                                            ketQua.getMaKetQua()
                                                    );

                                    chiDinhMap.put(
                                            "coKetQua",
                                            true
                                    );

                                    chiDinhMap.put(
                                            "ketQua",
                                            chuyenKetQuaThanhMap(
                                                    ketQua,
                                                    chiTietKetQua
                                            )
                                    );

                                } else {

                                    chiDinhMap.put(
                                            "coKetQua",
                                            false
                                    );

                                    chiDinhMap.put(
                                            "ketQua",
                                            null
                                    );
                                }

                                return chiDinhMap;
                            })
                            .toList();

            response.put(
                    "canLamSang",
                    canLamSang
            );


            // =====================================================
            // 3. LẤY ĐƠN THUỐC CỦA LẦN KHÁM CŨ
            // =====================================================
            Optional<DonThuoc> optionalDonThuoc =
                    khamBenhService.layDonThuocLichSuKham(
                            maBacSi,
                            maLichKham,
                            maHoSoBenhAn
                    );

            if (optionalDonThuoc.isPresent()) {

                DonThuoc donThuoc =
                        optionalDonThuoc.get();

                List<CTDonThuoc> chiTietDonThuoc =
                        khamBenhService
                                .layChiTietDonThuocLichSu(
                                        donThuoc.getMaDonThuoc()
                                );

                response.put(
                        "coDonThuoc",
                        true
                );

                response.put(
                        "donThuoc",
                        chuyenDonThuocThanhMap(
                                donThuoc,
                                chiTietDonThuoc
                        )
                );

            } else {

                response.put(
                        "coDonThuoc",
                        false
                );

                response.put(
                        "donThuoc",
                        null
                );
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return loi(e);
        }
    }
    // =========================================================
// CHUYỂN LỊCH SỬ KHÁM CỦA BỆNH NHÂN THÀNH JSON
// =========================================================
    private Map<String, Object> chuyenLichSuBenhNhanThanhMap(
            HoSoBenhAn hoSo
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "maHoSoBenhAn",
                hoSo.getMaHoSoBenhAn()
        );

        map.put(
                "chanDoan",
                hoSo.getChanDoan()
        );

        map.put(
                "ketLuan",
                hoSo.getKetLuan()
        );

        if (hoSo.getLichDangKyKham() != null) {

            LichDangKyKham lich =
                    hoSo.getLichDangKyKham();

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
            // Khoa của lần khám
            if (lich.getKhoa() != null) {

                map.put(
                        "tenKhoa",
                        lich.getKhoa().getTenKhoa()
                );
            }

// Bác sĩ thực hiện lần khám
            if (lich.getBacSi() != null
                    && lich.getBacSi().getNguoiDung() != null) {

                map.put(
                        "tenBacSi",
                        lich.getBacSi()
                                .getNguoiDung()
                                .getHoTen()
                );
            }

        }

        return map;
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
                    lich.getSoThuTu().getSoThuTu()
            );
        }

        if (lich.getBenhNhan() != null) {

            map.put(
                    "maBenhNhan",
                    lich.getBenhNhan().getMaBenhNhan()
            );

            map.put(
                    "ngaySinh",
                    lich.getBenhNhan().getNgaySinh()
            );

            map.put(
                    "gioiTinh",
                    lich.getBenhNhan().getGioiTinh()
            );

            if (lich.getBenhNhan().getNguoiDung() != null) {

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

        if (hoSo.getLichDangKyKham() != null) {
            map.put(
                    "trangThaiLichKham",
                    hoSo.getLichDangKyKham().getTrangThai()
            );
        }


        if (hoSo.getLichDangKyKham() != null) {

            LichDangKyKham lich =
                    hoSo.getLichDangKyKham();

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
                    "trangThaiLichKham",
                    lich.getTrangThai()
            );
            // Khoa của lần khám
            if (lich.getKhoa() != null) {
                map.put(
                        "tenKhoa",
                        lich.getKhoa().getTenKhoa()
                );
            }

// Bác sĩ thực hiện lần khám
            if (lich.getBacSi() != null
                    && lich.getBacSi().getNguoiDung() != null) {

                map.put(
                        "tenBacSi",
                        lich.getBacSi()
                                .getNguoiDung()
                                .getHoTen()
                );
            }

            if (lich.getBenhNhan() != null) {

                map.put(
                        "maBenhNhan",
                        lich.getBenhNhan().getMaBenhNhan()
                );

                map.put(
                        "ngaySinh",
                        lich.getBenhNhan().getNgaySinh()
                );

                map.put(
                        "gioiTinh",
                        lich.getBenhNhan().getGioiTinh()
                );

                if (lich.getBenhNhan().getNguoiDung() != null) {

                    map.put(
                            "hoTen",
                            lich.getBenhNhan()
                                    .getNguoiDung()
                                    .getHoTen()
                    );
                }
            }
        }
        map.put("canNang", hoSo.getCanNang());
        map.put("chieuCao", hoSo.getChieuCao());
        map.put("huyetApTamThu", hoSo.getHuyetApTamThu());
        map.put("huyetApTamTruong", hoSo.getHuyetApTamTruong());

        return map;
    }


    // =========================================================
    // CHUYỂN DỊCH VỤ THÀNH JSON
    // =========================================================
    private Map<String, Object> chuyenDichVuThanhMap(
            DichVuYTe dichVu
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "maDichVu",
                dichVu.getMaDichVu()
        );

        map.put(
                "tenDichVu",
                dichVu.getTenDichVu()
        );

        map.put(
                "loaiDichVu",
                dichVu.getLoaiDichVu()
        );

        map.put(
                "moTa",
                dichVu.getMoTa()
        );

        map.put(
                "gia",
                dichVu.getGia()
        );

        return map;
    }


    // =========================================================
    // CHUYỂN CHỈ ĐỊNH THÀNH JSON
    // =========================================================
    private Map<String, Object> chuyenChiDinhThanhMap(
            ChiDinhYTe chiDinh
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "maChiDinh",
                chiDinh.getMaChiDinh()
        );
        map.put(
                "maPhieuChiDinh",
                chiDinh.getMaPhieuChiDinh()
        );

        map.put(
                "maPhong",
                chiDinh.getMaPhong()
        );

        map.put(
                "ngayChiDinh",
                chiDinh.getNgayChiDinh()
        );

        map.put(
                "loaiChiDinh",
                chiDinh.getLoaiChiDinh()
        );

        map.put(
                "trangThai",
                chiDinh.getTrangThai()
        );

        if (chiDinh.getDichVuYTe() != null) {

            map.put(
                    "maDichVu",
                    chiDinh.getDichVuYTe().getMaDichVu()
            );

            map.put(
                    "tenDichVu",
                    chiDinh.getDichVuYTe().getTenDichVu()
            );

            map.put(
                    "loaiDichVu",
                    chiDinh.getDichVuYTe().getLoaiDichVu()
            );

            map.put(
                    "gia",
                    chiDinh.getDichVuYTe().getGia()
            );
        }

        return map;
    }


    // =========================================================
    // CHUYỂN CHỈ ĐỊNH TỔNG QUÁT THÀNH JSON
    // DÙNG CHO TRANG QUẢN LÝ CHỈ ĐỊNH CỦA BÁC SĨ
    // =========================================================
    private Map<String, Object> chuyenChiDinhTongQuatThanhMap(
            ChiDinhYTe chiDinh
    ) {

        Map<String, Object> map =
                chuyenChiDinhThanhMap(chiDinh);

        if (chiDinh.getHoSoBenhAn() != null) {


            HoSoBenhAn hoSo =
                    chiDinh.getHoSoBenhAn();

            map.put(
                    "maHoSoBenhAn",
                    hoSo.getMaHoSoBenhAn()
            );

            if (hoSo.getLichDangKyKham() != null) {



                LichDangKyKham lich =
                        hoSo.getLichDangKyKham();
                map.put("lyDoKham", lich.getLyDoKham());

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

                if (lich.getBenhNhan() != null) {

                    map.put(
                            "maBenhNhan",
                            lich.getBenhNhan()
                                    .getMaBenhNhan()
                    );

                    if (lich.getBenhNhan()
                            .getNguoiDung() != null) {

                        map.put(
                                "hoTen",
                                lich.getBenhNhan()
                                        .getNguoiDung()
                                        .getHoTen()
                        );
                    }
                }
            }
        }

        return map;
    }


    // =========================================================
    // CHUYỂN KẾT QUẢ CLS CHI TIẾT THÀNH JSON
    // =========================================================
    private Map<String, Object> chuyenKetQuaThanhMap(
            KetQuaDichVu ketQua,
            List<ChiTietKetQua> danhSachChiTiet
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "maKetQua",
                ketQua.getMaKetQua()
        );

        map.put(
                "ngayCoKetQua",
                ketQua.getNgayCoKetQua()
        );

        map.put(
                "noiDungKetQua",
                ketQua.getNoiDungKetQua()
        );

        map.put(
                "ketLuan",
                ketQua.getKetLuan()
        );

        map.put(
                "fileURL",
                ketQua.getFileURL()
        );

        map.put(
                "trangThai",
                ketQua.getTrangThai()
        );

        List<Map<String, Object>> chiTiet =
                danhSachChiTiet.stream()
                        .map(this::chuyenChiTietKetQuaThanhMap)
                        .toList();

        map.put(
                "chiTiet",
                chiTiet
        );

        return map;
    }


    // =========================================================
    // CHUYỂN CHỈ ĐỊNH THÀNH KẾT QUẢ CLS TỔNG QUÁT
    // DÙNG CHO TRANG KẾT QUẢ CẬN LÂM SÀNG
    // =========================================================
    private Map<String, Object> chuyenChiDinhThanhKetQuaTongQuat(
            ChiDinhYTe chiDinh
    ) {

        /*
         * Lấy thông tin chỉ định, dịch vụ,
         * bệnh nhân và lịch khám.
         */
        Map<String, Object> map =
                chuyenChiDinhTongQuatThanhMap(chiDinh);

        /*
         * Tìm kết quả của chỉ định.
         */
        Optional<KetQuaDichVu> optionalKetQua =
                khamBenhService.timKetQuaTheoChiDinh(
                        chiDinh.getMaChiDinh()
                );

        if (optionalKetQua.isPresent()) {

            // ĐÃ CÓ KẾT QUẢ
            KetQuaDichVu ketQua =
                    optionalKetQua.get();

            map.put(
                    "coKetQua",
                    true
            );

            map.put(
                    "maKetQua",
                    ketQua.getMaKetQua()
            );

            map.put(
                    "ngayCoKetQua",
                    ketQua.getNgayCoKetQua()
            );

            map.put(
                    "trangThaiKetQua",
                    ketQua.getTrangThai()
            );

        } else {

            // CHƯA CÓ KẾT QUẢ
            map.put(
                    "coKetQua",
                    false
            );

            map.put(
                    "maKetQua",
                    null
            );

            map.put(
                    "ngayCoKetQua",
                    null
            );

            map.put(
                    "trangThaiKetQua",
                    null
            );
        }

        return map;
    }


    // =========================================================
    // CHUYỂN CHI TIẾT KẾT QUẢ THÀNH JSON
    // =========================================================
    private Map<String, Object> chuyenChiTietKetQuaThanhMap(
            ChiTietKetQua chiTiet
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "maChiTietKetQua",
                chiTiet.getMaChiTietKetQua()
        );

        map.put(
                "tenChiSo",
                chiTiet.getTenChiSo()
        );

        map.put(
                "giaTri",
                chiTiet.getGiaTri()
        );

        map.put(
                "donVi",
                chiTiet.getDonVi()
        );

        map.put(
                "giaTriThamChieu",
                chiTiet.getGiaTriThamChieu()
        );

        map.put(
                "trangThai",
                chiTiet.getTrangThai()
        );

        return map;
    }

    // =========================================================
// CHUYỂN THUỐC THÀNH JSON
// =========================================================
    private Map<String, Object> chuyenThuocThanhMap(
            Thuoc thuoc
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "maThuoc",
                thuoc.getMaThuoc()
        );

        map.put(
                "tenThuoc",
                thuoc.getTenThuoc()
        );

        map.put(
                "donViTinh",
                thuoc.getDonViTinh()
        );

        map.put(
                "gia",
                thuoc.getGia()
        );

        map.put(
                "trangThai",
                thuoc.getTrangThai()
        );

        return map;
    }


    // =========================================================
// CHUYỂN CHI TIẾT ĐƠN THUỐC THÀNH JSON
// =========================================================
    private Map<String, Object> chuyenChiTietDonThuocThanhMap(
            CTDonThuoc chiTiet
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "maCTDonThuoc",
                chiTiet.getMaCTDonThuoc()
        );

        map.put(
                "soLuong",
                chiTiet.getSoLuong()
        );

        map.put(
                "donGiaBan",
                chiTiet.getDonGiaBan()
        );

        map.put(
                "lieuDung",
                chiTiet.getLieuDung()
        );

        map.put(
                "thoiGianDung",
                chiTiet.getThoiGianDung()
        );

        map.put(
                "huongDanSuDung",
                chiTiet.getHuongDanSuDung()
        );

        if (chiTiet.getThuoc() != null) {

            map.put(
                    "maThuoc",
                    chiTiet.getThuoc().getMaThuoc()
            );

            map.put(
                    "tenThuoc",
                    chiTiet.getThuoc().getTenThuoc()
            );

            map.put(
                    "donViTinh",
                    chiTiet.getThuoc().getDonViTinh()
            );
        }

        return map;
    }


    // =========================================================
// CHUYỂN ĐƠN THUỐC CHI TIẾT THÀNH JSON
// =========================================================
    private Map<String, Object> chuyenDonThuocThanhMap(
            DonThuoc donThuoc,
            List<CTDonThuoc> danhSachChiTiet
    ) {

        Map<String, Object> map =
                chuyenDonThuocTongQuatThanhMap(
                        donThuoc
                );

        List<Map<String, Object>> chiTiet =
                danhSachChiTiet.stream()
                        .map(
                                this::chuyenChiTietDonThuocThanhMap
                        )
                        .toList();

        map.put(
                "danhSachThuoc",
                chiTiet
        );

        return map;
    }


    // =========================================================
// CHUYỂN ĐƠN THUỐC TỔNG QUÁT THÀNH JSON
// =========================================================
    private Map<String, Object> chuyenDonThuocTongQuatThanhMap(
            DonThuoc donThuoc
    ) {

        Map<String, Object> map =
                new LinkedHashMap<>();

        map.put(
                "maDonThuoc",
                donThuoc.getMaDonThuoc()
        );

        map.put(
                "ngayKeThuoc",
                donThuoc.getNgayKeThuoc()
        );

        map.put(
                "chanDoan",
                donThuoc.getChanDoan()
        );

        map.put(
                "ghiChu",
                donThuoc.getGhiChu()
        );

        map.put(
                "trangThai",
                donThuoc.getTrangThai()
        );

        if (donThuoc.getHoSoBenhAn() != null) {

            HoSoBenhAn hoSo =
                    donThuoc.getHoSoBenhAn();

            map.put(
                    "maHoSoBenhAn",
                    hoSo.getMaHoSoBenhAn()
            );

            if (hoSo.getLichDangKyKham() != null) {

                LichDangKyKham lich =
                        hoSo.getLichDangKyKham();

                map.put(
                        "maLichKham",
                        lich.getMaLichKham()
                );

                map.put(
                        "ngayKham",
                        lich.getNgayKham()
                );

                if (lich.getBenhNhan() != null) {

                    map.put(
                            "maBenhNhan",
                            lich.getBenhNhan()
                                    .getMaBenhNhan()
                    );

                    if (lich.getBenhNhan()
                            .getNguoiDung() != null) {

                        map.put(
                                "hoTen",
                                lich.getBenhNhan()
                                        .getNguoiDung()
                                        .getHoTen()
                        );
                    }
                }
            }
        }

        return map;
    }
    // =========================================================
    // HỖ TRỢ LẤY STRING
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


    // =========================================================
    // HỖ TRỢ LẤY INTEGER BẮT BUỘC
    // =========================================================
    private Integer layIntegerBatBuoc(
            Map<String, Object> request,
            String key,
            String message
    ) {

        Object value =
                request.get(key);

        if (value == null
                || value.toString().isBlank()) {

            throw new IllegalArgumentException(message);
        }

        try {

            return Integer.valueOf(
                    value.toString()
            );

        } catch (NumberFormatException e) {

            throw new IllegalArgumentException(
                    "Giá trị " + key + " không hợp lệ."
            );
        }
    }


    // =========================================================
    // HỖ TRỢ LẤY INTEGER KHÔNG BẮT BUỘC
    // =========================================================
    private Integer layIntegerKhongBatBuoc(
            Map<String, Object> request,
            String key
    ) {

        Object value =
                request.get(key);

        if (value == null
                || value.toString().isBlank()) {

            return null;
        }

        try {

            return Integer.valueOf(
                    value.toString()
            );

        } catch (NumberFormatException e) {

            throw new IllegalArgumentException(
                    "Giá trị " + key + " không hợp lệ."
            );
        }
    }


    // =========================================================
    // RESPONSE LỖI DÙNG CHUNG
    // =========================================================
    private ResponseEntity<?> loi(Exception e) {

        String message =
                e.getMessage() == null
                        ? "Đã xảy ra lỗi."
                        : e.getMessage();

        return ResponseEntity
                .badRequest()
                .body(
                        Map.of(
                                "message",
                                message
                        )
                );
    }
}