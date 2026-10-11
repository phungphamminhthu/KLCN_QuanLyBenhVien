package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanDangKyKhamDTO;
import QuanLyBenhVien.DTO.TiepNhanDangKyKhamKetQuaDTO;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class TiepNhanDangKyKhamService {

    private static final ZoneId VIETNAM =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbcTemplate;

    public TiepNhanDangKyKhamService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // =====================================================
    // DANH SÁCH KHOA CÓ LỊCH KHÁM CÒN HIỆU LỰC HÔM NAY
    // =====================================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> layDanhSachKhoa() {
        ZonedDateTime now = ZonedDateTime.now(VIETNAM);

        String sql = """
                SELECT DISTINCT
                    k.MaKhoa AS maKhoa,
                    k.TenKhoa AS tenKhoa
                FROM khoa k
                JOIN bacsi bs ON bs.MaKhoa = k.MaKhoa
                JOIN nguoidung nd
                    ON nd.MaNguoiDung = bs.MaNguoiDung
                JOIN lichlamviec lv
                    ON lv.MaBacSi = bs.MaBacSi
                JOIN phongchuyentrach p
                    ON p.MaPhong = lv.MaPhong
                   AND p.MaKhoa = k.MaKhoa
                WHERE lv.NgayLamViec = ?
                  AND lv.TrangThai = 'DangLamViec'
                  AND lv.GioKetThuc > ?
                  AND bs.TrangThai = 1
                  AND nd.TrangThai = 1
                  AND p.TrangThai = 1
                ORDER BY k.TenKhoa
                """;

        return jdbcTemplate.queryForList(
                sql,
                Date.valueOf(now.toLocalDate()),
                Time.valueOf(now.toLocalTime())
        );
    }

    // =====================================================
    // LỊCH LÀM VIỆC CỦA BÁC SĨ TRONG KHOA HÔM NAY
    // =====================================================

    @Transactional(readOnly = true)
    public List<Map<String, Object>> layLichBacSi(Integer maKhoa) {
        kiemTraMa(maKhoa, "Vui lòng chọn khoa.");

        ZonedDateTime now = ZonedDateTime.now(VIETNAM);

        String sql = """
                SELECT
                    lv.MaLichLamViec AS maLichLamViec,
                    bs.MaBacSi AS maBacSi,
                    bs.MaKhoa AS maKhoa,
                    nd.HoTen AS tenBacSi,
                    p.MaPhong AS maPhong,
                    p.TenPhong AS tenPhong,
                    DATE_FORMAT(
                        lv.NgayLamViec, '%Y-%m-%d'
                    ) AS ngayLamViec,
                    TIME_FORMAT(
                        lv.GioBatDau, '%H:%i'
                    ) AS gioBatDau,
                    TIME_FORMAT(
                        lv.GioKetThuc, '%H:%i'
                    ) AS gioKetThuc
                FROM lichlamviec lv
                JOIN bacsi bs ON bs.MaBacSi = lv.MaBacSi
                JOIN nguoidung nd
                    ON nd.MaNguoiDung = bs.MaNguoiDung
                JOIN phongchuyentrach p
                    ON p.MaPhong = lv.MaPhong
                   AND p.MaKhoa = bs.MaKhoa
                WHERE bs.MaKhoa = ?
                  AND lv.NgayLamViec = ?
                  AND lv.TrangThai = 'DangLamViec'
                  AND lv.GioKetThuc > ?
                  AND bs.TrangThai = 1
                  AND nd.TrangThai = 1
                  AND p.TrangThai = 1
                ORDER BY nd.HoTen, lv.GioBatDau
                """;

        return jdbcTemplate.queryForList(
                sql,
                maKhoa,
                Date.valueOf(now.toLocalDate()),
                Time.valueOf(now.toLocalTime())
        );
    }

    // =====================================================
    // ĐĂNG KÝ KHÁM VÀ CẤP SỐ CHỜ
    // =====================================================

    @Transactional
    public TiepNhanDangKyKhamKetQuaDTO dangKyKham(
            TiepNhanDangKyKhamDTO request
    ) {
        if (request == null) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Thiếu thông tin đăng ký khám."
            );
        }

        kiemTraMa(
                request.getMaBenhNhan(),
                "Vui lòng chọn bệnh nhân."
        );

        kiemTraMa(
                request.getMaKhoa(),
                "Vui lòng chọn khoa."
        );

        kiemTraMa(
                request.getMaBacSi(),
                "Vui lòng chọn bác sĩ."
        );

        kiemTraMa(
                request.getMaLichLamViec(),
                "Vui lòng chọn lịch làm việc của bác sĩ."
        );

        LocalTime gioKham = request.getGioKham();

        if (gioKham == null) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn giờ khám."
            );
        }

        if (gioKham.getSecond() != 0 || gioKham.getNano() != 0) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Giờ khám chỉ nhập giờ và phút."
            );
        }

        String lyDoKham = request.getLyDoKham();

        if (lyDoKham != null) {
            lyDoKham = lyDoKham.trim();

            if (lyDoKham.isEmpty()) {
                lyDoKham = null;
            } else if (lyDoKham.length() > 255) {
                throw loi(
                        HttpStatus.BAD_REQUEST,
                        "Lý do khám không được vượt quá 255 ký tự."
                );
            }
        }

        // Khóa khoa để các yêu cầu tại quầy không cấp
        // cùng một số chờ trong lúc xử lý đồng thời.
        List<Integer> khoa = jdbcTemplate.query(
                """
                SELECT MaKhoa
                FROM khoa
                WHERE MaKhoa = ?
                FOR UPDATE
                """,
                (rs, rowNum) -> rs.getInt("MaKhoa"),
                request.getMaKhoa()
        );

        if (khoa.isEmpty()) {
            throw loi(
                    HttpStatus.NOT_FOUND,
                    "Khoa được chọn không tồn tại."
            );
        }

        // Hồ sơ tạo tại quầy vẫn sử dụng được dù tài khoản
        // của bệnh nhân chưa được kích hoạt.
        List<Integer> benhNhan = jdbcTemplate.query(
                """
                SELECT MaBenhNhan
                FROM benhnhan
                WHERE MaBenhNhan = ?
                FOR UPDATE
                """,
                (rs, rowNum) -> rs.getInt("MaBenhNhan"),
                request.getMaBenhNhan()
        );

        if (benhNhan.isEmpty()) {
            throw loi(
                    HttpStatus.NOT_FOUND,
                    "Hồ sơ bệnh nhân không tồn tại."
            );
        }

        // Đọc và khóa lịch làm việc đang được chọn.
        List<LichLamViecInfo> lichLamViec = jdbcTemplate.query(
                """
                SELECT
                    lv.NgayLamViec,
                    lv.GioBatDau,
                    lv.GioKetThuc
                FROM lichlamviec lv
                JOIN bacsi bs ON bs.MaBacSi = lv.MaBacSi
                JOIN nguoidung nd
                    ON nd.MaNguoiDung = bs.MaNguoiDung
                JOIN phongchuyentrach p
                    ON p.MaPhong = lv.MaPhong
                   AND p.MaKhoa = bs.MaKhoa
                WHERE lv.MaLichLamViec = ?
                  AND lv.MaBacSi = ?
                  AND bs.MaKhoa = ?
                  AND lv.TrangThai = 'DangLamViec'
                  AND bs.TrangThai = 1
                  AND nd.TrangThai = 1
                  AND p.TrangThai = 1
                FOR UPDATE
                """,
                (rs, rowNum) -> new LichLamViecInfo(
                        rs.getDate("NgayLamViec").toLocalDate(),
                        rs.getTime("GioBatDau").toLocalTime(),
                        rs.getTime("GioKetThuc").toLocalTime()
                ),
                request.getMaLichLamViec(),
                request.getMaBacSi(),
                request.getMaKhoa()
        );

        if (lichLamViec.isEmpty()) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Lịch làm việc không còn hợp lệ, "
                            + "bác sĩ không thuộc khoa được chọn "
                            + "hoặc phòng khám chưa sẵn sàng."
            );
        }

        ZonedDateTime now = ZonedDateTime.now(VIETNAM);
        LocalDate ngayKham = now.toLocalDate();

        // Cho phép chọn phút hiện tại.
        LocalTime gioHienTai = now.toLocalTime()
                .truncatedTo(ChronoUnit.MINUTES);

        LichLamViecInfo lich = lichLamViec.get(0);

        if (!ngayKham.equals(lich.ngayLamViec())) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Đăng ký tại quầy chỉ áp dụng cho lịch hôm nay."
            );
        }

        if (
                gioKham.isBefore(lich.gioBatDau())
                        || !gioKham.isBefore(lich.gioKetThuc())
        ) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Giờ khám phải nằm trong giờ làm việc của bác sĩ "
                            + "và trước giờ kết thúc."
            );
        }

        if (gioKham.isBefore(gioHienTai)) {
            throw loi(
                    HttpStatus.BAD_REQUEST,
                    "Không thể đăng ký giờ khám đã qua."
            );
        }

        // Tránh tạo thêm lượt cùng khoa trong cùng ngày.
        // Lịch đã hủy không cản việc đăng ký lại.
        Long soLichDaCo = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM lichdangkykham
                WHERE MaBenhNhan = ?
                  AND MaKhoa = ?
                  AND NgayKham = ?
                  AND TrangThai <> 'DaHuy'
                """,
                Long.class,
                request.getMaBenhNhan(),
                request.getMaKhoa(),
                Date.valueOf(ngayKham)
        );

        if (soLichDaCo != null && soLichDaCo > 0) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Bệnh nhân đã có lượt khám tại khoa này hôm nay. "
                            + "Vui lòng kiểm tra lịch hiện có."
            );
        }

        // Không đăng ký hai bệnh nhân cùng bác sĩ, cùng giờ.
        Long soLichTrungGio = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM lichdangkykham
                WHERE MaBacSi = ?
                  AND NgayKham = ?
                  AND GioKham = ?
                  AND TrangThai <> 'DaHuy'
                """,
                Long.class,
                request.getMaBacSi(),
                Date.valueOf(ngayKham),
                Time.valueOf(gioKham)
        );

        if (soLichTrungGio != null && soLichTrungGio > 0) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Bác sĩ đã có lịch vào giờ này. "
                            + "Vui lòng chọn giờ khác."
            );
        }

        Long soLonNhat = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(MAX(SoThuTu), 0)
                FROM sothutu
                WHERE MaKhoa = ?
                  AND NgayCapSo = ?
                """,
                Long.class,
                request.getMaKhoa(),
                Date.valueOf(ngayKham)
        );

        long soTiepTheo = (soLonNhat == null ? 0 : soLonNhat) + 1;

        if (soTiepTheo > Integer.MAX_VALUE) {
            throw loi(
                    HttpStatus.CONFLICT,
                    "Không thể cấp thêm số chờ cho khoa này."
            );
        }

        int soThuTu = (int) soTiepTheo;

        // TrangThai của sothutu để NULL theo cấu trúc hiện có.
        Integer maSoThuTu = themSoThuTu(
                soThuTu,
                request.getMaKhoa(),
                ngayKham
        );

        Integer maLichKham = themLichKham(
                request,
                maSoThuTu,
                ngayKham,
                gioKham,
                lyDoKham
        );

        TiepNhanDangKyKhamKetQuaDTO result =
                new TiepNhanDangKyKhamKetQuaDTO();

        result.setMaLichKham(maLichKham);
        result.setMaBenhNhan(request.getMaBenhNhan());
        result.setMaSoThuTu(maSoThuTu);
        result.setSoThuTu(soThuTu);
        result.setNgayKham(ngayKham);
        result.setGioKham(gioKham);
        result.setTrangThai("ChoKham");

        return result;
    }

    // =====================================================
    // THÊM SỐ THỨ TỰ
    // =====================================================

    private Integer themSoThuTu(
            int soThuTu,
            Integer maKhoa,
            LocalDate ngayCapSo
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    INSERT INTO sothutu (
                        SoThuTu,
                        MaKhoa,
                        NgayCapSo,
                        TrangThai
                    )
                    VALUES (?, ?, ?, NULL)
                    """,
                    Statement.RETURN_GENERATED_KEYS
            );

            statement.setInt(1, soThuTu);
            statement.setInt(2, maKhoa);
            statement.setDate(3, Date.valueOf(ngayCapSo));

            return statement;
        }, keyHolder);

        return layMaVuaTao(keyHolder);
    }

    // =====================================================
    // THÊM LƯỢT KHÁM
    // =====================================================

    private Integer themLichKham(
            TiepNhanDangKyKhamDTO request,
            Integer maSoThuTu,
            LocalDate ngayKham,
            LocalTime gioKham,
            String lyDoKham
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    """
                    INSERT INTO lichdangkykham (
                        MaBenhNhan,
                        MaBacSi,
                        MaKhoa,
                        MaSoThuTu,
                        NgayKham,
                        GioKham,
                        LyDoKham,
                        TrangThai
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'ChoKham')
                    """,
                    Statement.RETURN_GENERATED_KEYS
            );

            statement.setInt(1, request.getMaBenhNhan());
            statement.setInt(2, request.getMaBacSi());
            statement.setInt(3, request.getMaKhoa());
            statement.setInt(4, maSoThuTu);
            statement.setDate(5, Date.valueOf(ngayKham));
            statement.setTime(6, Time.valueOf(gioKham));
            statement.setString(7, lyDoKham);

            return statement;
        }, keyHolder);

        return layMaVuaTao(keyHolder);
    }

    // =====================================================
    // HÀM HỖ TRỢ
    // =====================================================

    private Integer layMaVuaTao(KeyHolder keyHolder) {
        Number key = keyHolder.getKey();

        if (key == null) {
            throw loi(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không lấy được mã bản ghi vừa tạo."
            );
        }

        return key.intValue();
    }

    private void kiemTraMa(Integer ma, String message) {
        if (ma == null || ma <= 0) {
            throw loi(HttpStatus.BAD_REQUEST, message);
        }
    }

    private ResponseStatusException loi(
            HttpStatus status,
            String message
    ) {
        return new ResponseStatusException(status, message);
    }

    private record LichLamViecInfo(
            LocalDate ngayLamViec,
            LocalTime gioBatDau,
            LocalTime gioKetThuc
    ) {
    }
}