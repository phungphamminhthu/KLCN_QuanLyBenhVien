
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.ChiDinhYTe;
import QuanLyBenhVien.Security.CustomUserDetails;
import QuanLyBenhVien.Service.BacSiService;
import QuanLyBenhVien.Service.KhamBenhService;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/kham-benh")
public class BacSiDanhMucPhieuXetNghiemController {

    private final JdbcTemplate jdbcTemplate;
    private final BacSiService bacSiService;
    private final KhamBenhService khamBenhService;

    // ==============================================
    // 1. CONSTRUCTOR
    // ==============================================

    public BacSiDanhMucPhieuXetNghiemController(
            JdbcTemplate jdbcTemplate,
            BacSiService bacSiService,
            KhamBenhService khamBenhService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.bacSiService = bacSiService;
        this.khamBenhService = khamBenhService;
    }


    // ==============================================
    // 2. KIỂM TRA BÁC SĨ ĐĂNG NHẬP
    // ==============================================

    private BacSi layBacSiDangNhap(
            CustomUserDetails userDetails
    ) {

        if (userDetails == null) {
            throw new IllegalStateException(
                    "Vui lòng đăng nhập."
            );
        }

        Integer maNguoiDung =
                userDetails.getNguoiDung().getMaNguoiDung();

        return bacSiService
                .timBacSiTheoMaNguoiDung(maNguoiDung)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Tài khoản hiện tại không phải bác sĩ."
                        )
                );
    }


    // ==============================================
    // 3. API LẤY DANH MỤC XÉT NGHIỆM
    // ==============================================

    @GetMapping("/dich-vu/phieu-xet-nghiem")
    public ResponseEntity<?> layDanhMucXetNghiem(
            @AuthenticationPrincipal
            CustomUserDetails userDetails
    ) {

        // Chưa đăng nhập
        if (userDetails == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Vui lòng đăng nhập."
                    ));
        }

        // Kiểm tra tài khoản bác sĩ
        BacSi bacSi;

        try {
            bacSi = layBacSiDangNhap(userDetails);
        } catch (IllegalStateException e) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            e.getMessage()
                    ));
        }

        // Lấy danh mục đúng 3 cột theo thứ tự
        String sql = """
                SELECT
                    MaMuc AS maMuc,
                    MaDichVu AS maDichVu,
                    TenHienThi AS tenDichVu,
                    Nhom AS nhom,
                    Cot AS cot,
                    ThuTu AS thuTu
                FROM PhieuXetNghiemDanhMuc
                ORDER BY
                    Cot ASC,
                    MaMuc ASC
                """;

        List<Map<String, Object>> danhSach =
                jdbcTemplate.queryForList(sql);

        return ResponseEntity.ok(danhSach);
    }


    // ==============================================
    // 4. DTO NHẬN DỮ LIỆU TỪ JAVASCRIPT
    // ==============================================

    public record TaoPhieuXetNghiemRequest(
            List<Integer> maDichVu,
            String ghiChuKhac
    ) {}


    // ==============================================
    // 5. API TẠO PHIẾU CHỈ ĐỊNH XÉT NGHIỆM
    // ==============================================

    @Transactional
    @PostMapping(
            "/{maLichKham}/chi-dinh-phieu-xet-nghiem"
    )
    public ResponseEntity<?> taoPhieuXetNghiem(
            @PathVariable Integer maLichKham,

            @RequestBody(required = false)
            TaoPhieuXetNghiemRequest request,

            @AuthenticationPrincipal
            CustomUserDetails userDetails
    ) {

        // --------------------------------------
        // BƯỚC 1: KIỂM TRA ĐĂNG NHẬP
        // --------------------------------------

        if (userDetails == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Vui lòng đăng nhập."
                    ));
        }

        BacSi bacSi = layBacSiDangNhap(userDetails);


        // --------------------------------------
        // BƯỚC 2: KIỂM TRA MÃ LỊCH KHÁM
        // --------------------------------------

        if (
                maLichKham == null ||
                        maLichKham <= 0
        ) {
            throw new IllegalArgumentException(
                    "Mã lịch khám không hợp lệ."
            );
        }


        // --------------------------------------
        // BƯỚC 3: KIỂM TRA DANH SÁCH ĐÃ CHỌN
        // --------------------------------------

        if (
                request == null ||
                        request.maDichVu() == null ||
                        request.maDichVu().isEmpty()
        ) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn ít nhất một xét nghiệm."
            );
        }

        if (request.maDichVu().size() > 100) {
            throw new IllegalArgumentException(
                    "Danh sách xét nghiệm quá lớn."
            );
        }

        // Loại bỏ mã dịch vụ trùng nhau
        // Ví dụ Calci TP xuất hiện trong 2 nhóm

        LinkedHashSet<Integer> danhSachMaDichVu =
                new LinkedHashSet<>();

        for (Integer ma : request.maDichVu()) {

            if (ma == null || ma <= 0) {
                throw new IllegalArgumentException(
                        "Có mã dịch vụ không hợp lệ."
                );
            }

            danhSachMaDichVu.add(ma);
        }



        // --------------------------------------
        // BƯỚC 4: KIỂM TRA GHI CHÚ
        // --------------------------------------

        String ghiChu =
                request.ghiChuKhac() == null
                        ? ""
                        : request.ghiChuKhac().trim();

        if (ghiChu.length() > 1500) {
            throw new IllegalArgumentException(
                    "Ghi chú không được vượt quá 1500 ký tự."
            );
        }


        // --------------------------------------
        // BƯỚC 5: KIỂM TRA CÁC MÃ DỊCH VỤ
        // CÓ THUỘC DANH MỤC MỚI KHÔNG
        // --------------------------------------

        for (Integer maDichVu : danhSachMaDichVu) {

            String sql = """
                    SELECT COUNT(*)
                    FROM PhieuXetNghiemDanhMuc
                    WHERE MaDichVu = ?
                    """;

            Long soLuong = jdbcTemplate.queryForObject(
                    sql,
                    Long.class,
                    maDichVu
            );

            if (
                    soLuong == null ||
                            soLuong == 0
            ) {
                throw new IllegalArgumentException(
                        "Dịch vụ mã " + maDichVu +
                                " không thuộc danh mục xét nghiệm."
                );
            }
        }


        // --------------------------------------
        // BƯỚC 6: TẠO CHỈ ĐỊNH
        // --------------------------------------

        // Tạo một mã phiếu chung cho lần bấm tạo phiếu này
        String maPhieuChiDinh = UUID.randomUUID().toString();

        List<Integer> danhSachMaChiDinh = new ArrayList<>();

        Integer maHoSoBenhAn = null;

        for (Integer maDichVu : danhSachMaDichVu) {

            ChiDinhYTe chiDinh =
                    khamBenhService.taoChiDinh(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            maDichVu,
                            null
                    );

            // Lưu mã phiếu xuống database

            int soDongCapNhat = jdbcTemplate.update(
                    """
                    UPDATE ChiDinhYTe
                    SET MaPhieuChiDinh = ?
                    WHERE MaChiDinh = ?
                      AND MaHoSoBenhAn = ?
                    """,
                    maPhieuChiDinh,
                    chiDinh.getMaChiDinh(),
                    chiDinh.getHoSoBenhAn().getMaHoSoBenhAn()
            );

            if (soDongCapNhat != 1) {
                throw new IllegalStateException(
                        "Không thể gắn mã phiếu cho chỉ định "
                                + chiDinh.getMaChiDinh()
                );
            }


            danhSachMaChiDinh.add(
                    chiDinh.getMaChiDinh()
            );

            maHoSoBenhAn =
                    chiDinh.getHoSoBenhAn()
                            .getMaHoSoBenhAn();
        }

        // --------------------------------------
        // BƯỚC 7: LƯU XÉT NGHIỆM KHÁC THEO YÊU CẦU
        // --------------------------------------

        if (!ghiChu.isBlank()) {

            String sql = """
                    INSERT INTO PhieuXetNghiemGhiChu
                        (MaHoSoBenhAn, NoiDung)
                    VALUES (?, ?)
                    """;

            jdbcTemplate.update(
                    sql,
                    maHoSoBenhAn,
                    ghiChu
            );
        }


        // --------------------------------------
        // BƯỚC 8: TRẢ KẾT QUẢ
        // --------------------------------------

        Map<String, Object> ketQua =
                new LinkedHashMap<>();

        ketQua.put(
                "message",
                "Tạo phiếu chỉ định xét nghiệm thành công."
        );

        ketQua.put(
                "maLichKham",
                maLichKham
        );
        ketQua.put("maPhieuChiDinh", maPhieuChiDinh);

        ketQua.put(
                "soChiDinh",
                danhSachMaChiDinh.size()
        );

        ketQua.put(
                "maChiDinh",
                danhSachMaChiDinh
        );

        ketQua.put(
                "coGhiChuKhac",
                !ghiChu.isBlank()
        );

        return ResponseEntity.ok(ketQua);
    }


    // ==============================================
    // 6. XỬ LÝ LỖI NGHIỆP VỤ
    // ==============================================

    @ExceptionHandler({
            IllegalArgumentException.class,
            IllegalStateException.class
    })
    public ResponseEntity<?> xuLyLoi(
            RuntimeException e
    ) {

        String thongBao = e.getMessage() == null
                ? "Không thể tạo phiếu chỉ định."
                : e.getMessage();

        return ResponseEntity
                .badRequest()
                .body(Map.of(
                        "message",
                        thongBao
                ));
    }

    // ==============================================
