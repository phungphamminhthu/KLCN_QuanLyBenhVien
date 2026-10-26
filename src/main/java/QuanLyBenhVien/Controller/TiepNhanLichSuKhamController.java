package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanLichSuKhamDTO;
import QuanLyBenhVien.Service.TiepNhanLichSuKhamService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.format.annotation.DateTimeFormat;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/lich-su-kham")
public class TiepNhanLichSuKhamController {

    private static final Logger log =
            LoggerFactory.getLogger(
                    TiepNhanLichSuKhamController.class
            );

    private final TiepNhanLichSuKhamService lichSuKhamService;

    public TiepNhanLichSuKhamController(
            TiepNhanLichSuKhamService lichSuKhamService
    ) {
        this.lichSuKhamService = lichSuKhamService;
    }

    // =====================================================
    // DANH SÁCH LỊCH KHÁM
    //
    // Bộ lọc:
    // - tuKhoa
    // - maBacSi
    // - trangThai
    // - tuNgay, denNgay: yyyy-MM-dd
    //
    // Không nhận mã khoa từ trình duyệt.
    // =====================================================

    @GetMapping
    public ResponseEntity<TiepNhanLichSuKhamDTO> getDanhSach(

            @RequestParam(
                    name = "tuKhoa",
                    required = false
            )
            String tuKhoa,

            @RequestParam(
                    name = "maBacSi",
                    required = false
            )
            Integer maBacSi,

            @RequestParam(
                    name = "trangThai",
                    required = false
            )
            String trangThai,

            @RequestParam(
                    name = "tuNgay",
                    required = false
            )
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate tuNgay,

            @RequestParam(
                    name = "denNgay",
                    required = false
            )
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate denNgay,

            @RequestParam(
                    name = "trang",
                    defaultValue = "1"
            )
            int trang,

            @RequestParam(
                    name = "kichThuocTrang",
                    defaultValue = "20"
            )
            int kichThuocTrang,

            Authentication authentication
    ) {
        /*
         * Service kiểm tra tài khoản, ca trực
         * và tự lấy khoa được phân công.
         */
        TiepNhanLichSuKhamDTO ketQua =
                lichSuKhamService.getDanhSachLichSuKham(
                        tuKhoa,
                        maBacSi,
                        trangThai,
                        tuNgay,
                        denNgay,
                        trang,
                        kichThuocTrang,
                        authentication
                );

        return ResponseEntity
                .ok()
                .cacheControl(CacheControl.noStore())
                .body(ketQua);
    }

    // =====================================================
    // LỖI ĐĂNG NHẬP, PHÂN QUYỀN VÀ CA TRỰC
    // =====================================================

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiPhanQuyen(
            ResponseStatusException exception
    ) {
        return phanHoiLoi(
                exception.getStatusCode(),
                exception.getReason()
        );
    }

    // =====================================================
    // BỘ LỌC KHÔNG HỢP LỆ
    // =====================================================

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> xuLyBoLocKhongHopLe(
            IllegalArgumentException exception
    ) {
        return phanHoiLoi(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
    }

    // =====================================================
    // THAM SỐ SAI KIỂU DỮ LIỆU
    // =====================================================

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> xuLySaiDinhDang(
            MethodArgumentTypeMismatchException exception
    ) {
        String thongBao = switch (exception.getName()) {

            case "tuNgay", "denNgay" ->
                    "Ngày lọc phải hợp lệ và có định dạng yyyy-MM-dd.";

            case "maBacSi" ->
                    "Mã bác sĩ phải là số nguyên.";

            case "trang", "kichThuocTrang" ->
                    "Số trang và số dòng mỗi trang phải là số nguyên.";

            default ->
                    "Tham số yêu cầu không đúng định dạng.";
        };

        return phanHoiLoi(
                HttpStatus.BAD_REQUEST,
                thongBao
        );
    }

    // =====================================================
    // LỖI TRUY VẤN DATABASE
    // =====================================================

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> xuLyLoiDatabase(
            DataAccessException exception
    ) {
        log.error(
                "Không thể truy vấn danh sách lịch sử khám.",
                exception
        );

        return phanHoiLoi(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Không thể tải lịch sử khám. Vui lòng thử lại."
        );
    }

    // =====================================================
    // PHẢN HỒI LỖI DẠNG JSON
    // =====================================================

    private ResponseEntity<Map<String, Object>> phanHoiLoi(
            HttpStatusCode trangThai,
            String thongBao
    ) {
        String message =
                thongBao == null || thongBao.isBlank()
                        ? "Không thể xử lý yêu cầu lịch sử khám."
                        : thongBao;

        return ResponseEntity
                .status(trangThai)
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message", message
                ));
    }
}