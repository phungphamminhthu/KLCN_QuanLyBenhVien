package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Repository.HoSoBenhAnRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import QuanLyBenhVien.Service.MedicalRecordDetailService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/medical-records")
public class HoSoBenhAnController {

    private final HoSoBenhAnRepository hoSoBenhAnRepository;
    private final MedicalRecordDetailService medicalRecordDetailService;

    public HoSoBenhAnController(
            HoSoBenhAnRepository hoSoBenhAnRepository,
            MedicalRecordDetailService medicalRecordDetailService) {
        this.hoSoBenhAnRepository = hoSoBenhAnRepository;
        this.medicalRecordDetailService = medicalRecordDetailService;
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
                .<ResponseEntity<?>>map(record -> {
                    Map<String, Object> detail =
                            medicalRecordDetailService.getDetail(
                                    record.getMaHoSoBenhAn()
                            );

                    return ResponseEntity.ok(detail);
                })
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


    /**
     * Lấy hoặc tạo QR token cho hồ sơ bệnh án.
     * Chỉ bệnh nhân sở hữu hồ sơ mới được lấy token.
     */
    @GetMapping("/{id}/qr-token")
    public ResponseEntity<?> getQrToken(
            @PathVariable Integer id,
            Authentication authentication) {

        // Kiểm tra đăng nhập
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        // Kiểm tra hồ sơ có thuộc bệnh nhân đang đăng nhập không
        return hoSoBenhAnRepository
                .findByMaHoSoBenhAnAndLichDangKyKham_BenhNhan_NguoiDung_TenDangNhap(
                        id,
                        authentication.getName())
                .<ResponseEntity<?>>map(record -> {
                    try {
                        String token = medicalRecordDetailService
                                .getOrCreateQrToken(
                                        record.getMaHoSoBenhAn());

                        return ResponseEntity.ok(
                                Map.of("qrToken", token));

                    } catch (NoSuchElementException ex) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(Map.of(
                                        "message",
                                        "Không tìm thấy hồ sơ bệnh án."));
                    }
                })
                .orElseGet(() ->
                        ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(Map.of(
                                        "message",
                                        "Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập."
                                )));
    }

    @GetMapping("/qr/{token}")
    public ResponseEntity<?> getMedicalRecordByQr(
            @PathVariable String token,
            Authentication authentication) {

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập."));
        }

        return hoSoBenhAnRepository.findByQrToken(token)
                .<ResponseEntity<?>>map(record -> {

                    var lichKham = record.getLichDangKyKham();

                    boolean isOwner = lichKham != null
                            && lichKham.getBenhNhan() != null
                            && lichKham.getBenhNhan().getNguoiDung() != null
                            && authentication.getName().equals(
                            lichKham.getBenhNhan()
                                    .getNguoiDung()
                                    .getTenDangNhap()
                    );

                    if (!isOwner) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(Map.of(
                                        "message",
                                        "Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập."
                                ));
                    }

                    return ResponseEntity.ok(
                            medicalRecordDetailService.getDetail(
                                    record.getMaHoSoBenhAn()
                            )
                    );
                })
                .orElseGet(() ->
                        ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(Map.of(
                                        "message",
                                        "Mã QR không hợp lệ hoặc hồ sơ không tồn tại."
                                ))
                );
    }

}