// API TẠO CHỈ ĐỊNH HỖN HỢP NHIỀU TAB
// ==============================================

    @Transactional
    @PostMapping("/{maLichKham}/chi-dinh-hon-hop")
    public ResponseEntity<?> taoChiDinhHonHop(
            @PathVariable Integer maLichKham,
            @RequestBody(required = false)
            TaoPhieuXetNghiemRequest request,
            @AuthenticationPrincipal
            CustomUserDetails userDetails
    ) {
        // 1. Kiểm tra bác sĩ đăng nhập
        BacSi bacSi = layBacSiDangNhap(userDetails);

        // 2. Kiểm tra lịch khám
        if (maLichKham == null || maLichKham <= 0) {
            throw new IllegalArgumentException(
                    "Mã lịch khám không hợp lệ."
            );
        }

        // 3. Kiểm tra danh sách dịch vụ
        if (request == null
                || request.maDichVu() == null
                || request.maDichVu().isEmpty()) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn ít nhất một dịch vụ."
            );
        }

        if (request.maDichVu().size() > 50) {
            throw new IllegalArgumentException(
                    "Chỉ được chọn tối đa 50 dịch vụ."
            );
        }

        LinkedHashSet<Integer> danhSachMaDichVu =
                new LinkedHashSet<>();

        for (Integer ma : request.maDichVu()) {
            if (ma == null || ma <= 0) {
                throw new IllegalArgumentException(
                        "Có mã dịch vụ không hợp lệ."
                );
            }

            if (!danhSachMaDichVu.add(ma)) {
                throw new IllegalArgumentException(
                        "Danh sách có dịch vụ bị trùng."
                );
            }
        }

        // 4. Kiểm tra ghi chú
        String ghiChu = request.ghiChuKhac() == null
                ? ""
                : request.ghiChuKhac().trim();

        if (ghiChu.length() > 1500) {
            throw new IllegalArgumentException(
                    "Ghi chú không được vượt quá 1500 ký tự."
            );
        }

        // 5. Phân loại dịch vụ xét nghiệm và dịch vụ khác
        List<Integer> danhSachXetNghiem = new ArrayList<>();
        List<Integer> danhSachDichVuKhac = new ArrayList<>();

        for (Integer maDichVu : danhSachMaDichVu) {
            Long soLuong = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM PhieuXetNghiemDanhMuc
                    WHERE MaDichVu = ?
                    """,
                    Long.class,
                    maDichVu
            );

            if (soLuong != null && soLuong > 0) {
                danhSachXetNghiem.add(maDichVu);
            } else {
                danhSachDichVuKhac.add(maDichVu);
            }
        }

        if (!ghiChu.isBlank() && danhSachXetNghiem.isEmpty()) {
            throw new IllegalArgumentException(
                    "Ghi chú bổ sung chỉ áp dụng cho phiếu xét nghiệm."
            );
        }

        // 6. Tạo mã phiếu chung cho nhóm xét nghiệm
        String maPhieuChiDinh = danhSachXetNghiem.isEmpty()
                ? null
                : UUID.randomUUID().toString();

        List<Integer> danhSachMaChiDinh = new ArrayList<>();
        List<Integer> danhSachMaChiDinhXetNghiem =
                new ArrayList<>();
        Integer maHoSoBenhAn = null;

        // 7. Tạo từng chỉ định xét nghiệm
        for (Integer maDichVu : danhSachXetNghiem) {
            ChiDinhYTe chiDinh = khamBenhService.taoChiDinh(
                    bacSi.getMaBacSi(),
                    maLichKham,
                    maDichVu,
                    null
            );

            int soDong = jdbcTemplate.update(
                    """
                    UPDATE ChiDinhYTe
                    SET MaPhieuChiDinh = ?
                    WHERE MaChiDinh = ?
                      AND MaHoSoBenhAn = ?
                    """,
                    maPhieuChiDinh,
                    chiDinh.getMaChiDinh(),
                    chiDinh.getHoSoBenhAn().getMaHoSoBenhAn()
            );

            if (soDong != 1) {
                throw new IllegalStateException(
                        "Không thể gắn mã phiếu cho chỉ định "
                                + chiDinh.getMaChiDinh()
                );
            }

            danhSachMaChiDinh.add(chiDinh.getMaChiDinh());
            danhSachMaChiDinhXetNghiem.add(
                    chiDinh.getMaChiDinh()
            );

            maHoSoBenhAn =
                    chiDinh.getHoSoBenhAn().getMaHoSoBenhAn();
        }

        // 8. Tạo từng chỉ định thuộc các tab khác
        for (Integer maDichVu : danhSachDichVuKhac) {
            ChiDinhYTe chiDinh = khamBenhService.taoChiDinh(
                    bacSi.getMaBacSi(),
                    maLichKham,
                    maDichVu,
                    null
            );

            danhSachMaChiDinh.add(chiDinh.getMaChiDinh());

            if (maHoSoBenhAn == null) {
                maHoSoBenhAn =
                        chiDinh.getHoSoBenhAn().getMaHoSoBenhAn();
            }
        }

        // 9. Lưu ghi chú bổ sung nếu có nhóm xét nghiệm
        if (!ghiChu.isBlank()) {
            jdbcTemplate.update(
                    """
                    INSERT INTO PhieuXetNghiemGhiChu
                        (MaHoSoBenhAn, NoiDung)
                    VALUES (?, ?)
                    """,
                    maHoSoBenhAn,
                    ghiChu
            );
        }

        // 10. Trả kết quả
        Map<String, Object> ketQua = new LinkedHashMap<>();

        ketQua.put(
                "message",
                "Tạo các chỉ định cận lâm sàng thành công."
        );
        ketQua.put("maLichKham", maLichKham);
        ketQua.put("maPhieuChiDinh", maPhieuChiDinh);
        ketQua.put("soChiDinh", danhSachMaChiDinh.size());
        ketQua.put("maChiDinh", danhSachMaChiDinh);
        ketQua.put(
                "maChiDinhXetNghiem",
                danhSachMaChiDinhXetNghiem
        );
        ketQua.put(
                "soChiDinhXetNghiem",
                danhSachMaChiDinhXetNghiem.size()
        );
        ketQua.put(
                "soChiDinhDichVuKhac",
                danhSachDichVuKhac.size()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ketQua);
    }

}
