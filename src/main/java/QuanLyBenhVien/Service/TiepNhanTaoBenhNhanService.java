package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanTaoBenhNhanDTO;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class TiepNhanTaoBenhNhanService {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbcTemplate;

    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public TiepNhanTaoBenhNhanService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // Trả về mã bệnh nhân vừa tạo.
    @Transactional
    public Integer taoBenhNhan(
            TiepNhanTaoBenhNhanDTO dto
    ) {
        if (dto == null) {
            throw loiDuLieu("Chưa có thông tin bệnh nhân.");
        }

        String hoTen = chuanHoa(dto.getHoTen());
        String gioiTinh = chuanHoa(dto.getGioiTinh());
        String soDienThoai = chuanHoa(dto.getSoDienThoai());
        String email = chuanHoa(dto.getEmail());
        String diaChi = chuanHoa(dto.getDiaChi());
        String soDienThoaiKhanCap =
                chuanHoa(dto.getSoDienThoaiKhanCap());
        String tienSuBenh = chuanHoa(dto.getTienSuBenh());

        LocalDate ngaySinh = dto.getNgaySinh();

        kiemTraBatBuoc(hoTen, "Họ tên");
        kiemTraDoDai(hoTen, 255, "Họ tên");

        if (ngaySinh == null) {
            throw loiDuLieu("Vui lòng nhập ngày sinh.");
        }

        if (ngaySinh.isAfter(LocalDate.now(MUI_GIO))) {
            throw loiDuLieu(
                    "Ngày sinh không được lớn hơn ngày hiện tại."
            );
        }

        if (ngaySinh.isBefore(LocalDate.of(1000, 1, 1))) {
            throw loiDuLieu("Ngày sinh không hợp lệ.");
        }

        if (!"Nam".equals(gioiTinh)
                && !"Nữ".equals(gioiTinh)
                && !"Khác".equals(gioiTinh)) {
            throw loiDuLieu(
                    "Giới tính phải là Nam, Nữ hoặc Khác."
            );
        }

        // Có thể dùng số liên hệ của người thân.
        kiemTraBatBuoc(soDienThoai, "Số điện thoại");
        kiemTraSoDienThoai(
                soDienThoai,
                "Số điện thoại"
        );

        if (soDienThoaiKhanCap != null) {
            kiemTraSoDienThoai(
                    soDienThoaiKhanCap,
                    "Số điện thoại khẩn cấp"
            );
        }

        kiemTraDoDai(diaChi, 255, "Địa chỉ");
        kiemTraDoDai(tienSuBenh, 5000, "Tiền sử bệnh");

        if (email != null) {
            email = email.toLowerCase(Locale.ROOT);

            kiemTraDoDai(email, 255, "Email");

            if (!email.matches(
                    "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
            )) {
                throw loiDuLieu("Email không hợp lệ.");
            }

            Long soLuong = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM nguoidung
                    WHERE Email = ?
                    """,
                    Long.class,
                    email
            );

            if (soLuong != null && soLuong > 0) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Email đã được sử dụng. "
                                + "Vui lòng tìm hồ sơ hiện có trước."
                );
            }
        }

        // Tra cứu theo tên vai trò, không cố định mã 6 trong code.
        List<Integer> vaiTroBenhNhan =
                jdbcTemplate.queryForList(
                        """
                        SELECT MaVaiTro
                        FROM vaitro
                        WHERE TenVaiTro = 'BENHNHAN'
                        """,
                        Integer.class
                );

        if (vaiTroBenhNhan.size() != 1) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Cần có đúng một vai trò BENHNHAN "
                            + "trong database."
            );
        }

        String tenDangNhap =
                "quay_" + UUID.randomUUID()
                        .toString()
                        .replace("-", "");

        String matKhauMaHoa = passwordEncoder.encode(
                UUID.randomUUID().toString()
        );

        try {
            Integer maNguoiDung = themNguoiDung(
                    vaiTroBenhNhan.get(0),
                    tenDangNhap,
                    matKhauMaHoa,
                    hoTen,
                    email,
                    soDienThoai
            );

            return themBenhNhan(
                    maNguoiDung,
                    ngaySinh,
                    gioiTinh,
                    diaChi,
                    soDienThoaiKhanCap,
                    tienSuBenh
            );

        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Thông tin tài khoản đã tồn tại. "
                            + "Vui lòng kiểm tra hồ sơ trước khi tạo mới."
            );
        }
    }

    private Integer themNguoiDung(
            Integer maVaiTro,
            String tenDangNhap,
            String matKhauMaHoa,
            String hoTen,
            String email,
            String soDienThoai
    ) {
        String sql = """
                INSERT INTO nguoidung (
                    MaVaiTro,
                    TenDangNhap,
                    MatKhau,
                    HoTen,
                    Email,
                    SoDienThoai,
                    TrangThai
                )
                VALUES (?, ?, ?, ?, ?, ?, 0)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement =
                    connection.prepareStatement(
                            sql,
                            Statement.RETURN_GENERATED_KEYS
                    );

            statement.setInt(1, maVaiTro);
            statement.setString(2, tenDangNhap);
            statement.setString(3, matKhauMaHoa);
            statement.setString(4, hoTen);
            statement.setString(5, email);
            statement.setString(6, soDienThoai);

            return statement;
        }, keyHolder);

        return layMaVuaTao(keyHolder);
    }

    private Integer themBenhNhan(
            Integer maNguoiDung,
            LocalDate ngaySinh,
            String gioiTinh,
            String diaChi,
            String soDienThoaiKhanCap,
            String tienSuBenh
    ) {
        String sql = """
                INSERT INTO benhnhan (
                    MaNguoiDung,
                    NgaySinh,
                    GioiTinh,
                    DiaChi,
                    SoDienThoaiKhanCap,
                    TienSuBenh
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement =
                    connection.prepareStatement(
                            sql,
                            Statement.RETURN_GENERATED_KEYS
                    );

            statement.setInt(1, maNguoiDung);
            statement.setObject(2, ngaySinh, Types.DATE);
            statement.setString(3, gioiTinh);
            statement.setString(4, diaChi);
            statement.setString(5, soDienThoaiKhanCap);
            statement.setString(6, tienSuBenh);

            return statement;
        }, keyHolder);

        return layMaVuaTao(keyHolder);
    }

    private Integer layMaVuaTao(KeyHolder keyHolder) {
        Number ma = keyHolder.getKey();

        if (ma == null) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không lấy được mã hồ sơ vừa tạo."
            );
        }

        return ma.intValue();
    }

    private String chuanHoa(String giaTri) {
        if (giaTri == null) {
            return null;
        }

        String ketQua = giaTri.trim();

        return ketQua.isEmpty() ? null : ketQua;
    }

    private void kiemTraBatBuoc(
            String giaTri,
            String tenTruong
    ) {
        if (giaTri == null) {
            throw loiDuLieu(
                    "Vui lòng nhập " + tenTruong.toLowerCase()
                            + "."
            );
        }
    }

    private void kiemTraDoDai(
            String giaTri,
            int toiDa,
            String tenTruong
    ) {
        if (giaTri != null && giaTri.length() > toiDa) {
            throw loiDuLieu(
                    tenTruong + " không được vượt quá "
                            + toiDa + " ký tự."
            );
        }
    }

    private void kiemTraSoDienThoai(
            String giaTri,
            String tenTruong
    ) {
        if (!giaTri.matches("^\\+?[0-9]{9,14}$")) {
            throw loiDuLieu(
                    tenTruong
                            + " phải gồm 9–14 chữ số, "
                            + "có thể bắt đầu bằng dấu +."
            );
        }
    }

    private ResponseStatusException loiDuLieu(
            String thongBao
    ) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                thongBao
        );
    }
}