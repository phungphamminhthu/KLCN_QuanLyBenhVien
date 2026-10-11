package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanDashboardDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class TiepNhanDashboardService {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbcTemplate;

    public TiepNhanDashboardService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // =========================================================
    // DASHBOARD CỦA TẤT CẢ BÁC SĨ TRONG HÔM NAY
    // =========================================================

    public TiepNhanDashboardDTO getDashboardData() {

        LocalDate homNay = LocalDate.now(MUI_GIO);

        TiepNhanDashboardDTO dto =
                new TiepNhanDashboardDTO();

        // 1. Tổng bệnh nhân trong ngày, không tính hủy/không đến.
        String sqlTongBenhNhan = """
                SELECT COUNT(DISTINCT MaBenhNhan)
                FROM lichdangkykham
                WHERE NgayKham = ?
                  AND TrangThai NOT IN ('DaHuy', 'KhongDen')
                """;

        dto.setTongBnHienTai(
                demSoLuong(sqlTongBenhNhan, homNay)
        );

        // 2. Tổng lịch hẹn trong ngày.
        String sqlLichHen = """
                SELECT COUNT(*)
                FROM lichdangkykham
                WHERE NgayKham = ?
                """;

        dto.setLichHenHomNay(
                demSoLuong(sqlLichHen, homNay)
        );

        // 3. Số lượt đang chờ.
        // Loại trừ lượt đã có hồ sơ đang khám hoặc hoàn tất.
        String sqlDangCho = """
                SELECT COUNT(*)
                FROM lichdangkykham l
                WHERE l.NgayKham = ?
                  AND l.TrangThai IN (
                      'ChoKham',
                      'DaDat',
                      'DaXacNhan',
                      'DaGoi',
                      'DaTiepNhan'
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM hosobenhan h
                      WHERE h.MaLichKham = l.MaLichKham
                        AND h.TrangThai IN (
                            'DangKham',
                            'HoanTat'
                        )
                  )
                """;

        dto.setBnDangCho(
                demSoLuong(sqlDangCho, homNay)
        );

        // 4. Số lượt đang trong phòng khám.
        String sqlDangKham = """
                SELECT COUNT(*)
                FROM lichdangkykham l
                WHERE l.NgayKham = ?
                  AND l.TrangThai NOT IN ('DaHuy', 'KhongDen')
                  AND (
                      l.TrangThai = 'DangKham'
                      OR EXISTS (
                          SELECT 1
                          FROM hosobenhan h
                          WHERE h.MaLichKham = l.MaLichKham
                            AND h.TrangThai = 'DangKham'
                      )
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM hosobenhan h
                      WHERE h.MaLichKham = l.MaLichKham
                        AND h.TrangThai = 'HoanTat'
                  )
                """;

        dto.setDangTrongPhongKham(
                demSoLuong(sqlDangKham, homNay)
        );

        dto.setHangDoiKham(
                layDanhSachTrongNgay(homNay)
        );

        return dto;
    }

    // =========================================================
    // HÀM ĐẾM DỮ LIỆU
    // =========================================================

    private long demSoLuong(
            String sql,
            LocalDate ngay
    ) {

        Long ketQua = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                ngay
        );

        return ketQua != null ? ketQua : 0L;
    }

    // =========================================================
    // DANH SÁCH LỊCH KHÁM TRONG NGÀY
    // =========================================================

    private List<TiepNhanDashboardDTO.HangDoiItemDTO>
    layDanhSachTrongNgay(LocalDate ngay) {

        String sql = """
                SELECT
                    l.MaLichKham,
                    l.MaBenhNhan,
                    l.GioKham,
                    l.TrangThai,

                    s.SoThuTu,

                    nd.HoTen AS TenBenhNhan,
                    bn.GioiTinh,
                    YEAR(bn.NgaySinh) AS NamSinh,

                    k.TenKhoa,
                    ndBacSi.HoTen AS TenBacSi,

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

                    EXISTS (
                        SELECT 1
                        FROM hosobenhan h
                        WHERE h.MaLichKham = l.MaLichKham
                          AND h.TrangThai = 'DangKham'
                    ) AS CoHoSoDangKham,

                    EXISTS (
                        SELECT 1
                        FROM hosobenhan h
                        WHERE h.MaLichKham = l.MaLichKham
                          AND h.TrangThai = 'HoanTat'
                    ) AS CoHoSoHoanTat

                FROM lichdangkykham l

                JOIN benhnhan bn
                  ON bn.MaBenhNhan = l.MaBenhNhan

                JOIN nguoidung nd
                  ON nd.MaNguoiDung = bn.MaNguoiDung

                JOIN khoa k
                  ON k.MaKhoa = l.MaKhoa

                JOIN bacsi bs
                  ON bs.MaBacSi = l.MaBacSi

                JOIN nguoidung ndBacSi
                  ON ndBacSi.MaNguoiDung = bs.MaNguoiDung

                LEFT JOIN sothutu s
                  ON s.MaSoThuTu = l.MaSoThuTu

                WHERE l.NgayKham = ?

                ORDER BY
                    l.GioKham,
                    l.MaBacSi,
                    s.SoThuTu,
                    l.MaLichKham
                """;

        List<Map<String, Object>> rows =
                jdbcTemplate.queryForList(sql, ngay);

        List<TiepNhanDashboardDTO.HangDoiItemDTO>
                danhSach = new ArrayList<>();

        for (Map<String, Object> row : rows) {

            TiepNhanDashboardDTO.HangDoiItemDTO item =
                    new TiepNhanDashboardDTO.HangDoiItemDTO();

            // Mã thật dùng khi gọi API.
            item.setMaLichKham(
                    ((Number) row.get("MaLichKham")).intValue()
            );

            item.setMaBenhNhan(
                    ((Number) row.get("MaBenhNhan")).intValue()
            );

            item.setMaBn(
                    String.valueOf(item.getMaBenhNhan())
            );

            Object soThuTu = row.get("SoThuTu");

            item.setStt(
                    soThuTu instanceof Number
                            ? String.format(
                            "#%03d",
                            ((Number) soThuTu).intValue()
                    )
                            : "Chưa có số"
            );

            item.setTenBenhNhan(
                    layChuoi(row, "TenBenhNhan", "Chưa có tên")
            );

            item.setThongTinPhu(
                    layChuoi(row, "NamSinh", "Chưa có năm sinh")
                            + " • "
                            + layChuoi(
                            row,
                            "GioiTinh",
                            "Chưa có giới tính"
                    )
            );

            item.setKhoa(
                    layChuoi(row, "TenKhoa", "Chưa có khoa")
            );

            item.setBacSi(
                    layChuoi(row, "TenBacSi", "Chưa có bác sĩ")
            );

            item.setPhong(
                    layChuoi(row, "TenPhong", "Chưa phân công")
            );

            String gioKham =
                    layChuoi(row, "GioKham", "--:--");

            item.setGioHen(
                    gioKham.length() >= 5
                            ? gioKham.substring(0, 5)
                            : gioKham
            );

            // Chưa có thời điểm bắt đầu chờ để tính số phút.
            item.setThoiGianCho("—");

            String trangThai =
                    layChuoi(row, "TrangThai", "");

            // Trạng thái hồ sơ được ưu tiên,
            // nhưng giữ nguyên lượt đã hủy hoặc không đến.
            if (!"DaHuy".equals(trangThai)
                    && !"KhongDen".equals(trangThai)) {

                if (laDung(row.get("CoHoSoHoanTat"))) {
                    trangThai = "HoanTat";
                } else if (laDung(row.get("CoHoSoDangKham"))) {
                    trangThai = "DangKham";
                }
            }

            item.setTrangThai(
                    hienThiTrangThai(trangThai)
            );

            danhSach.add(item);
        }

        return danhSach;
    }

    // =========================================================
    // HÀM HỖ TRỢ ĐỌC DỮ LIỆU
    // =========================================================

    private String layChuoi(
            Map<String, Object> row,
            String tenCot,
            String macDinh
    ) {

        Object giaTri = row.get(tenCot);

        if (giaTri == null
                || giaTri.toString().isBlank()) {
            return macDinh;
        }

        return giaTri.toString();
    }

    private boolean laDung(Object giaTri) {

        if (giaTri instanceof Boolean) {
            return (Boolean) giaTri;
        }

        if (giaTri instanceof Number) {
            return ((Number) giaTri).intValue() != 0;
        }

        return "1".equals(String.valueOf(giaTri));
    }

    // =========================================================
    // NHÃN TRẠNG THÁI HIỂN THỊ
    // =========================================================

    private String hienThiTrangThai(String trangThai) {

        return switch (trangThai) {

            case "ChoKham", "DaDat" -> "Chờ gọi";

            case "DaXacNhan" -> "Lịch đã xác nhận";

            case "DaGoi" -> "Đã gọi";

            case "DaTiepNhan" -> "Đã tiếp nhận";

            case "DangKham" -> "Đang khám";

            case "HoanTat", "HoanThanh", "DaKham" ->
                    "Hoàn tất";

            case "DaHuy" -> "Đã hủy";

            case "KhongDen" -> "Không đến";

            default -> trangThai.isBlank()
                    ? "Chưa xác định"
                    : trangThai;
        };
    }

    // =========================================================
    // GỌI BỆNH NHÂN
    // Giữ chữ ký hàm để tương thích với Controller hiện tại.
    // Xác nhận tiếp nhận và bắt đầu khám thuộc về bác sĩ.
    // =========================================================

    public boolean updateTrangThaiHangDoi(
            String maLichKham,
            String trangThaiMoi
    ) {

        if (!"DaGoi".equals(trangThaiMoi)
                || maLichKham == null) {
            return false;
        }

        int id;

        try {
            id = Integer.parseInt(maLichKham.trim());
        } catch (NumberFormatException e) {
            return false;
        }

        if (id <= 0) {
            return false;
        }

        String sql = """
                UPDATE lichdangkykham l
                SET TrangThai = 'DaGoi'
                WHERE l.MaLichKham = ?
                  AND l.NgayKham = ?
                  AND l.TrangThai IN (
                      'ChoKham',
                      'DaDat',
                      'DaXacNhan',
                      'DaGoi'
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM hosobenhan h
                      WHERE h.MaLichKham = l.MaLichKham
                        AND h.TrangThai IN (
                            'DangKham',
                            'HoanTat'
                        )
                  )
                """;

        int soDongCapNhat = jdbcTemplate.update(
                sql,
                id,
                LocalDate.now(MUI_GIO)
        );

        return soDongCapNhat > 0;
    }
}