package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanLichSuKhamDTO;
import QuanLyBenhVien.DTO.TiepNhanLichSuKhamDTO.BoLocDTO;
import QuanLyBenhVien.DTO.TiepNhanLichSuKhamDTO.LichSuItemDTO;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Time;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class TiepNhanLichSuKhamService {

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanPhanCongService phanCongService;

    private static final ZoneId MUI_GIO_VIET_NAM =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private static final DateTimeFormatter GIO_HIEN_THI =
            DateTimeFormatter.ofPattern("HH:mm");

    private static final Set<String> TRANG_THAI_HOP_LE = Set.of(
            "ChoGoi",
            "DaGoi",
            "DaTiepNhan",
            "ChoKham",
            "DangKham",
            "ChoThanhToan",
            "ChoCLS",
            "DangCLS",
            "ChoLayThuoc",
            "DangLayThuoc",
            "HoanTat",
            "DaHuy",
            "KhongDen"
    );

    /*
     * LEFT JOIN hồ sơ bệnh án để giữ cả lịch:
     * - Chưa tiếp nhận.
     * - Chưa có bệnh án.
     * - Đang khám dở.
     * - Đã hủy hoặc không đến.
     */
    private static final String FROM_SQL = """
            FROM lichdangkykham l

            LEFT JOIN hosobenhan h
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

    public TiepNhanLichSuKhamService(
            JdbcTemplate jdbcTemplate,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.phanCongService = phanCongService;
    }

    // =====================================================
    // DANH SÁCH LỊCH KHÁM THEO KHOA ĐƯỢC PHÂN CÔNG
    // =====================================================

    @Transactional(
            readOnly = true,
            isolation = Isolation.REPEATABLE_READ
    )
    public TiepNhanLichSuKhamDTO getDanhSachLichSuKham(
            String tuKhoa,
            Integer maBacSi,
            String trangThai,
            LocalDate tuNgay,
            LocalDate denNgay,
            int trang,
            int kichThuocTrang,
            Authentication authentication
    ) {
        /*
         * Khoa được xác định từ tài khoản và ca trực
         * trong database, không nhận từ trình duyệt.
         */
        var caTruc = phanCongService.layCaTrucHienTai(
                authentication
        );

        Integer maKhoa = caTruc.maKhoa();

        LocalDate ngayBatDau;

        if (tuNgay != null) {
            ngayBatDau = tuNgay;
        } else if (denNgay != null) {
            ngayBatDau = denNgay;
        } else {
            ngayBatDau = LocalDate.now(MUI_GIO_VIET_NAM);
        }

        LocalDate ngayKetThuc = denNgay != null
                ? denNgay
                : ngayBatDau;

        String trangThaiLoc = trangThai == null
                ? ""
                : trangThai.trim();

        kiemTraBoLoc(
                tuKhoa,
                maBacSi,
                trangThaiLoc,
                ngayBatDau,
                ngayKetThuc,
                trang,
                kichThuocTrang
        );

        // Điều kiện khoa luôn bắt buộc.
        StringBuilder dieuKien =
                new StringBuilder(" WHERE l.MaKhoa = ? ");

        List<Object> thamSo = new ArrayList<>();

        thamSo.add(maKhoa);

        dieuKien.append(
                " AND l.NgayKham >= ? AND l.NgayKham <= ? "
        );

        thamSo.add(Date.valueOf(ngayBatDau));
        thamSo.add(Date.valueOf(ngayKetThuc));

        themDieuKienTimKiem(
                dieuKien,
                thamSo,
                tuKhoa
        );

        if (maBacSi != null) {
            dieuKien.append(" AND l.MaBacSi = ? ");
            thamSo.add(maBacSi);
        }

        if (!trangThaiLoc.isEmpty()) {
            dieuKien.append(" AND l.TrangThai = ? ");
            thamSo.add(trangThaiLoc);
        }

        // Đếm sau khi áp dụng đầy đủ các bộ lọc.
        String sqlDem = "SELECT COUNT(*) "
                + FROM_SQL
                + dieuKien;

        Long ketQuaDem = jdbcTemplate.queryForObject(
                sqlDem,
                Long.class,
                thamSo.toArray()
        );

        long tongLichKham =
                ketQuaDem != null ? ketQuaDem : 0;

        long tongSoTrang = tongLichKham == 0
                ? 1
                : 1 + (tongLichKham - 1) / kichThuocTrang;

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

        List<Object> thamSoDanhSach =
                new ArrayList<>(thamSo);

        thamSoDanhSach.add(kichThuocTrang);
        thamSoDanhSach.add(viTriBatDau);

        List<LichSuItemDTO> danhSach = jdbcTemplate.query(
                sqlDanhSach,
                this::mapLichSuItem,
                thamSoDanhSach.toArray()
        );

        TiepNhanLichSuKhamDTO dto =
                new TiepNhanLichSuKhamDTO();

        dto.setDanhSach(danhSach);
        dto.setTrangHienTai(trangHienTai);
        dto.setKichThuocTrang(kichThuocTrang);
        dto.setTongLichKham(tongLichKham);
        dto.setTongSoTrang(tongSoTrang);

        // Bộ lọc bác sĩ chỉ chứa dữ liệu trong khoa được phép xem.
        dto.setDanhSachBacSi(
                getDanhSachBacSi(maKhoa)
        );

        /*
         * Giữ cấu trúc DTO cũ.
         * Chỉ trả đúng một khoa được phân công.
         * Giao diện mới không hiển thị ô lọc khoa.
         */
        dto.setDanhSachKhoa(
                List.of(
                        new BoLocDTO(
                                maKhoa,
                                caTruc.tenKhoa()
                        )
                )
        );

        return dto;
    }

    // =====================================================
    // KIỂM TRA BỘ LỌC
    // =====================================================

    private void kiemTraBoLoc(
            String tuKhoa,
            Integer maBacSi,
            String trangThai,
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

        if (!trangThai.isEmpty()
                && !TRANG_THAI_HOP_LE.contains(trangThai)) {

            throw new IllegalArgumentException(
                    "Trạng thái lịch khám không hợp lệ."
            );
        }

        kiemTraNgay(tuNgay);
        kiemTraNgay(denNgay);

        if (tuNgay.isAfter(denNgay)) {
            throw new IllegalArgumentException(
                    "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            );
        }

        if (trang < 1) {
            throw new IllegalArgumentException(
                    "Số trang phải lớn hơn hoặc bằng 1."
            );
        }

        if (kichThuocTrang != 10
                && kichThuocTrang != 20
                && kichThuocTrang != 50) {

            throw new IllegalArgumentException(
                    "Số dòng mỗi trang phải là 10, 20 hoặc 50."
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

    // =====================================================
    // TÌM KIẾM
    // =====================================================

    private void themDieuKienTimKiem(
            StringBuilder dieuKien,
            List<Object> thamSo,
            String tuKhoa
    ) {
        if (tuKhoa == null || tuKhoa.isBlank()) {
            return;
        }

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

    // =====================================================
    // BÁC SĨ CÓ LỊCH KHÁM TRONG KHOA ĐƯỢC PHÂN CÔNG
    // =====================================================

    private List<BoLocDTO> getDanhSachBacSi(
            Integer maKhoa
    ) {
        String sql = """
                SELECT DISTINCT
                    l.MaBacSi AS Ma,
                    ndBS.HoTen AS Ten
                """
                + FROM_SQL
                + """
                  WHERE l.MaKhoa = ?
                    AND bs.MaBacSi IS NOT NULL
                    AND ndBS.MaNguoiDung IS NOT NULL

                  ORDER BY Ten, Ma
                  """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new BoLocDTO(
                        rs.getInt("Ma"),
                        rs.getString("Ten")
                ),
                maKhoa
        );
    }

    // =====================================================
    // CHUYỂN DỮ LIỆU SANG DTO
    // =====================================================

    private LichSuItemDTO mapLichSuItem(
            ResultSet rs,
            int rowNum
    ) throws SQLException {
        LichSuItemDTO item = new LichSuItemDTO();

        item.setMaLichKham(
                getInteger(rs, "MaLichKham")
        );

        item.setMaBenhNhan(
                getInteger(rs, "MaBenhNhan")
        );

        item.setMaHoSoBenhAn(
                getInteger(rs, "MaHoSoBenhAn")
        );

        item.setMaBacSi(
                getInteger(rs, "MaBacSi")
        );

        item.setMaKhoa(
                getInteger(rs, "MaKhoa")
        );

        item.setSoThuTu(
                getInteger(rs, "SoThuTu")
        );

        item.setTenBenhNhan(
                rs.getString("TenBenhNhan")
        );

        item.setNgaySinh(
                getNgay(rs, "NgaySinh")
        );

        item.setGioiTinh(
                rs.getString("GioiTinh")
        );

        item.setSoDienThoai(
                rs.getString("SoDienThoai")
        );

        item.setNgayKham(
                getNgay(rs, "NgayKham")
        );

        Time gioKham = rs.getTime("GioKham");

        item.setGioKham(
                gioKham != null
                        ? gioKham.toLocalTime()
                        .format(GIO_HIEN_THI)
                        : null
        );

        item.setTenKhoa(
                rs.getString("TenKhoa")
        );

        item.setTenBacSi(
                rs.getString("TenBacSi")
        );

        item.setTenPhong(
                rs.getString("TenPhong")
        );

        // Trạng thái lịch khám là nguồn hiển thị chính.
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