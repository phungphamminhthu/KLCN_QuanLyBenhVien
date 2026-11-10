package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanHoSoBenhNhanDTO;
import QuanLyBenhVien.DTO.TiepNhanTaoBenhNhanDTO;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class TiepNhanHoSoBenhNhanService {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbcTemplate;

    public TiepNhanHoSoBenhNhanService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // =========================================================
    // ĐỌC HỒ SƠ BỆNH NHÂN
    // =========================================================
    @Transactional(readOnly = true)
    public TiepNhanHoSoBenhNhanDTO getHoSo(
            Integer maBenhNhan
    ) {
        kiemTraMaBenhNhan(maBenhNhan);

        String sqlBenhNhan = """
            SELECT
                bn.MaBenhNhan,
                bn.HoTen,
                bn.NgaySinh,
                bn.GioiTinh,
                nd.SoDienThoai AS SoDienThoai,
                nd.Email,
                bn.SoDienThoaiKhanCap,
                bn.DiaChi,
                bn.TienSuBenh
            FROM BenhNhan bn
            INNER JOIN NguoiDung nd
                ON nd.MaNguoiDung = bn.MaNguoiDung
            WHERE bn.MaBenhNhan = ?
            """;

        List<TiepNhanHoSoBenhNhanDTO> ketQua =
                jdbcTemplate.query(
                        sqlBenhNhan,
                        (rs, rowNum) -> {
                            TiepNhanHoSoBenhNhanDTO dto =
                                    new TiepNhanHoSoBenhNhanDTO();

                            dto.setMaBenhNhan(
                                    rs.getInt("MaBenhNhan")
                            );

                            dto.setHoTen(
                                    rs.getString("HoTen")
                            );

                            Date ngaySinh = rs.getDate("NgaySinh");

                            dto.setNgaySinh(
                                    ngaySinh != null
                                            ? ngaySinh.toLocalDate()
                                            : null
                            );

                            dto.setGioiTinh(
                                    rs.getString("GioiTinh")
                            );

                            dto.setSoDienThoai(
                                    rs.getString("SoDienThoai")
                            );

                            dto.setEmail(
                                    rs.getString("Email")
                            );

                            dto.setSoDienThoaiKhanCap(
                                    rs.getString("SoDienThoaiKhanCap")
                            );

                            dto.setDiaChi(
                                    rs.getString("DiaChi")
                            );

                            dto.setTienSuBenh(
                                    rs.getString("TienSuBenh")
                            );

                            return dto;
                        },
                        maBenhNhan
                );

        if (ketQua.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy bệnh nhân."
            );
        }

        TiepNhanHoSoBenhNhanDTO hoSo = ketQua.get(0);

        hoSo.setDanhSachLanKham(
                layDanhSachLanKham(maBenhNhan)
        );

        return hoSo;
    }

    // =========================================================
    // CẬP NHẬT THÔNG TIN CÁ NHÂN
    //
    // Nhận toàn bộ thông tin của form hồ sơ.
    // Trường tùy chọn để trống sẽ được lưu thành NULL.
    // Không thay đổi tài khoản, vai trò hoặc trạng thái lịch khám.
    // =========================================================
    @Transactional
    public void capNhatHoSo(
            Integer maBenhNhan,
            TiepNhanTaoBenhNhanDTO request
    ) {
        kiemTraMaBenhNhan(maBenhNhan);

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng gửi thông tin bệnh nhân cần cập nhật."
            );
        }

        // 1. Kiểm tra họ tên bệnh nhân
        String hoTen = chuanHoaChuoi(
                request.getHoTen(),
                "Họ tên",
                255
        );

        if (hoTen == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập họ tên bệnh nhân."
            );
        }

        // 2. Kiểm tra ngày sinh
        LocalDate ngaySinh = request.getNgaySinh();

        if (ngaySinh != null
                && (ngaySinh.getYear() < 1000
                || ngaySinh.isAfter(LocalDate.now(MUI_GIO)))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày sinh không hợp lệ hoặc lớn hơn ngày hiện tại."
            );
        }

        // 3. Kiểm tra giới tính
        String gioiTinh = chuanHoaChuoi(
                request.getGioiTinh(),
                "Giới tính",
                10
        );

        if (gioiTinh != null
                && !List.of("Nam", "Nữ", "Khác").contains(gioiTinh)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giới tính phải là Nam, Nữ hoặc Khác."
            );
        }

        // 4. Kiểm tra số điện thoại tài khoản
        String soDienThoai = kiemTraSoDienThoai(
                request.getSoDienThoai(),
                "Số điện thoại",
                255
        );

        // 5. Kiểm tra số điện thoại khẩn cấp
        String soDienThoaiKhanCap = kiemTraSoDienThoai(
                request.getSoDienThoaiKhanCap(),
                "Số điện thoại khẩn cấp",
                15
        );

        // 6. Kiểm tra email
        String email = chuanHoaChuoi(
                request.getEmail(),
                "Email",
                255
        );

        if (email != null
                && !email.matches(
                "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email không đúng định dạng."
            );
        }

        // 7. Kiểm tra địa chỉ
        String diaChi = chuanHoaChuoi(
                request.getDiaChi(),
                "Địa chỉ",
                255
        );

        // 8. Kiểm tra tiền sử bệnh
        String tienSuBenh = chuanHoaChuoi(
                request.getTienSuBenh(),
                "Tiền sử bệnh",
                65535
        );

        if (tienSuBenh != null
                && tienSuBenh.getBytes(
                StandardCharsets.UTF_8
        ).length > 65535) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Nội dung tiền sử bệnh quá dài."
            );
        }

        // 9. Lấy MaNguoiDung từ hồ sơ bệnh nhân
        // Khóa bản ghi để đảm bảo dữ liệu nhất quán khi cập nhật.
        String sqlTimNguoiDung = """
            SELECT MaNguoiDung
            FROM BenhNhan
            WHERE MaBenhNhan = ?
            FOR UPDATE
            """;

        List<Integer> maNguoiDungList =
                jdbcTemplate.query(
                        sqlTimNguoiDung,
                        (rs, rowNum) ->
                                rs.getInt("MaNguoiDung"),
                        maBenhNhan
                );

        if (maNguoiDungList.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy bệnh nhân cần cập nhật."
            );
        }

        Integer maNguoiDung = maNguoiDungList.get(0);

        // 10. Kiểm tra email có bị tài khoản khác sử dụng không
        if (email != null) {
            Long soTaiKhoanTrungEmail =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COUNT(*)
                            FROM NguoiDung
                            WHERE Email = ?
                              AND MaNguoiDung <> ?
                            """,
                            Long.class,
                            email,
                            maNguoiDung
                    );

            if (soTaiKhoanTrungEmail != null
                    && soTaiKhoanTrungEmail > 0) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Email này đã được sử dụng bởi tài khoản khác."
                );
            }
        }

        try {
            // 11. Cập nhật thông tin riêng của bệnh nhân
            jdbcTemplate.update(
                    """
                    UPDATE BenhNhan
                    SET HoTen = ?,
                        NgaySinh = ?,
                        GioiTinh = ?,
                        DiaChi = ?,
                        SoDienThoaiKhanCap = ?,
                        TienSuBenh = ?
                    WHERE MaBenhNhan = ?
                    """,
                    hoTen,
                    ngaySinh != null
                            ? Date.valueOf(ngaySinh)
                            : null,
                    gioiTinh,
                    diaChi,
                    soDienThoaiKhanCap,
                    tienSuBenh,
                    maBenhNhan
            );

            // 12. Cập nhật thông tin liên hệ của tài khoản
            jdbcTemplate.update(
                    """
                    UPDATE NguoiDung
                    SET SoDienThoai = ?,
                        Email = ?
                    WHERE MaNguoiDung = ?
                    """,
                    soDienThoai,
                    email,
                    maNguoiDung
            );

        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Dữ liệu cập nhật bị trùng. Vui lòng kiểm tra lại email.",
                    exception
            );
        }
    }

    // =========================================================
    // KIỂM TRA DỮ LIỆU
    // =========================================================

    private void kiemTraMaBenhNhan(Integer maBenhNhan) {
        if (maBenhNhan == null || maBenhNhan <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã bệnh nhân không hợp lệ."
            );
        }
    }

    private String chuanHoaChuoi(
            String value,
            String tenTruong,
            int doDaiToiDa
    ) {
        if (value == null) {
            return null;
        }

        String ketQua = value.strip();

        if (ketQua.isEmpty()) {
            return null;
        }

        int soKyTu = ketQua.codePointCount(
                0,
                ketQua.length()
        );

        if (soKyTu > doDaiToiDa) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    tenTruong + " không được vượt quá "
                            + doDaiToiDa + " ký tự."
            );
        }

        return ketQua;
    }

    private String kiemTraSoDienThoai(
            String value,
            String tenTruong,
            int doDaiToiDa
    ) {
        String soDienThoai = chuanHoaChuoi(
                value,
                tenTruong,
                doDaiToiDa
        );

        if (soDienThoai == null) {
            return null;
        }

        if (!soDienThoai.matches("^\\+?[0-9]{9,14}$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    tenTruong + " phải gồm 9 đến 14 chữ số, "
                            + "có thể bắt đầu bằng dấu +."
            );
        }

        return soDienThoai;
    }

    // =========================================================
    // DANH SÁCH CÁC LƯỢT KHÁM
    // =========================================================

    private List<TiepNhanHoSoBenhNhanDTO.LanKhamDTO>
    layDanhSachLanKham(Integer maBenhNhan) {

        String sql = """
                SELECT
                    l.MaLichKham,
                    l.NgayKham,
                    l.GioKham,
                    s.SoThuTu,
                    k.TenKhoa,
                    ndBacSi.HoTen AS TenBacSi,
                    l.LyDoKham,
                    h.CanNang,
                    h.ChieuCao,
                    h.HuyetApTamThu,
                    h.HuyetApTamTruong,

                    (
                        SELECT p.TenPhong
                        FROM lichlamviec lv
                        JOIN phongchuyentrach p
                          ON p.MaPhong = lv.MaPhong
                        WHERE lv.MaBacSi = l.MaBacSi
                          AND lv.NgayLamViec = l.NgayKham
                          AND l.GioKham >= lv.GioBatDau
                          AND l.GioKham < lv.GioKetThuc
                        ORDER BY lv.MaLichLamViec
                        LIMIT 1
                    ) AS TenPhong,

                    CASE
                        WHEN l.TrangThai IN ('DaHuy', 'KhongDen')
                            THEN l.TrangThai
                        WHEN h.TrangThai = 'HoanTat'
                            THEN 'HoanTat'
                        WHEN h.TrangThai = 'DangKham'
                            THEN 'DangKham'
                        ELSE l.TrangThai
                    END AS TrangThaiHienTai

                FROM lichdangkykham l

                LEFT JOIN sothutu s
                  ON s.MaSoThuTu = l.MaSoThuTu

                LEFT JOIN khoa k
                  ON k.MaKhoa = l.MaKhoa

                LEFT JOIN bacsi bs
                  ON bs.MaBacSi = l.MaBacSi

                LEFT JOIN nguoidung ndBacSi
                  ON ndBacSi.MaNguoiDung = bs.MaNguoiDung

                LEFT JOIN hosobenhan h
                  ON h.MaLichKham = l.MaLichKham

                WHERE l.MaBenhNhan = ?

                ORDER BY
                    l.NgayKham DESC,
                    l.GioKham DESC,
                    l.MaLichKham DESC
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    TiepNhanHoSoBenhNhanDTO.LanKhamDTO dto =
                            new TiepNhanHoSoBenhNhanDTO.LanKhamDTO();

                    dto.setMaLichKham(
                            rs.getInt("MaLichKham")
                    );

                    Date ngayKham = rs.getDate("NgayKham");
                    Time gioKham = rs.getTime("GioKham");

                    dto.setNgayKham(
                            ngayKham != null
                                    ? ngayKham.toLocalDate()
                                    : null
                    );

                    dto.setGioKham(
                            gioKham != null
                                    ? gioKham.toLocalTime()
                                    : null
                    );

                    int soThuTu = rs.getInt("SoThuTu");

                    dto.setSoThuTu(
                            rs.wasNull() ? null : soThuTu
                    );

                    dto.setKhoa(
                            rs.getString("TenKhoa")
                    );
                    dto.setBacSi(
                            rs.getString("TenBacSi")
                    );
                    dto.setPhong(
                            rs.getString("TenPhong")
                    );
                    dto.setLyDoKham(
                            rs.getString("LyDoKham")
                    );

                    dto.setTrangThai(
                            hienThiTrangThai(
                                    rs.getString("TrangThaiHienTai")
                            )
                    );

                    dto.setCanNang(
                            rs.getBigDecimal("CanNang")
                    );
                    dto.setChieuCao(
                            rs.getBigDecimal("ChieuCao")
                    );

                    int tamThu = rs.getInt("HuyetApTamThu");

                    dto.setHuyetApTamThu(
                            rs.wasNull() ? null : tamThu
                    );

                    int tamTruong =
                            rs.getInt("HuyetApTamTruong");

                    dto.setHuyetApTamTruong(
                            rs.wasNull() ? null : tamTruong
                    );

                    return dto;
                },
                maBenhNhan
        );
    }


    private String hienThiTrangThai(String trangThai) {
        if (trangThai == null || trangThai.isBlank()) {
            return "Chưa xác định";
        }

        return switch (trangThai) {
            case "ChoGoi" -> "Chờ gọi";
            case "ChoKham" -> "Chờ khám";
            case "DaDat" -> "Đã đặt lịch";
            case "DaXacNhan" -> "Lịch đã xác nhận";
            case "DaGoi" -> "Đã gọi";
            case "DaTiepNhan" -> "Đã tiếp nhận";
            case "DangKham" -> "Đang khám";
            case "ChoThanhToan" -> "Chờ thanh toán";
            case "ChoCLS" -> "Chờ CLS";
            case "DangCLS" -> "Đang CLS";
            case "ChoLayThuoc" -> "Chờ lấy thuốc";
            case "DangLayThuoc" -> "Đang lấy thuốc";
            case "HoanTat", "HoanThanh", "DaKham" -> "Hoàn tất";
            case "DaHuy" -> "Đã hủy";
            case "KhongDen" -> "Không đến";
            default -> trangThai;
        };
    }

}