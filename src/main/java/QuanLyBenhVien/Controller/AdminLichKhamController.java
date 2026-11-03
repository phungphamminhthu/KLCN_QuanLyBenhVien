package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.DieuPhoiLichKhamRequest;
import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Repository.BacSiRepository;
import QuanLyBenhVien.Repository.LichSuDieuPhoiLichKhamRepository;
import QuanLyBenhVien.Repository.PhongChuyenTrachRepository;
import QuanLyBenhVien.Service.AdminLichKhamService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/lich-kham")
public class AdminLichKhamController {

    private final AdminLichKhamService adminLichKhamService;
    private final LichSuDieuPhoiLichKhamRepository lichSuRepository;
    private final BacSiRepository bacSiRepository;
    private final PhongChuyenTrachRepository phongChuyenTrachRepository;


    public AdminLichKhamController(
            AdminLichKhamService adminLichKhamService,
            LichSuDieuPhoiLichKhamRepository lichSuRepository,
            BacSiRepository bacSiRepository,
            PhongChuyenTrachRepository phongChuyenTrachRepository) {

        this.adminLichKhamService = adminLichKhamService;
        this.lichSuRepository = lichSuRepository;
        this.bacSiRepository = bacSiRepository;
        this.phongChuyenTrachRepository = phongChuyenTrachRepository;
    }

    // GET /api/admin/lich-kham/can-dieu-phoi?maBacSi=1&ngayKham=2026-11-03
    @GetMapping("/can-dieu-phoi")
    public ResponseEntity<?> layLichCanDieuPhoi(
            @RequestParam Integer maBacSi,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate ngayKham) {

        try {
            List<Map<String, Object>> result =
                    adminLichKhamService
                            .layLichCanDieuPhoi(maBacSi, ngayKham)
                            .stream()
                            .map(this::toMap)
                            .toList();

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    private Map<String, Object> toMap(LichDangKyKham lich) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("maLichKham", lich.getMaLichKham());
        map.put("ngayKham", lich.getNgayKham());
        map.put("gioKham", lich.getGioKham());
        map.put("lyDoKham", lich.getLyDoKham());
        map.put("trangThai", lich.getTrangThai());

        if (lich.getBacSi() != null) {
            map.put("maBacSi", lich.getBacSi().getMaBacSi());

            if (lich.getBacSi().getNguoiDung() != null) {
                map.put("tenBacSi",
                        lich.getBacSi().getNguoiDung().getHoTen());
            }
        }

        if (lich.getBenhNhan() != null) {
            map.put("maBenhNhan", lich.getBenhNhan().getMaBenhNhan());

            if (lich.getBenhNhan().getNguoiDung() != null) {
                map.put("tenBenhNhan",
                        lich.getBenhNhan().getNguoiDung().getHoTen());
            }
        }

        if (lich.getSoThuTu() != null) {
            map.put("soThuTu", lich.getSoThuTu().getSoThuTu());
        }

        return map;
    }

    @PostMapping("/dieu-phoi")
    public ResponseEntity<?> dieuPhoi(
            @RequestBody DieuPhoiLichKhamRequest request,
            Authentication authentication) {

        try {
            String tenAdmin = authentication != null
                    ? authentication.getName()
                    : "ADMIN";

            int soLuong = adminLichKhamService.dieuPhoiLichKham(
                    request.getDanhSachMaLichKham(),
                    request.getMaBacSiMoi(),
                    request.getLyDo(),
                    null, // maAdmin: tạm thời chưa tra cứu mã Admin
                    tenAdmin
            );

            return ResponseEntity.ok(Map.of(
                    "message", "Điều phối lịch khám thành công.",
                    "soLuongDaDieuPhoi", soLuong
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{maLichKham}/lich-su-dieu-phoi")
    public ResponseEntity<?> xemLichSuDieuPhoi(
            @PathVariable Integer maLichKham) {

        List<Map<String, Object>> result =
                lichSuRepository
                        .findByMaLichKhamOrderByNgayDieuPhoiDesc(maLichKham)
                        .stream()
                        .map(ls -> {
                            Map<String, Object> item = new LinkedHashMap<>();
                            item.put("maLichSuDieuPhoi",
                                    ls.getMaLichSuDieuPhoi());
                            item.put("maLichKham", ls.getMaLichKham());
                            item.put("maBacSiCu", ls.getMaBacSiCu());
                            item.put("maBacSiMoi", ls.getMaBacSiMoi());
                            item.put("tenAdminThucHien",
                                    ls.getTenAdminThucHien());
                            item.put("lyDo", ls.getLyDo());
                            item.put("ngayDieuPhoi", ls.getNgayDieuPhoi());
                            return item;
                        })
                        .toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/phong-chuyen-trach")
    public ResponseEntity<?> layPhongTheoBacSi(
            @RequestParam Integer maBacSi) {

        BacSi bacSi = bacSiRepository.findById(maBacSi)
                .orElseThrow(() ->
                        new RuntimeException("Không tìm thấy bác sĩ"));

        if (bacSi.getKhoa() == null) {
            return ResponseEntity.ok(List.of());
        }

        Integer maKhoa = bacSi.getKhoa().getMaKhoa();

        List<Map<String, Object>> result =
                phongChuyenTrachRepository
                        .findByKhoa_MaKhoaAndTrangThaiTrueOrderByTenPhongAsc(maKhoa)
                        .stream()
                        .map(phong -> {
                            Map<String, Object> item = new HashMap<>();
                            item.put("maPhong", phong.getMaPhong());
                            item.put("tenPhong", phong.getTenPhong());
                            return item;
                        })
                        .toList();

        return ResponseEntity.ok(result);
    }
}