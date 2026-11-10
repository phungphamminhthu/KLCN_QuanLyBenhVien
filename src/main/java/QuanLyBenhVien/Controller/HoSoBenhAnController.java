
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Repository.HoSoBenhAnRepository;
import QuanLyBenhVien.Security.BenhNhanAccessService;
import QuanLyBenhVien.Service.MedicalRecordDetailService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

@RestController
@RequestMapping("/api/medical-records")
public class HoSoBenhAnController {

    private final HoSoBenhAnRepository hoSoBenhAnRepository;
    private final MedicalRecordDetailService medicalRecordDetailService;
    private final BenhNhanAccessService benhNhanAccessService;

    public HoSoBenhAnController(
            HoSoBenhAnRepository hoSoBenhAnRepository,
            MedicalRecordDetailService medicalRecordDetailService,
            BenhNhanAccessService benhNhanAccessService) {

        this.hoSoBenhAnRepository = hoSoBenhAnRepository;
        this.medicalRecordDetailService = medicalRecordDetailService;
        this.benhNhanAccessService = benhNhanAccessService;
    }

    // =========================================================
    // 1. LẤY DANH SÁCH BỆNH ÁN THEO HỒ SƠ BỆNH NHÂN ĐANG CHỌN
    // GET /api/medical-records?maBenhNhan=1
    // =========================================================

    @GetMapping
    public ResponseEntity<?> getMyMedicalRecords(
            @RequestParam Integer maBenhNhan) {

        try {
            // Xác minh hồ sơ thuộc tài khoản đang đăng nhập
            BenhNhan benhNhan =
                    benhNhanAccessService.kiemTraQuyenSoHuu(maBenhNhan);

            // Chỉ lấy bệnh án của hồ sơ đang được chọn
            List<Map<String, Object>> result =
                    hoSoBenhAnRepository
                            .findByLichDangKyKham_BenhNhan_MaBenhNhanOrderByLichDangKyKham_NgayKhamDesc(
                                    benhNhan.getMaBenhNhan()
                            )
                            .stream()
                            .map(this::toResponse)
                            .toList();

            return ResponseEntity.ok(result);

        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    // =========================================================
    // 2. XEM CHI TIẾT BỆNH ÁN
    // GET /api/medical-records/{id}
    //
    // Có thể truyền thêm:
    // ?maBenhNhan=1
    //
    // Nếu không truyền maBenhNhan, backend vẫn xác minh
    // quyền sở hữu dựa trên bệnh nhân gắn với bệnh án.
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getMedicalRecordDetail(
            @PathVariable Integer id,
            @RequestParam(required = false) Integer maBenhNhan) {

        Optional<HoSoBenhAn> optionalRecord =
                hoSoBenhAnRepository.findById(id);

        if (optionalRecord.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Không tìm thấy hồ sơ bệnh án."
                    ));
        }

        HoSoBenhAn record = optionalRecord.get();

        try {
            Integer maBenhNhanThucTe =
                    record.getLichDangKyKham()
                            .getBenhNhan()
                            .getMaBenhNhan();

            // Nếu Flutter truyền mã hồ sơ đang chọn,
            // phải khớp với hồ sơ thực tế của bệnh án.
            if (maBenhNhan != null
                    && !maBenhNhan.equals(maBenhNhanThucTe)) {

                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of(
                                "message",
                                "Bệnh án không thuộc hồ sơ bệnh nhân đang chọn."
                        ));
            }

            // Kiểm tra quyền sở hữu bằng tài khoản JWT
            benhNhanAccessService.kiemTraQuyenSoHuu(
                    maBenhNhanThucTe
            );

            Map<String, Object> detail =
                    medicalRecordDetailService.getDetail(
                            record.getMaHoSoBenhAn()
                    );

            return ResponseEntity.ok(detail);

        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập."
                    ));
        }
    }

    // =========================================================
    // 3. CHUYỂN ENTITY THÀNH RESPONSE
    // Giữ nguyên cấu trúc dữ liệu Flutter đang sử dụng
    // =========================================================

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

        return data;
    }

    // =========================================================
    // 4. LẤY HOẶC TẠO QR TOKEN
    // GET /api/medical-records/{id}/qr-token
    // =========================================================

    @GetMapping("/{id}/qr-token")
    public ResponseEntity<?> getQrToken(
            @PathVariable Integer id) {

        Optional<HoSoBenhAn> optionalRecord =
                hoSoBenhAnRepository.findById(id);

        if (optionalRecord.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Không tìm thấy hồ sơ bệnh án."
                    ));
        }

        HoSoBenhAn record = optionalRecord.get();

        try {
            Integer maBenhNhan =
                    record.getLichDangKyKham()
                            .getBenhNhan()
                            .getMaBenhNhan();

            // Chỉ tài khoản sở hữu hồ sơ mới được lấy QR
            benhNhanAccessService.kiemTraQuyenSoHuu(
                    maBenhNhan
            );

            String token =
                    medicalRecordDetailService.getOrCreateQrToken(
                            record.getMaHoSoBenhAn()
                    );

            return ResponseEntity.ok(
                    Map.of("qrToken", token)
            );

        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập."
                    ));

        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Không tìm thấy hồ sơ bệnh án."
                    ));
        }
    }

    // =========================================================
    // 5. TRA CỨU BỆNH ÁN BẰNG QR TOKEN
    // GET /api/medical-records/qr/{token}
    // =========================================================

    @GetMapping("/qr/{token}")
    public ResponseEntity<?> getMedicalRecordByQr(
            @PathVariable String token) {

        Optional<HoSoBenhAn> optionalRecord =
                hoSoBenhAnRepository.findByQrToken(token);

        if (optionalRecord.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Mã QR không hợp lệ hoặc hồ sơ không tồn tại."
                    ));
        }

        HoSoBenhAn record = optionalRecord.get();

        try {
            Integer maBenhNhan =
                    record.getLichDangKyKham()
                            .getBenhNhan()
                            .getMaBenhNhan();

            // Kiểm tra tài khoản hiện tại có sở hữu hồ sơ
            benhNhanAccessService.kiemTraQuyenSoHuu(
                    maBenhNhan
            );

            return ResponseEntity.ok(
                    medicalRecordDetailService.getDetail(
                            record.getMaHoSoBenhAn()
                    )
            );

        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "message",
                            "Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập."
                    ));
        }
    }
}
