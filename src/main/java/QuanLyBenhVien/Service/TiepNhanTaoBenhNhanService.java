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
import java.util.Map;
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

    // =====================================================
    // TRA CỨU HỒ SƠ THEO SỐ ĐIỆN THOẠI
    // Không lọc TrangThai của nguoidung vì hồ sơ tại quầy
    // có thể gắn với tài khoản nội bộ chưa được đăng nhập.
    // =====================================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> traCuuSoDienThoai(
            String soDienThoai
    ) {
        String soDaChuanHoa = chuanHoaSoDienThoai(
                soDienThoai,
                "Số điện thoại",
                true
        );

        String sql = """
                SELECT
                    bn.MaBenhNhan AS maBenhNhan,
                    nd.HoTen AS hoTen,
                    bn.NgaySinh AS ngaySinh,
                    bn.GioiTinh AS gioiTinh,
                    nd.SoDienThoai AS soDienThoai,
                    nd.Email AS email,
                    bn.DiaChi AS diaChi
                FROM benhnhan bn
                JOIN nguoidung nd
                    ON nd.MaNguoiDung = bn.MaNguoiDung
                WHERE
                    CASE
                        WHEN LEFT(
                            REGEXP_REPLACE(
                                COALESCE(nd.SoDienThoai, ''),
                                '[^0-9+]',
                                ''
                            ),
                            3
                        ) = '+84'
                        THEN CONCAT(
                            '0',
                            SUBSTRING(
                                REGEXP_REPLACE(
                                    nd.SoDienThoai,
                                    '[^0-9+]',
                                    ''
                                ),
                                4
                            )
                        )
                        ELSE REGEXP_REPLACE(
                            COALESCE(nd.SoDienThoai, ''),
                            '[^0-9+]',
                            ''
                        )
                    END = ?
                ORDER BY nd.HoTen, bn.MaBenhNhan
                """;

        return jdbcTemplate.queryForList(sql, soDaChuanHoa);
    }

    // =====================================================
    // TẠO HỒ SƠ BỆNH NHÂN TẠI QUẦY
    // Không yêu cầu bệnh nhân có tài khoản app trước.
    // Hai bản ghi được tạo trong cùng một transaction.
    // =====================================================

    @Transactional
    public Integer taoBenhNhan(
            TiepNhanTaoBenhNhanDTO dto
    ) {
        if (dto == null) {
            throw loiDuLieu("Chưa có thông tin bệnh nhân.");
        }

        String hoTen = chuanHoa(dto.getHoTen());
        String gioiTinh = chuanHoa(dto.getGioiTinh());
        String email = chuanHoa(dto.getEmail());
        String diaChi = chuanHoa(dto.getDiaChi());
        String tienSuBenh = chuanHoa(dto.getTienSuBenh());

        String soDienThoai = chuanHoaSoDienThoai(
                dto.getSoDienThoai(),
                "Số điện thoại",
                true
        );

        String soDienThoaiKhanCap = chuanHoaSoDienThoai(
                dto.getSoDienThoaiKhanCap(),
                "Số điện thoại khẩn cấp",
                false
        );

        LocalDate ngaySinh = dto.getNgaySinh();

        if (hoTen == null) {
            throw loiDuLieu("Vui lòng nhập họ tên.");
        }

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
                                + "Vui lòng kiểm tra hồ sơ hiện có "
                                + "hoặc để trống email nếu bệnh nhân "
                                + "không có email riêng."
                );
            }
        }

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

        // Bản ghi nội bộ để liên kết hồ sơ.
        // Không dùng số điện thoại làm tên đăng nhập.
        String tenDangNhap = "quay_"
                + UUID.randomUUID()
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
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Thông tin đã tồn tại. "
                            + "Vui lòng tra cứu lại trước khi tạo mới."
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

    private String chuanHoaSoDienThoai(
            String giaTri,
            String tenTruong,
            boolean batBuoc
    ) {
        String ketQua = chuanHoa(giaTri);

        if (ketQua == null) {
            if (batBuoc) {
                throw loiDuLieu(
                        "Vui lòng nhập "
                                + tenTruong.toLowerCase(Locale.ROOT)
                                + "."
                );
            }

            return null;
        }

        // Cho phép nhập khoảng trắng, dấu chấm, gạch nối,
        // dấu ngoặc khi ghi số điện thoại.
        if (!ketQua.matches("^[+0-9\\s().-]+$")) {
            throw loiDuLieu(tenTruong + " không hợp lệ.");
        }

        ketQua = ketQua.replaceAll("[\\s().-]", "");

        // Quy về đầu 0 cho số Việt Nam.
        if (ketQua.startsWith("+84")) {
            ketQua = "0" + ketQua.substring(3);
        }

        if (!ketQua.matches("^\\+?[0-9]{9,14}$")) {
            throw loiDuLieu(
                    tenTruong
                            + " phải gồm 9–14 chữ số, "
                            + "có thể bắt đầu bằng dấu +."
            );
        }

        return ketQua;
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

    private ResponseStatusException loiDuLieu(
            String thongBao
    ) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                thongBao
        );
    }
}