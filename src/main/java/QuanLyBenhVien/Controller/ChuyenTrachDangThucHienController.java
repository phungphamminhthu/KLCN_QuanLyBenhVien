package QuanLyBenhVien.Controller;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Controller
public class ChuyenTrachDangThucHienController {

    private final JdbcTemplate jdbcTemplate;

    public ChuyenTrachDangThucHienController(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // ==========================================
    // TRANG DANH SÁCH ĐANG THỰC HIỆN
    // ==========================================

    @GetMapping("/ChuyenTrach/dang-thuc-hien")
    public String trangDangThucHien() {
        return "ChuyenTrach/dang-thuc-hien";
    }

    // ==========================================
    // API DANH SÁCH ĐANG THỰC HIỆN HÔM NAY
    // ==========================================

    @ResponseBody
    @GetMapping("/api/chuyen-trach/dang-thuc-hien/hom-nay")
    public List<Map<String, Object>> danhSachHomNay(
            Authentication authentication
    ) {

        // Kiểm tra quyền nhân viên chuyên trách
        if (
                authentication == null ||
                        !authentication.isAuthenticated() ||
                        authentication.getAuthorities()
                                .stream()
                                .noneMatch(a ->
                                        "ROLE_CHUYENTRACH".equals(
                                                a.getAuthority()
                                        )
                                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền xem danh sách đang thực hiện CLS."
            );
        }

        LocalDate today = LocalDate.now(
                ZoneId.of("Asia/Ho_Chi_Minh")
        );

        // ==========================================
        // TRUY VẤN BỆNH NHÂN ĐANG THỰC HIỆN
        // ==========================================

        String sql = """
            SELECT
                l.MaLichKham AS maLichKham,
                l.NgayKham AS ngayKham,

                bn.MaBenhNhan AS maBenhNhan,
                nd.HoTen AS tenBenhNhan,

                bsnd.HoTen AS bacSiPhuTrach,
                l.GioKham AS gioKham,

                MIN(cd.MaChiDinh) AS maChiDinh,

                COUNT(
                    DISTINCT cd.MaChiDinh
                ) AS soChiDinh,

                GROUP_CONCAT(
                    DISTINCT dv.TenDichVu
                    ORDER BY dv.TenDichVu
                    SEPARATOR ', '
                ) AS dichVu,

                GROUP_CONCAT(
                    DISTINCT COALESCE(
                        p.TenPhong,
                        'Chưa phân phòng'
                    )
                    ORDER BY COALESCE(
                        p.TenPhong,
                        'Chưa phân phòng'
                    )
                    SEPARATOR ', '
                ) AS phongThucHien,

                GROUP_CONCAT(
                    DISTINCT CAST(cd.MaPhong AS CHAR)
                    ORDER BY cd.MaPhong
                    SEPARATOR ','
                ) AS danhSachMaPhong,

                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        cd.MaPhong,
                        ':',
                        COALESCE(
                            p.TenPhong,
                            CONCAT('Phòng ', cd.MaPhong)
                        )
                    )
                    ORDER BY cd.MaPhong
                    SEPARATOR '|'
                ) AS danhSachPhong

            FROM LichDangKyKham l

            JOIN BenhNhan bn
                ON bn.MaBenhNhan = l.MaBenhNhan

            JOIN Nguoidung nd
                ON nd.MaNguoiDung = bn.MaNguoiDung

            JOIN BacSi bs
                ON bs.MaBacSi = l.MaBacSi

            JOIN Nguoidung bsnd
                ON bsnd.MaNguoiDung = bs.MaNguoiDung

            JOIN HoSoBenhAn hs
                ON hs.MaLichKham = l.MaLichKham

            JOIN ChiDinhYTe cd
                ON cd.MaHoSoBenhAn = hs.MaHoSoBenhAn

            JOIN DichVuYTe dv
                ON dv.MaDichVu = cd.MaDichVu

            LEFT JOIN PhongChuyenTrach p
                ON p.MaPhong = cd.MaPhong

            WHERE l.NgayKham = ?

              AND l.TrangThai = 'DangCLS'

              AND cd.TrangThai IN (
                  'ChoThucHien',
                  'DangThucHien'
              )

            GROUP BY
                l.MaLichKham,
                l.NgayKham,
                bn.MaBenhNhan,
                nd.HoTen,
                bsnd.HoTen,
                l.GioKham

            ORDER BY
                l.GioKham ASC,
                l.MaLichKham ASC
            """;

        // ==========================================
        // CHUYỂN KẾT QUẢ SQL SANG JSON
        // ==========================================

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {

                    Map<String, Object> row =
                            new LinkedHashMap<>();

                    row.put(
                            "maLichKham",
                            rs.getInt("maLichKham")
                    );

                    Date ngay = rs.getDate("ngayKham");

                    row.put(
                            "ngayKham",
                            ngay == null
                                    ? null
                                    : ngay.toLocalDate().toString()
                    );

                    row.put(
                            "maBenhNhan",
                            rs.getInt("maBenhNhan")
                    );

                    row.put(
                            "tenBenhNhan",
                            rs.getString("tenBenhNhan")
                    );

                    row.put(
                            "bacSiPhuTrach",
                            rs.getString("bacSiPhuTrach")
                    );

                    Time gio = rs.getTime("gioKham");

                    row.put(
                            "gioKham",
                            gio == null
                                    ? null
                                    : gio.toLocalTime().toString()
                    );

                    row.put(
                            "maChiDinh",
                            rs.getInt("maChiDinh")
                    );

                    row.put(
                            "soChiDinh",
                            rs.getInt("soChiDinh")
                    );

                    row.put(
                            "dichVu",
                            rs.getString("dichVu")
                    );

                    row.put(
                            "phongThucHien",
                            rs.getString("phongThucHien")
                    );

                    row.put(
                            "danhSachMaPhong",
                            rs.getString("danhSachMaPhong")
                    );

                    row.put(
                            "danhSachPhong",
                            rs.getString("danhSachPhong")
                    );

                    row.put(
                            "trangThai",
                            "DangCLS"
                    );

                    return row;
                },
                Date.valueOf(today)
        );
    }
}