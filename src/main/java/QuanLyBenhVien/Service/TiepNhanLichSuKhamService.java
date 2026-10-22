package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanLichSuKhamDTO;
import QuanLyBenhVien.DTO.TiepNhanLichSuKhamDTO.BoLocDTO;
import QuanLyBenhVien.DTO.TiepNhanLichSuKhamDTO.LichSuItemDTO;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Time;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class TiepNhanLichSuKhamService {

    private final JdbcTemplate jdbcTemplate;

    private static final DateTimeFormatter GIO_HIEN_THI =
            DateTimeFormatter.ofPattern("HH:mm");

    /*
     * Mỗi lịch khám chỉ có tối đa một hồ sơ bệnh án
     * do hosobenhan.MaLichKham có ràng buộc UNIQUE.
     */
    private static final String FROM_SQL = """
            FROM lichdangkykham l
            JOIN hosobenhan h
                ON h.MaLichKham = l.MaLichKham
            JOIN benhnhan bn
                ON bn.MaBenhNhan = l.MaBenhNhan
            JOIN nguoidung nd
                ON nd.MaNguoiDung = bn.MaNguoiDung
            LEFT JOIN bacsi bs
                ON bs.MaBacSi = l.MaBacSi
            LEFT JOIN nguoidung ndBS
                ON ndBS.MaNguoiDung = bs.MaNguoiDung
            LEFT JOIN khoa k
                ON k.MaKhoa = l.MaKhoa
            LEFT JOIN sothutu s
                ON s.MaSoThuTu = l.MaSoThuTu
            """;

    /*
     * Xác định khám xong theo trạng thái hồ sơ bệnh án.
     * Không đưa lịch đã hủy hoặc không đến vào lịch sử đã khám.
     */
    private static final String DIEU_KIEN_HOAN_TAT = """
            WHERE h.TrangThai = 'HoanTat'
              AND l.TrangThai NOT IN ('DaHuy', 'KhongDen')
            """;

    /*
     * Tìm phòng theo lịch làm việc của bác sĩ:
     * - Cùng ngày khám.
     * - Giờ khám nằm trong ca làm việc.
     * - Nếu có nhiều ca trùng nhau, chọn một ca xác định.
     *
     * Truy vấn con tránh làm trùng các dòng lịch khám.
     */
    private static final String SELECT_SQL = """
            SELECT
                l.MaLichKham,
                l.MaBenhNhan,
                h.MaHoSoBenhAn,
                l.MaBacSi,
                l.MaKhoa,
                s.SoThuTu,
                nd.HoTen AS TenBenhNhan,
                bn.NgaySinh,
                bn.GioiTinh,
                nd.SoDienThoai,
                l.NgayKham,
                l.GioKham,
                k.TenKhoa,
                ndBS.HoTen AS TenBacSi,
                l.TrangThai AS TrangThaiLichKham,
                h.TrangThai AS TrangThaiHoSo,
                (
                    SELECT p.TenPhong
                    FROM lichlamviec lv
                    JOIN phongchuyentrach p
                        ON p.MaPhong = lv.MaPhong
                    WHERE lv.MaBacSi = l.MaBacSi
                      AND lv.NgayLamViec = l.NgayKham
                      AND l.GioKham >= lv.GioBatDau
                      AND l.GioKham < lv.GioKetThuc
                    ORDER BY
                        lv.GioBatDau DESC,
                        lv.MaLichLamViec DESC
                    LIMIT 1
                ) AS TenPhong
            """;

    public TiepNhanLichSuKhamService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public TiepNhanLichSuKhamDTO getDanhSachLichSuKham(
            String tuKhoa,
            Integer maBacSi,
            Integer maKhoa,
            LocalDate tuNgay,
            LocalDate denNgay,
            int trang,
            int kichThuocTrang
    ) {
        kiemTraBoLoc(
                tuKhoa,
                maBacSi,
                maKhoa,
                tuNgay,
                denNgay,
                trang,
                kichThuocTrang
        );

        StringBuilder dieuKien =
                new StringBuilder(DIEU_KIEN_HOAN_TAT);

        List<Object> thamSo = new ArrayList<>();

        themDieuKienTimKiem(dieuKien, thamSo, tuKhoa);

        if (maBacSi != null) {
            dieuKien.append(" AND l.MaBacSi = ? ");
            thamSo.add(maBacSi);
        }

        if (maKhoa != null) {
            dieuKien.append(" AND l.MaKhoa = ? ");
            thamSo.add(maKhoa);
        }

        if (tuNgay != null) {
            dieuKien.append(" AND l.NgayKham >= ? ");
            thamSo.add(Date.valueOf(tuNgay));
        }

        if (denNgay != null) {
            dieuKien.append(" AND l.NgayKham <= ? ");
            thamSo.add(Date.valueOf(denNgay));
        }

        // Đếm tổng lịch phù hợp với các bộ lọc.
        String sqlDem = "SELECT COUNT(*) "
                + FROM_SQL
                + dieuKien;

        Long ketQuaDem = jdbcTemplate.queryForObject(
                sqlDem,
                Long.class,
                thamSo.toArray()
        );

        long tongLichKham = ketQuaDem != null ? ketQuaDem : 0;

        // Khi không có dữ liệu, giao diện vẫn hiển thị Trang 1 / 1.
        long tongSoTrang = tongLichKham == 0
                ? 1
                : 1 + (tongLichKham - 1) / kichThuocTrang;

        // Tự điều chỉnh nếu trang yêu cầu vượt số trang hiện có.
        int trangHienTai = (int) Math.min(
                (long) trang,
                tongSoTrang
        );

        long viTriBatDau =
                ((long) trangHienTai - 1) * kichThuocTrang;

        String sqlDanhSach = SELECT_SQL
                + FROM_SQL
                + dieuKien
                + """
                  ORDER BY
                      l.NgayKham DESC,
                      l.GioKham DESC,
                      l.MaLichKham DESC
                  LIMIT ? OFFSET ?
                  """;

        List<Object> thamSoDanhSach = new ArrayList<>(thamSo);
        thamSoDanhSach.add(kichThuocTrang);
        thamSoDanhSach.add(viTriBatDau);

        List<LichSuItemDTO> danhSach = jdbcTemplate.query(
                sqlDanhSach,
                this::mapLichSuItem,
                thamSoDanhSach.toArray()
        );

        TiepNhanLichSuKhamDTO dto = new TiepNhanLichSuKhamDTO();

        dto.setDanhSach(danhSach);
        dto.setTrangHienTai(trangHienTai);
        dto.setKichThuocTrang(kichThuocTrang);
        dto.setTongLichKham(tongLichKham);
        dto.setTongSoTrang(tongSoTrang);

        /*
         * Bộ lọc lấy từ toàn bộ lịch đã khám xong,
         * không chỉ từ các dòng trong trang hiện tại.
         */
        dto.setDanhSachBacSi(getDanhSachBacSi());
        dto.setDanhSachKhoa(getDanhSachKhoa());

        return dto;
    }

    private void kiemTraBoLoc(
            String tuKhoa,
            Integer maBacSi,
            Integer maKhoa,
            LocalDate tuNgay,
            LocalDate denNgay,
            int trang,
            int kichThuocTrang
    ) {
        if (tuKhoa != null && tuKhoa.length() > 255) {
            throw new IllegalArgumentException(
                    "Từ khóa tìm kiếm không được vượt quá 255 ký tự."
            );
        }

        if (maBacSi != null && maBacSi <= 0) {
            throw new IllegalArgumentException(
                    "Mã bác sĩ không hợp lệ."
            );
        }

        if (maKhoa != null && maKhoa <= 0) {
            throw new IllegalArgumentException(
                    "Mã khoa không hợp lệ."
            );
        }

        kiemTraNgay(tuNgay);
        kiemTraNgay(denNgay);

        if (tuNgay != null
                && denNgay != null
                && tuNgay.isAfter(denNgay)) {
            throw new IllegalArgumentException(
                    "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            );
        }

        if (trang < 1) {
            throw new IllegalArgumentException(
                    "Số trang phải lớn hơn hoặc bằng 1."
            );
        }

        if (kichThuocTrang != 5
                && kichThuocTrang != 10
                && kichThuocTrang != 20
                && kichThuocTrang != 50) {
            throw new IllegalArgumentException(
                    "Số dòng mỗi trang phải là 5, 10, 20 hoặc 50."
            );
        }
    }

    private void kiemTraNgay(LocalDate ngay) {
        if (ngay != null
                && (ngay.getYear() < 1000
                || ngay.getYear() > 9999)) {
            throw new IllegalArgumentException(
                    "Ngày lọc không hợp lệ."
            );
        }
    }

    private void themDieuKienTimKiem(
            StringBuilder dieuKien,
            List<Object> thamSo,
            String tuKhoa
    ) {
        if (tuKhoa == null || tuKhoa.isBlank()) {
            return;
        }

        /*
         * Escape ký tự đặc biệt của LIKE.
         * Người dùng nhập % hoặc _ sẽ tìm ký tự đó,
         * không làm mở rộng kết quả ngoài ý muốn.
         */
        String tuKhoaDaEscape = tuKhoa.trim()
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");

        String mauTimKiem = "%" + tuKhoaDaEscape + "%";

        dieuKien.append("""
                AND (
                    nd.HoTen LIKE ? ESCAPE '!'
                    OR nd.SoDienThoai LIKE ? ESCAPE '!'
                    OR CAST(l.MaLichKham AS CHAR) LIKE ? ESCAPE '!'
                    OR CAST(l.MaBenhNhan AS CHAR) LIKE ? ESCAPE '!'
                    OR CONCAT('LK-', l.MaLichKham) LIKE ? ESCAPE '!'
                    OR CONCAT('BN-', l.MaBenhNhan) LIKE ? ESCAPE '!'
                )
                """);

        for (int i = 0; i < 6; i++) {
            thamSo.add(mauTimKiem);
        }
    }

    private List<BoLocDTO> getDanhSachBacSi() {
        String sql = """
                SELECT DISTINCT
                    l.MaBacSi AS Ma,
                    ndBS.HoTen AS Ten
                """
                + FROM_SQL
                + DIEU_KIEN_HOAN_TAT
                + """
                  AND bs.MaBacSi IS NOT NULL
                  AND ndBS.MaNguoiDung IS NOT NULL
                  ORDER BY Ten, Ma
                  """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new BoLocDTO(
                        rs.getInt("Ma"),
                        rs.getString("Ten")
                )
        );
    }

    private List<BoLocDTO> getDanhSachKhoa() {
        String sql = """
                SELECT DISTINCT
                    l.MaKhoa AS Ma,
                    k.TenKhoa AS Ten
                """
                + FROM_SQL
                + DIEU_KIEN_HOAN_TAT
                + """
                  AND k.MaKhoa IS NOT NULL
                  ORDER BY Ten, Ma
                  """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new BoLocDTO(
                        rs.getInt("Ma"),
                        rs.getString("Ten")
                )
        );
    }

    private LichSuItemDTO mapLichSuItem(
            ResultSet rs,
            int rowNum
    ) throws SQLException {
        LichSuItemDTO item = new LichSuItemDTO();

        item.setMaLichKham(getInteger(rs, "MaLichKham"));
        item.setMaBenhNhan(getInteger(rs, "MaBenhNhan"));
        item.setMaHoSoBenhAn(getInteger(rs, "MaHoSoBenhAn"));
        item.setMaBacSi(getInteger(rs, "MaBacSi"));
        item.setMaKhoa(getInteger(rs, "MaKhoa"));
        item.setSoThuTu(getInteger(rs, "SoThuTu"));

        item.setTenBenhNhan(rs.getString("TenBenhNhan"));
        item.setNgaySinh(getNgay(rs, "NgaySinh"));
        item.setGioiTinh(rs.getString("GioiTinh"));
        item.setSoDienThoai(rs.getString("SoDienThoai"));

        item.setNgayKham(getNgay(rs, "NgayKham"));

        Time gioKham = rs.getTime("GioKham");
        item.setGioKham(
                gioKham != null
                        ? gioKham.toLocalTime().format(GIO_HIEN_THI)
                        : null
        );

        item.setTenKhoa(rs.getString("TenKhoa"));
        item.setTenBacSi(rs.getString("TenBacSi"));
        item.setTenPhong(rs.getString("TenPhong"));

        item.setTrangThaiLichKham(
                rs.getString("TrangThaiLichKham")
        );

        item.setTrangThaiHoSo(
                rs.getString("TrangThaiHoSo")
        );

        return item;
    }

    private Integer getInteger(
            ResultSet rs,
            String tenCot
    ) throws SQLException {
        int giaTri = rs.getInt(tenCot);
        return rs.wasNull() ? null : giaTri;
    }

    private String getNgay(
            ResultSet rs,
            String tenCot
    ) throws SQLException {
        Date ngay = rs.getDate(tenCot);

        return ngay != null
                ? ngay.toLocalDate().toString()
                : null;
    }
}