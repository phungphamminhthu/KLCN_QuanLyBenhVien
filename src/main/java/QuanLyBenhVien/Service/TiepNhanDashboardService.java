package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanDashboardDTO;
import QuanLyBenhVien.Service.TiepNhanPhanCongService.CaTrucHienTai;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TiepNhanDashboardService {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    /*
     * Kiểm tra lại phân công ngay trong câu lệnh cập nhật.
     *
     * Thứ tự tham số:
     * 1. Mã phân công
     * 2. Mã nhân viên
     * 3. Thời điểm kiểm tra bắt đầu ca
     * 4. Thời điểm kiểm tra kết thúc ca
     */
    private static final String DIEU_KIEN_CA_TRUC = """
              AND EXISTS (
                  SELECT 1
                  FROM phancongtiepnhan pc
                  WHERE pc.MaPhanCong = ?
                    AND pc.MaNhanVienTiepNhan = ?
                    AND pc.MaKhoa = lichdangkykham.MaKhoa
                    AND pc.TrangThai = 1
                    AND pc.ThoiGianBatDau <= ?
                    AND pc.ThoiGianKetThuc > ?
              )
            """;

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanPhanCongService phanCongService;

    public TiepNhanDashboardService(
            JdbcTemplate jdbcTemplate,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.phanCongService = phanCongService;
    }

    /*
     * Lấy tài khoản từ Spring Security.
     * Không nhận mã nhân viên hoặc khoa do giao diện gửi lên.
     */
    private CaTrucHienTai layCaTrucHienTai() {
        return phanCongService.layCaTrucHienTai(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );
    }

    private CaTrucHienTai layCaTrucChoLichKham(
            Integer maLichKham
    ) {
        return phanCongService.kiemTraQuyenVoiLichKham(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication(),
                maLichKham
        );
    }

    // =========================================================
    // THỐNG KÊ DASHBOARD THEO KHOA ĐANG ĐƯỢC PHÂN CÔNG
    // =========================================================

    @Transactional(readOnly = true)
    public TiepNhanDashboardDTO getDashboardData() {
        CaTrucHienTai caTruc = layCaTrucHienTai();

        Integer maKhoa = caTruc.maKhoa();
        LocalDate homNay = LocalDate.now(MUI_GIO);

        TiepNhanDashboardDTO dto =
                new TiepNhanDashboardDTO();

        String sqlTongBenhNhan = """
                SELECT COUNT(DISTINCT MaBenhNhan)
                FROM lichdangkykham
                WHERE NgayKham = ?
                  AND MaKhoa = ?
                  AND TrangThai NOT IN ('DaHuy', 'KhongDen')
                """;

        dto.setTongBnHienTai(
                demSoLuong(sqlTongBenhNhan, homNay, maKhoa)
        );

        String sqlLichHen = """
                SELECT COUNT(*)
                FROM lichdangkykham
                WHERE NgayKham = ?
                  AND MaKhoa = ?
                """;

        dto.setLichHenHomNay(
                demSoLuong(sqlLichHen, homNay, maKhoa)
        );

        String sqlDangCho = """
                SELECT COUNT(*)
                FROM lichdangkykham
                WHERE NgayKham = ?
                  AND MaKhoa = ?
                  AND TrangThai IN (
                      'ChoGoi',
                      'DaGoi',
                      'DaTiepNhan',
                      'ChoKham'
                  )
                """;

        dto.setBnDangCho(
                demSoLuong(sqlDangCho, homNay, maKhoa)
        );

        String sqlDangKham = """
                SELECT COUNT(*)
                FROM lichdangkykham
                WHERE NgayKham = ?
                  AND MaKhoa = ?
                  AND TrangThai = 'DangKham'
                """;

        dto.setDangTrongPhongKham(
                demSoLuong(sqlDangKham, homNay, maKhoa)
        );

        dto.setHangDoiKham(
                layDanhSachTrongNgay(homNay, maKhoa)
        );

        return dto;
    }

    private long demSoLuong(
            String sql,
            LocalDate ngay,
            Integer maKhoa
    ) {
        Long ketQua = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                ngay,
                maKhoa
        );

        return ketQua != null ? ketQua : 0L;
    }

    // =========================================================
    // DANH SÁCH LỊCH KHÁM CỦA KHOA TRONG NGÀY
    // =========================================================

    private List<TiepNhanDashboardDTO.HangDoiItemDTO>
    layDanhSachTrongNgay(
            LocalDate ngay,
            Integer maKhoa
    ) {
        String sql = """
                SELECT
                    l.MaLichKham,
                    l.MaBenhNhan,
                    l.MaKhoa,
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
                        ORDER BY
                            lv.GioBatDau DESC,
                            lv.MaLichLamViec DESC
                        LIMIT 1
                    ) AS TenPhong,
                    (
                       SELECT p.ViTri
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
                    ) AS ViTriPhong,

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
                 AND s.MaKhoa = l.MaKhoa
                 AND s.NgayCapSo = l.NgayKham

                WHERE l.NgayKham = ?
                  AND l.MaKhoa = ?

                ORDER BY
                    CASE l.TrangThai
                        WHEN 'DaGoi' THEN 0
                        WHEN 'ChoGoi' THEN 1
                        WHEN 'DaTiepNhan' THEN 2
                        WHEN 'ChoKham' THEN 3
                        WHEN 'DangKham' THEN 4
                        WHEN 'ChoThanhToan' THEN 5
                        WHEN 'ChoCLS' THEN 6
                        WHEN 'DangCLS' THEN 7
                        WHEN 'ChoLayThuoc' THEN 8
                        WHEN 'DangLayThuoc' THEN 9
                        WHEN 'HoanTat' THEN 10
                        WHEN 'DaHuy' THEN 11
                        WHEN 'KhongDen' THEN 12
                        ELSE 13
                    END,
                    l.GioKham,
                    l.MaBacSi,
                    s.SoThuTu,
                    l.MaLichKham
                """;

        List<Map<String, Object>> rows =
                jdbcTemplate.queryForList(
                        sql,
                        ngay,
                        maKhoa
                );

        List<TiepNhanDashboardDTO.HangDoiItemDTO> danhSach =
                new ArrayList<>();

        for (Map<String, Object> row : rows) {
            TiepNhanDashboardDTO.HangDoiItemDTO item =
                    new TiepNhanDashboardDTO.HangDoiItemDTO();

            item.setMaLichKham(
                    ((Number) row.get("MaLichKham")).intValue()
            );

            item.setMaBenhNhan(
                    ((Number) row.get("MaBenhNhan")).intValue()
            );

            item.setMaBn(
                    String.valueOf(item.getMaBenhNhan())
            );

            /*
             * Lấy số thực tế trong sothutu.SoThuTu.
             * Không đánh lại số và không dùng khóa MaSoThuTu.
             */
            item.setStt(
                    taoSoThuTuHienThi(row.get("SoThuTu"))
            );

            item.setTenBenhNhan(
                    layChuoi(
                            row,
                            "TenBenhNhan",
                            "Chưa có tên"
                    )
            );

            item.setThongTinPhu(
                    layChuoi(
                            row,
                            "NamSinh",
                            "Chưa có năm sinh"
                    )
                            + " • "
                            + layChuoi(
                            row,
                            "GioiTinh",
                            "Chưa có giới tính"
                    )
            );

            item.setKhoa(
                    layChuoi(
                            row,
                            "TenKhoa",
                            "Chưa có khoa"
                    )
            );

            item.setBacSi(
                    layChuoi(
                            row,
                            "TenBacSi",
                            "Chưa có bác sĩ"
                    )
            );

            item.setPhong(
                    layChuoi(
                            row,
                            "TenPhong",
                            "Chưa phân công"
                    )
            );

            item.setViTriPhong(
                    layChuoi(row, "ViTriPhong", "Chưa cập nhật")
            );

            String gioKham =
                    layChuoi(row, "GioKham", "--:--");

            item.setGioHen(
                    gioKham.length() >= 5
                            ? gioKham.substring(0, 5)
                            : gioKham
            );

            item.setThoiGianCho("—");

            // Trạng thái toàn lượt khám lấy từ lichdangkykham.
            item.setTrangThai(
                    hienThiTrangThai(
                            layChuoi(row, "TrangThai", "")
                    )
            );

            danhSach.add(item);
        }

        return danhSach;
    }

    // =========================================================
    // SỐ THỨ TỰ: 001, 002, 003...
    // =========================================================

    private String taoSoThuTuHienThi(
            Object giaTriSoThuTu
    ) {
        if (!(giaTriSoThuTu instanceof Number soThuTu)
                || soThuTu.intValue() <= 0) {
            return "Chưa có số";
        }

        return String.format(
                Locale.ROOT,
                "%03d",
                soThuTu.intValue()
        );
    }

    // =========================================================
    // HÀM HỖ TRỢ
    // =========================================================

    private String layChuoi(
            Map<String, Object> row,
            String tenCot,
            String macDinh
    ) {
        Object giaTri = row.get(tenCot);

        if (giaTri == null || giaTri.toString().isBlank()) {
            return macDinh;
        }

        return giaTri.toString();
    }

    private Integer docMaLichKham(String maLichKham) {
        if (maLichKham == null || maLichKham.isBlank()) {
            return null;
        }

        try {
            int id = Integer.parseInt(maLichKham.trim());
            return id > 0 ? id : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String hienThiTrangThai(String trangThai) {
        return switch (trangThai) {
            case "ChoGoi" -> "Chờ gọi";
            case "DaGoi" -> "Đã gọi";
            case "DaTiepNhan" -> "Đã tiếp nhận";
            case "ChoKham" -> "Chờ khám";
            case "DangKham" -> "Đang khám";
            case "ChoThanhToan" -> "Chờ thanh toán";
            case "ChoCLS" -> "Chờ CLS";
            case "DangCLS" -> "Đang CLS";
            case "ChoLayThuoc" -> "Chờ lấy thuốc";
            case "DangLayThuoc" -> "Đang lấy thuốc";
            case "HoanTat" -> "Hoàn tất";
            case "DaHuy" -> "Đã hủy";
            case "KhongDen" -> "Không đến";
            default -> trangThai.isBlank()
                    ? "Chưa xác định"
                    : trangThai;
        };
    }

    // =========================================================
    // GỌI BỆNH NHÂN
    // ChoGoi -> DaGoi; cho phép gọi lại khi đang DaGoi.
    // =========================================================

    @Transactional
    public boolean updateTrangThaiHangDoi(
            String maLichKham,
            String trangThaiMoi
    ) {
        if (!"DaGoi".equals(trangThaiMoi)) {
            return false;
        }

        Integer id = docMaLichKham(maLichKham);

        if (id == null) {
            return false;
        }

        CaTrucHienTai caTruc =
                layCaTrucChoLichKham(id);

        LocalDateTime hienTai =
                LocalDateTime.now(MUI_GIO);

        LocalDate homNay =
                hienTai.toLocalDate();

        String sql = """
                UPDATE lichdangkykham
                SET TrangThai = 'DaGoi'
                WHERE MaLichKham = ?
                  AND NgayKham = ?
                  AND MaKhoa = ?
                  AND TrangThai IN ('ChoGoi', 'DaGoi')
                """ + DIEU_KIEN_CA_TRUC;

        int soDongCapNhat = jdbcTemplate.update(
                sql,
                id,
                homNay,
                caTruc.maKhoa(),
                caTruc.maPhanCong(),
                caTruc.maNhanVienTiepNhan(),
                hienTai,
                hienTai
        );

        if (soDongCapNhat > 0) {
            return true;
        }

        /*
         * Một số cấu hình JDBC trả về 0 khi gọi lại
         * vì giá trị DaGoi không thay đổi.
         */
        String sqlKiemTra = """
                SELECT MaLichKham
                FROM lichdangkykham
                WHERE MaLichKham = ?
                  AND NgayKham = ?
                  AND MaKhoa = ?
                  AND TrangThai = 'DaGoi'
                """
                + DIEU_KIEN_CA_TRUC
                + " FOR UPDATE";

        List<Integer> lichDaGoi = jdbcTemplate.query(
                sqlKiemTra,
                (rs, rowNum) -> rs.getInt("MaLichKham"),
                id,
                homNay,
                caTruc.maKhoa(),
                caTruc.maPhanCong(),
                caTruc.maNhanVienTiepNhan(),
                hienTai,
                hienTai
        );

        return !lichDaGoi.isEmpty();
    }

    // =========================================================
    // XÁC NHẬN TIẾP NHẬN VÀ LƯU NHÂN VIÊN THỰC HIỆN
    // Cùng một transaction: lỗi thì hoàn tác toàn bộ.
    // =========================================================

    @Transactional
    public boolean xacNhanTiepNhan(String maLichKham) {
        Integer id = docMaLichKham(maLichKham);

        if (id == null) {
            return false;
        }

        CaTrucHienTai caTruc =
                layCaTrucChoLichKham(id);

        LocalDateTime hienTai =
                LocalDateTime.now(MUI_GIO);

        String sqlCapNhat = """
                UPDATE lichdangkykham
                SET TrangThai = 'DaTiepNhan'
                WHERE MaLichKham = ?
                  AND NgayKham = ?
                  AND MaKhoa = ?
                  AND TrangThai = 'DaGoi'
                  AND EXISTS (
                     SELECT 1
                     FROM hosobenhan h
                     WHERE h.MaLichKham = lichdangkykham.MaLichKham
                     AND h.CanNang > 0
                     AND h.ChieuCao > 0
                     AND h.HuyetApTamThu > 0
                     AND h.HuyetApTamTruong > 0
                     AND h.HuyetApTamThu > h.HuyetApTamTruong
                  )
                """ + DIEU_KIEN_CA_TRUC;

        int soDongCapNhat = jdbcTemplate.update(
                sqlCapNhat,
                id,
                hienTai.toLocalDate(),
                caTruc.maKhoa(),
                caTruc.maPhanCong(),
                caTruc.maNhanVienTiepNhan(),
                hienTai,
                hienTai
        );

        if (soDongCapNhat == 0) {
            return false;
        }

        /*
         * UPDATE phía trên giữ khóa lịch khám trong transaction.
         *
         * Không gán nhân viên hiện tại vào bản ghi tiếp nhận cũ.
         * Chỉ thêm bản ghi mới khi lịch chưa có thông tin tiếp nhận.
         */
        String sqlGhiNhan = """
                INSERT INTO tiepnhanbenhnhan (
                    MaLichKham,
                    MaNhanVienTiepNhan,
                    MaPhanCong,
                    ThoiGianTiepNhan,
                    TrangThai
                )
                SELECT
                    ?,
                    ?,
                    ?,
                    ?,
                    'DaTiepNhan'
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM tiepnhanbenhnhan
                    WHERE MaLichKham = ?
                )
                """;

        int soDongGhiNhan = jdbcTemplate.update(
                sqlGhiNhan,
                id,
                caTruc.maNhanVienTiepNhan(),
                caTruc.maPhanCong(),
                hienTai,
                id
        );

        if (soDongGhiNhan != 1) {
            // Ném lỗi để hoàn tác cả cập nhật trạng thái.
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Lịch khám đã có bản ghi tiếp nhận. "
                            + "Vui lòng làm mới để kiểm tra, "
                            + "không xác nhận lại."
            );
        }

        return true;
    }
}