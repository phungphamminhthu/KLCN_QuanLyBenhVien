package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.TiepNhanLichSuKhamDTO;
import QuanLyBenhVien.Service.TiepNhanLichSuKhamService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.dao.DataAccessException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/tiepnhan/lich-su-kham")
public class TiepNhanLichSuKhamController {

    private static final Logger log =
            LoggerFactory.getLogger(TiepNhanLichSuKhamController.class);

    private final TiepNhanLichSuKhamService lichSuKhamService;

    public TiepNhanLichSuKhamController(
            TiepNhanLichSuKhamService lichSuKhamService
    ) {
        this.lichSuKhamService = lichSuKhamService;
    }

    /*
     * Ví dụ:
     * /api/tiepnhan/lich-su-kham?trang=1&kichThuocTrang=20
     *
     * Các bộ lọc không bắt buộc:
     * tuKhoa, maBacSi, maKhoa, tuNgay, denNgay.
     *
     * Ngày nhận theo định dạng yyyy-MM-dd.
     */
    @GetMapping
    public ResponseEntity<TiepNhanLichSuKhamDTO> getDanhSach(
            @RequestParam(
                    name = "tuKhoa",
                    required = false
            ) String tuKhoa,

            @RequestParam(
                    name = "maBacSi",
                    required = false
            ) Integer maBacSi,

            @RequestParam(
                    name = "maKhoa",
                    required = false
            ) Integer maKhoa,

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
            ) int trang,

            @RequestParam(
                    name = "kichThuocTrang",
                    defaultValue = "20"
            ) int kichThuocTrang
    ) {
        TiepNhanLichSuKhamDTO ketQua =
                lichSuKhamService.getDanhSachLichSuKham(
                        tuKhoa,
                        maBacSi,
                        maKhoa,
                        tuNgay,
                        denNgay,
                        trang,
                        kichThuocTrang
                );

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ketQua);
    }

    // Các bộ lọc có giá trị không hợp lệ.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> xuLyBoLocKhongHopLe(
            IllegalArgumentException exception
    ) {
        return phanHoiLoi(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
    }

    // Ví dụ: mã bác sĩ không phải số hoặc ngày sai định dạng.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> xuLySaiDinhDang(
            MethodArgumentTypeMismatchException exception
    ) {
        String thongBao = switch (exception.getName()) {
            case "tuNgay", "denNgay" ->
                    "Ngày lọc phải hợp lệ và có định dạng yyyy-MM-dd.";

            case "maBacSi", "maKhoa" ->
                    "Mã bác sĩ và mã khoa phải là số nguyên.";

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

    // Ghi lỗi truy vấn vào log để kiểm tra tại IntelliJ.
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

    private ResponseEntity<Map<String, Object>> phanHoiLoi(
            HttpStatus trangThai,
            String thongBao
    ) {
        return ResponseEntity.status(trangThai)
                .cacheControl(CacheControl.noStore())
                .body(Map.<String, Object>of(
                        "success", false,
                        "message", thongBao
                ));
    }
}