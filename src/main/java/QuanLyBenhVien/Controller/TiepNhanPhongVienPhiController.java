
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.TiepNhanPhanCongService;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/tiepnhan/hoa-don")
public class TiepNhanPhongVienPhiController {

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanPhanCongService phanCongService;

    public TiepNhanPhongVienPhiController(
            JdbcTemplate jdbcTemplate,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.phanCongService = phanCongService;
    }

    // DTO TRẢ VỀ FRONTEND
    public record PhongVienPhiDTO(
            Integer maLichKham,
            Integer maPhong,
            String tenPhong,
            String viTri,
            boolean xacDinh,
            String thongBao
    ) {}

    private record PhongRow(
            Integer maPhong,
            String tenPhong,
            String viTri
    ) {}

    // =====================================================
    // LẤY PHÒNG KHÁM TỪ LỊCH LÀM VIỆC THỰC TẾ
    //
    // GET /api/tiepnhan/hoa-don/lich-kham/{id}/phong
    // =====================================================

    @GetMapping("/lich-kham/{maLichKham}/phong")
    public ResponseEntity<PhongVienPhiDTO> layPhong(
            @PathVariable Integer maLichKham,
            Authentication authentication
    ) {

        // 1. KIỂM TRA MÃ LỊCH KHÁM
        if (maLichKham == null || maLichKham <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã lịch khám không hợp lệ."
            );
        }

        // 2. KIỂM TRA QUYỀN CỦA NHÂN VIÊN TIẾP NHẬN
        var caTruc =
                phanCongService.kiemTraQuyenVoiLichKham(
                        authentication,
                        maLichKham
                );

        // 3. TRUY VẤN ĐÚNG BẢNG PHÒNG TRONG DATABASE
        String sql = """
                SELECT DISTINCT
                    p.MaPhong,
                    p.TenPhong,
                    p.ViTri

                FROM LichDangKyKham lk

                JOIN LichLamViec lv
                    ON lv.MaBacSi = lk.MaBacSi
                   AND lv.NgayLamViec = lk.NgayKham
                   AND TIME(lk.GioKham) >= lv.GioBatDau
                   AND TIME(lk.GioKham) < lv.GioKetThuc

                JOIN phongchuyentrach p
                    ON p.MaPhong = lv.MaPhong

                WHERE lk.MaLichKham = ?
                  AND lk.MaKhoa = ?
                  AND p.MaKhoa = lk.MaKhoa
                  AND lv.MaPhong IS NOT NULL
                """;

        List<PhongRow> dsPhong = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new PhongRow(
                        rs.getInt("MaPhong"),
                        rs.getString("TenPhong"),
                        rs.getString("ViTri")
                ),
                maLichKham,
                caTruc.maKhoa()
        );

        // 4. KHÔNG CÓ PHÒNG
        if (dsPhong.isEmpty()) {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .body(new PhongVienPhiDTO(
                            maLichKham,
                            null,
                            null,
                            null,
                            false,
                            "Chưa tìm thấy phòng khám phù hợp "
                                    + "với lịch làm việc của bác sĩ."
                    ));
        }

        // 5. NHIỀU PHÒNG TRÙNG CA
        if (dsPhong.size() > 1) {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .body(new PhongVienPhiDTO(
                            maLichKham,
                            null,
                            null,
                            null,
                            false,
                            "Có nhiều phòng khám trùng lịch. "
                                    + "Cần kiểm tra phân công bác sĩ."
                    ));
        }

        // 6. LẤY PHÒNG TỪ DATABASE
        PhongRow phong = dsPhong.get(0);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new PhongVienPhiDTO(
                        maLichKham,
                        phong.maPhong(),
                        phong.tenPhong(),
                        phong.viTri(),
                        true,
                        null
                ));
    }
}
