package QuanLyBenhVien.Controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/benh-nhan")
public class BacSiLichSuBenhNhanController {

    private final JdbcTemplate jdbcTemplate;

    public BacSiLichSuBenhNhanController(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/{maBenhNhan}/lich-su-kham")
    @PreAuthorize("hasRole('BACSI')")
    public List<Map<String, Object>> layLichSu(
            @PathVariable Integer maBenhNhan
    ) {
        String sql = """
            SELECT
                lk.MaLichKham AS maLichKham,
                lk.NgayKham AS ngayKham,
                lk.GioKham AS gioKham,
                lk.TrangThai AS trangThai,
                nd.HoTen AS tenBacSi,
                k.TenKhoa AS tenKhoa
            FROM lichdangkykham lk
            JOIN bacsi bs
                ON bs.MaBacSi = lk.MaBacSi
            JOIN nguoidung nd
                ON nd.MaNguoiDung = bs.MaNguoiDung
            JOIN khoa k
                ON k.MaKhoa = lk.MaKhoa
            WHERE lk.MaBenhNhan = ?
              AND lk.TrangThai IN ('DaKham', 'HoanTat')
            ORDER BY lk.NgayKham DESC, lk.GioKham DESC
            """;

        return jdbcTemplate.queryForList(sql, maBenhNhan);
    }
}