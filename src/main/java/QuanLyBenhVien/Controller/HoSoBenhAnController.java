package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Repository.HoSoBenhAnRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medical-records")
public class HoSoBenhAnController {

    private final HoSoBenhAnRepository hoSoBenhAnRepository;

    public HoSoBenhAnController(
            HoSoBenhAnRepository hoSoBenhAnRepository) {
        this.hoSoBenhAnRepository = hoSoBenhAnRepository;
    }

    /**
     * Lấy danh sách bệnh án của bệnh nhân đang đăng nhập.
     */
    @GetMapping
    public ResponseEntity<?> getMyMedicalRecords(
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        String tenDangNhap = authentication.getName();

        List<Map<String, Object>> result =
                hoSoBenhAnRepository
                        .findByLichDangKyKham_BenhNhan_NguoiDung_TenDangNhapOrderByLichDangKyKham_NgayKhamDesc(
                                tenDangNhap
                        )
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return ResponseEntity.ok(result);
    }

    /**
     * Xem chi tiết một hồ sơ, đồng thời kiểm tra quyền sở hữu.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getMedicalRecordDetail(
            @PathVariable Integer id,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        return hoSoBenhAnRepository
                .findByMaHoSoBenhAnAndLichDangKyKham_BenhNhan_NguoiDung_TenDangNhap(
                        id,
                        authentication.getName()
                )
                .<ResponseEntity<?>>map(record ->
                        ResponseEntity.ok(toResponse(record))
                )
                .orElseGet(() ->
                        ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(Map.of(
                                        "message",
                                        "Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập."
                                ))
                );
    }

    private Map<String, Object> toResponse(HoSoBenhAn record) {
        var lichKham = record.getLichDangKyKham();

        Map<String, Object> data = new LinkedHashMap<>();

        data.put("maHoSoBenhAn", record.getMaHoSoBenhAn());
        data.put("maLichKham", lichKham.getMaLichKham());

        data.put("ngayKham", lichKham.getNgayKham());
        data.put("gioKham", lichKham.getGioKham());
        data.put("lyDoKham", lichKham.getLyDoKham());

        data.put("tenBacSi",
                lichKham.getBacSi() != null
                        && lichKham.getBacSi().getNguoiDung() != null
                        ? lichKham.getBacSi().getNguoiDung().getHoTen()
                        : null
        );

        data.put("tenKhoa",
                lichKham.getKhoa() != null
                        ? lichKham.getKhoa().getTenKhoa()
                        : null
        );

        data.put("trieuChung", record.getTrieuChung());
        data.put("chanDoan", record.getChanDoan());
        data.put("ketLuan", record.getKetLuan());
        data.put("huongDieuTri", record.getHuongDieuTri());

        data.put("qrToken", record.getQrToken());
        data.put("ngayTaiKham", record.getNgayTaiKham());
        data.put("ghiChuTaiKham", record.getGhiChuTaiKham());
        data.put("trangThai", record.getTrangThai());

        data.put("canNang", record.getCanNang());
        data.put("chieuCao", record.getChieuCao());
        data.put("huyetApTamThu", record.getHuyetApTamThu());
        data.put("huyetApTamTruong", record.getHuyetApTamTruong());

        // Bổ sung tên bác sĩ và khoa sau khi đối chiếu
        // getter thực tế trong BacSi.java và Khoa.java.

        return data;
    }
}