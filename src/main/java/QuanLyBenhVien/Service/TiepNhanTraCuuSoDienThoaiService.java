package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanTraCuuSoDienThoaiDTO;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.util.List;

@Service
public class TiepNhanTraCuuSoDienThoaiService {

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanPhanCongService phanCongService;

    public TiepNhanTraCuuSoDienThoaiService(
            JdbcTemplate jdbcTemplate,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.phanCongService = phanCongService;
    }

    @Transactional(readOnly = true)
    public List<TiepNhanTraCuuSoDienThoaiDTO> traCuu(
            String soDienThoai,
            Authentication authentication
    ) {
        // Chỉ nhân viên tiếp nhận có ca trực hợp lệ được tra cứu.
        phanCongService.layCaTrucHienTai(authentication);

        String soCanTim = chuanHoaSoDienThoai(soDienThoai);

        String sql = """
                SELECT ds.MaBenhNhan,
                       ds.HoTen,
                       ds.NgaySinh,
                       ds.GioiTinh,
                       ds.SoDienThoai
                FROM (
                    SELECT bn.MaBenhNhan,
                           nd.HoTen,
                           bn.NgaySinh,
                           bn.GioiTinh,
                           nd.SoDienThoai,
                           REGEXP_REPLACE(
                               COALESCE(nd.SoDienThoai, ''),
                               '[^0-9]', ''
                           ) AS SoDaLamSach
                    FROM benhnhan bn
                    JOIN nguoidung nd
                      ON nd.MaNguoiDung = bn.MaNguoiDung
                ) ds
                WHERE (
                    CASE
                        WHEN ds.SoDaLamSach REGEXP '^84[0-9]{9}$'
                        THEN CONCAT('0', SUBSTRING(ds.SoDaLamSach, 3))
                        ELSE ds.SoDaLamSach
                    END
                ) = ?
                ORDER BY ds.HoTen ASC, ds.MaBenhNhan ASC
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Date ngaySinh = rs.getDate("NgaySinh");

            return new TiepNhanTraCuuSoDienThoaiDTO(
                    rs.getInt("MaBenhNhan"),
                    rs.getString("HoTen"),
                    ngaySinh != null
                            ? ngaySinh.toLocalDate()
                            : null,
                    rs.getString("GioiTinh"),
                    rs.getString("SoDienThoai")
            );
        }, soCanTim);
    }

    private String chuanHoaSoDienThoai(String giaTri) {
        if (giaTri == null || giaTri.isBlank()) {
            throw loiDuLieu("Vui lòng nhập số điện thoại.");
        }

        String so = giaTri.trim();

        // Cho phép khoảng trắng, dấu chấm, gạch ngang
        // hoặc dấu ngoặc khi nhập số điện thoại.
        if (so.length() > 40
                || !so.matches("^[+0-9\\s().-]+$")) {
            throw loiDuLieu("Số điện thoại không hợp lệ.");
        }

        so = so.replaceAll("[\\s().-]", "");

        if (!so.matches("^\\+?[0-9]{9,14}$")) {
            throw loiDuLieu(
                    "Số điện thoại phải gồm 9–14 chữ số, "
                            + "có thể bắt đầu bằng dấu +."
            );
        }

        so = so.replace("+", "");

        // Ví dụ: +84901234567 và 0901234567
        // được xem là cùng một số điện thoại.
        if (so.matches("^84[0-9]{9}$")) {
            so = "0" + so.substring(2);
        }

        return so;
    }

    private ResponseStatusException loiDuLieu(String thongBao) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                thongBao
        );
    }
}