
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.ChiDinhYTe;

import QuanLyBenhVien.Security.CustomUserDetails;

import QuanLyBenhVien.Service.BacSiService;
import QuanLyBenhVien.Service.BacSiTaoNhieuChiDinhService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/kham-benh")
public class BacSiChiDinhNhieuController {

    private final BacSiService bacSiService;

    private final BacSiTaoNhieuChiDinhService
            taoNhieuChiDinhService;

    // ============================================
    // CONSTRUCTOR
    // ============================================

    public BacSiChiDinhNhieuController(
            BacSiService bacSiService,
            BacSiTaoNhieuChiDinhService taoNhieuChiDinhService
    ) {
        this.bacSiService = bacSiService;
        this.taoNhieuChiDinhService = taoNhieuChiDinhService;
    }

    // ============================================
    // DTO NHẬN DANH SÁCH MÃ DỊCH VỤ
    // ============================================

    public record TaoNhieuRequest(
            List<Integer> maDichVu
    ) {
    }

    // ============================================
    // API TẠO NHIỀU CHỈ ĐỊNH
    // ============================================

    @PostMapping("/{maLichKham}/chi-dinh-nhieu")
    public ResponseEntity<?> taoChiDinhNhieu(

            @PathVariable Integer maLichKham,

            @RequestBody TaoNhieuRequest request,

            @AuthenticationPrincipal
            CustomUserDetails userDetails
    ) {

        // 1. Kiểm tra đăng nhập
        if (userDetails == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "Vui lòng đăng nhập."
                    ));
        }

        // 2. Kiểm tra mã lịch khám
        if (maLichKham == null || maLichKham <= 0) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "Mã lịch khám không hợp lệ."
                    ));
        }

        // 3. Lấy danh sách dịch vụ
        List<Integer> danhSach =
                request == null
                        ? null
                        : request.maDichVu();

        if (danhSach == null || danhSach.isEmpty()) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "Vui lòng chọn ít nhất một dịch vụ."
                    ));
        }

        // Giới hạn số lượng dịch vụ mỗi lần
        if (danhSach.size() > 50) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "Chỉ được chọn tối đa 50 dịch vụ."
                    ));
        }

        // Kiểm tra mã dịch vụ
        for (Integer maDichVu : danhSach) {

            if (maDichVu == null || maDichVu <= 0) {

                return ResponseEntity
                        .badRequest()
                        .body(Map.of(
                                "message",
                                "Danh sách có mã dịch vụ không hợp lệ."
                        ));
            }
        }

        // Không cho trùng mã dịch vụ trong cùng request
        if (danhSach.stream().distinct().count()
                != danhSach.size()) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "Danh sách có dịch vụ bị trùng."
                    ));
        }

        // 4. Lấy thông tin bác sĩ đang đăng nhập
        BacSi bacSi;

        try {

            Integer maNguoiDung =
                    userDetails.getNguoiDung()
                            .getMaNguoiDung();

            bacSi = bacSiService
                    .timBacSiTheoMaNguoiDung(maNguoiDung)
                    .orElse(null);

            if (bacSi == null) {

                return ResponseEntity
                        .status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "message",
                                "Tài khoản không phải bác sĩ."
                        ));
            }

        } catch (Exception e) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "Không xác định được bác sĩ đang đăng nhập."
                    ));
        }

        // 5. Tạo nhiều chỉ định
        try {

            List<ChiDinhYTe> ketQua =
                    taoNhieuChiDinhService.taoNhieu(
                            bacSi.getMaBacSi(),
                            maLichKham,
                            danhSach
                    );

            // 6. Chuyển kết quả thành JSON
            // Chỉ lấy các thuộc tính đơn giản,
            // tránh truy cập quan hệ LAZY ngoài transaction.
            List<Map<String, Object>> chiTiet =
                    new ArrayList<>();

            for (int i = 0; i < ketQua.size(); i++) {

                ChiDinhYTe chiDinh = ketQua.get(i);

                Map<String, Object> item =
                        new LinkedHashMap<>();

                item.put(
                        "maChiDinh",
                        chiDinh.getMaChiDinh()
                );

                item.put(
                        "maDichVu",
                        danhSach.get(i)
                );

                item.put(
                        "trangThai",
                        chiDinh.getTrangThai()
                );

                chiTiet.add(item);
            }

            Map<String, Object> response =
                    new LinkedHashMap<>();

            response.put(
                    "message",
                    "Tạo phiếu chỉ định thành công."
            );

            response.put(
                    "maLichKham",
                    maLichKham
            );

            response.put(
                    "soChiDinh",
                    ketQua.size()
            );

            response.put(
                    "danhSach",
                    chiTiet
            );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (
                IllegalArgumentException |
                IllegalStateException e
        ) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            e.getMessage() != null
                                    ? e.getMessage()
                                    : "Không thể tạo chỉ định."
                    ));
        }
    }
}
