package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.ChiSoTruocKhamDTO;
import QuanLyBenhVien.Service.TiepNhanPhanCongService.CaTrucHienTai;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class ChiSoTruocKhamService {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private static final BigDecimal GIA_TRI_THAP_PHAN_TOI_DA =
            new BigDecimal("999.99");

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanPhanCongService phanCongService;

    public ChiSoTruocKhamService(
            JdbcTemplate jdbcTemplate,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.phanCongService = phanCongService;
    }

    /*
     * Xác định nhân viên từ tài khoản đăng nhập.
     * Kiểm tra lịch khám thuộc khoa đang được phân công.
     */
    private CaTrucHienTai kiemTraQuyen(
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
    // XEM SỐ ĐO ĐÃ LƯU
    // Có thể xem lịch cũ thuộc khoa đang phụ trách.
    // =========================================================

    @Transactional(readOnly = true)
    public ChiSoTruocKhamDTO getChiSo(
            Integer maLichKham
    ) {
        kiemTraMaLichKham(maLichKham);

        CaTrucHienTai caTruc =
                kiemTraQuyen(maLichKham);

//        String sql = """
//                SELECT
//                    MaLichKham,
//                    CanNang,
//                    ChieuCao,
//                    HuyetApTamThu,
//                    HuyetApTamTruong
//                FROM lichdangkykham
//                WHERE MaLichKham = ?
//                  AND MaKhoa = ?
//                """;
        String sql = """
        SELECT
            lk.MaLichKham,
            h.CanNang,
            h.ChieuCao,
            h.HuyetApTamThu,
            h.HuyetApTamTruong
        FROM lichdangkykham lk
        LEFT JOIN hosobenhan h
          ON h.MaLichKham = lk.MaLichKham
        WHERE lk.MaLichKham = ?
          AND lk.MaKhoa = ?
        """;

        List<ChiSoTruocKhamDTO> ketQua =
                jdbcTemplate.query(
                        sql,
                        (rs, rowNum) -> {
                            ChiSoTruocKhamDTO dto =
                                    new ChiSoTruocKhamDTO();

                            dto.setMaLichKham(
                                    rs.getInt("MaLichKham")
                            );

                            dto.setCanNang(
                                    rs.getBigDecimal("CanNang")
                            );

                            dto.setChieuCao(
                                    rs.getBigDecimal("ChieuCao")
                            );

                            dto.setHuyetApTamThu(
                                    rs.getObject(
                                            "HuyetApTamThu",
                                            Integer.class
                                    )
                            );

                            dto.setHuyetApTamTruong(
                                    rs.getObject(
                                            "HuyetApTamTruong",
                                            Integer.class
                                    )
                            );

                            return dto;
                        },
                        maLichKham,
                        caTruc.maKhoa()
                );

        if (ketQua.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám trong khoa đang phụ trách."
            );
        }

        return ketQua.get(0);
    }

    // =========================================================
    // LƯU SỐ ĐO
    // Không thay đổi trạng thái hoặc tự xác nhận tiếp nhận.
    // =========================================================

//    @Transactional
//    public void luuChiSo(ChiSoTruocKhamDTO dto) {
//        kiemTraDuLieu(dto);
//
//        CaTrucHienTai caTruc =
//                kiemTraQuyen(dto.getMaLichKham());
//
//        /*
//         * Giữ khóa lịch khám trong thời gian kiểm tra và lưu.
//         */
//        String sqlLichKham = """
//                SELECT
//                    MaKhoa,
//                    NgayKham,
//                    TrangThai
//                FROM lichdangkykham
//                WHERE MaLichKham = ?
//                FOR UPDATE
//                """;
//
//        List<LichKhamKiemTra> ketQua =
//                jdbcTemplate.query(
//                        sqlLichKham,
//                        (rs, rowNum) -> new LichKhamKiemTra(
//                                rs.getInt("MaKhoa"),
//                                rs.getDate("NgayKham").toLocalDate(),
//                                rs.getString("TrangThai")
//                        ),
//                        dto.getMaLichKham()
//                );
//
//        if (ketQua.isEmpty()) {
//            throw new ResponseStatusException(
//                    HttpStatus.NOT_FOUND,
//                    "Không tìm thấy lịch khám."
//            );
//        }
//
//        /*
//         * Kiểm tra lại sau khi chờ khóa,
//         * vì có thể đã hết ca hoặc chuyển sang ca khác.
//         */
//        caTruc = kiemTraQuyen(dto.getMaLichKham());
//
//        LocalDateTime hienTai =
//                LocalDateTime.now(MUI_GIO);
//
//        LichKhamKiemTra lichKham =
//                ketQua.get(0);
//
//        if (!caTruc.maKhoa().equals(lichKham.maKhoa())) {
//            throw new ResponseStatusException(
//                    HttpStatus.FORBIDDEN,
//                    "Lịch khám không thuộc khoa đang phụ trách."
//            );
//        }
//
//        if (!hienTai.toLocalDate().equals(lichKham.ngayKham())) {
//            throw new ResponseStatusException(
//                    HttpStatus.CONFLICT,
//                    "Chỉ được ghi nhận số đo cho lịch khám hôm nay."
//            );
//        }
//
//        if (!"DaGoi".equals(lichKham.trangThai())) {
//            throw new ResponseStatusException(
//                    HttpStatus.CONFLICT,
//                    "Chỉ được sửa số đo khi lịch đang ở trạng thái Đã gọi. "
//                            + "Sau khi đã tiếp nhận, số đo chỉ được xem."
//            );
//        }
//
//        /*
//         * Giữ điều kiện bảo vệ khi bác sĩ đã mở hồ sơ khám.
//         */
//        Long soHoSo = jdbcTemplate.queryForObject(
//                """
//                SELECT COUNT(*)
//                FROM hosobenhan
//                WHERE MaLichKham = ?
//                """,
//                Long.class,
//                dto.getMaLichKham()
//        );
//
//        if (soHoSo != null && soHoSo > 0) {
//            throw new ResponseStatusException(
//                    HttpStatus.CONFLICT,
//                    "Bác sĩ đã mở hồ sơ khám. "
//                            + "Không thể sửa số đo trước khám."
//            );
//        }
//
//        /*
//         * Điều kiện được kiểm tra ngay trong UPDATE:
//         * - Đúng lịch, đúng khoa, đúng ngày.
//         * - Trạng thái DaGoi.
//         * - Ca trực còn hiệu lực.
//         * - Chưa có hồ sơ khám do bác sĩ mở.
//         */
//        String dieuKien = """
//                WHERE MaLichKham = ?
//                  AND MaKhoa = ?
//                  AND NgayKham = ?
//                  AND TrangThai = 'DaGoi'
//
//                  AND EXISTS (
//                      SELECT 1
//                      FROM phancongtiepnhan pc
//                      WHERE pc.MaPhanCong = ?
//                        AND pc.MaNhanVienTiepNhan = ?
//                        AND pc.MaKhoa = lichdangkykham.MaKhoa
//                        AND pc.TrangThai = 1
//                        AND pc.ThoiGianBatDau <= ?
//                        AND pc.ThoiGianKetThuc > ?
//                  )
//
//                  AND NOT EXISTS (
//                      SELECT 1
//                      FROM hosobenhan h
//                      WHERE h.MaLichKham = lichdangkykham.MaLichKham
//                  )
//                """;
//
//        String sqlCapNhat = """
//                UPDATE lichdangkykham
//                SET CanNang = ?,
//                    ChieuCao = ?,
//                    HuyetApTamThu = ?,
//                    HuyetApTamTruong = ?
//                """ + dieuKien;
//
//        int soDong = jdbcTemplate.update(
//                sqlCapNhat,
//                dto.getCanNang(),
//                dto.getChieuCao(),
//                dto.getHuyetApTamThu(),
//                dto.getHuyetApTamTruong(),
//                dto.getMaLichKham(),
//                caTruc.maKhoa(),
//                hienTai.toLocalDate(),
//                caTruc.maPhanCong(),
//                caTruc.maNhanVienTiepNhan(),
//                hienTai,
//                hienTai
//        );
//
//        if (soDong == 0) {
//            /*
//             * JDBC có thể trả 0 khi lưu lại đúng giá trị cũ.
//             * Chỉ chấp nhận nếu lịch vẫn đủ điều kiện cập nhật.
//             */
//            List<Integer> lichConHopLe =
//                    jdbcTemplate.query(
//                            "SELECT MaLichKham FROM lichdangkykham "
//                                    + dieuKien
//                                    + " FOR UPDATE",
//                            (rs, rowNum) -> rs.getInt("MaLichKham"),
//                            dto.getMaLichKham(),
//                            caTruc.maKhoa(),
//                            hienTai.toLocalDate(),
//                            caTruc.maPhanCong(),
//                            caTruc.maNhanVienTiepNhan(),
//                            hienTai,
//                            hienTai
//                    );
//
//            if (lichConHopLe.isEmpty()) {
//                throw new ResponseStatusException(
//                        HttpStatus.CONFLICT,
//                        "Không thể lưu số đo do lịch khám "
//                                + "hoặc ca trực đã thay đổi. "
//                                + "Vui lòng làm mới hồ sơ để kiểm tra."
//                );
//            }
//        }
//    }
    @Transactional
    public void luuChiSo(ChiSoTruocKhamDTO dto) {
        kiemTraDuLieu(dto);

        CaTrucHienTai caTruc =
                kiemTraQuyen(dto.getMaLichKham());

        String sqlLichKham = """
                SELECT MaKhoa, NgayKham, TrangThai
                FROM lichdangkykham
                WHERE MaLichKham = ?
                FOR UPDATE
                """;

        List<LichKhamKiemTra> ketQua = jdbcTemplate.query(
                sqlLichKham,
                (rs, rowNum) -> new LichKhamKiemTra(
                        rs.getInt("MaKhoa"),
                        rs.getDate("NgayKham").toLocalDate(),
                        rs.getString("TrangThai")
                ),
                dto.getMaLichKham()
        );

        if (ketQua.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám."
            );
        }

        // Kiểm tra lại quyền sau khi lấy khóa lịch khám.
        caTruc = kiemTraQuyen(dto.getMaLichKham());

        LocalDateTime hienTai = LocalDateTime.now(MUI_GIO);
        LichKhamKiemTra lichKham = ketQua.get(0);

        if (!caTruc.maKhoa().equals(lichKham.maKhoa())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Lịch khám không thuộc khoa đang phụ trách."
            );
        }

        if (!hienTai.toLocalDate().equals(lichKham.ngayKham())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ được ghi nhận số đo cho lịch khám hôm nay."
            );
        }

        if (!"DaGoi".equals(lichKham.trangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ được sửa số đo khi lịch đang ở trạng thái Đã gọi. "
                            + "Sau khi tiếp nhận, số đo chỉ được xem."
            );
        }

        /*
         * Chỉ cho phép tạo/cập nhật hồ sơ khi hồ sơ chưa bắt đầu khám.
         * Nếu đã có hồ sơ DangKham hoặc HoanTat thì không sửa số đo.
         */
        String sqlKiemTraHoSo = """
                SELECT TrangThai
                FROM hosobenhan
                WHERE MaLichKham = ?
                FOR UPDATE
                """;

        List<String> trangThaiHoSo = jdbcTemplate.query(
                sqlKiemTraHoSo,
                (rs, rowNum) -> rs.getString("TrangThai"),
                dto.getMaLichKham()
        );

        if (!trangThaiHoSo.isEmpty()) {
            String trangThai = trangThaiHoSo.get(0);

            if ("DangKham".equalsIgnoreCase(trangThai)
                    || "HoanTat".equalsIgnoreCase(trangThai)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Bác sĩ đã bắt đầu hoặc hoàn tất khám. "
                                + "Không thể sửa số đo trước khám."
                );
            }
        }

        /*
         * Lưu vào đúng bảng hosobenhan.
         * MaLichKham có UNIQUE KEY nên dùng ON DUPLICATE KEY UPDATE.
         * Không cập nhật các trường chẩn đoán, triệu chứng,
         * kết luận, hướng điều trị hoặc QRToken.
         */
        String sqlLuu = """
                INSERT INTO hosobenhan (
                    MaLichKham,
                    CanNang,
                    ChieuCao,
                    HuyetApTamThu,
                    HuyetApTamTruong,
                    TrangThai
                )
                SELECT ?, ?, ?, ?, ?, 'DaGoi'
                FROM lichdangkykham l
                WHERE l.MaLichKham = ?
                  AND l.MaKhoa = ?
                  AND l.NgayKham = ?
                  AND l.TrangThai = 'DaGoi'
                  AND EXISTS (
                      SELECT 1
                      FROM phancongtiepnhan pc
                      WHERE pc.MaPhanCong = ?
                        AND pc.MaNhanVienTiepNhan = ?
                        AND pc.MaKhoa = l.MaKhoa
                        AND pc.TrangThai = 1
                        AND pc.ThoiGianBatDau <= ?
                        AND pc.ThoiGianKetThuc > ?
                  )
                ON DUPLICATE KEY UPDATE
                    CanNang = IF(
                        hosobenhan.TrangThai NOT IN ('DangKham', 'HoanTat'),
                        VALUES(CanNang),
                        hosobenhan.CanNang
                    ),
                    ChieuCao = IF(
                        hosobenhan.TrangThai NOT IN ('DangKham', 'HoanTat'),
                        VALUES(ChieuCao),
                        hosobenhan.ChieuCao
                    ),
                    HuyetApTamThu = IF(
                        hosobenhan.TrangThai NOT IN ('DangKham', 'HoanTat'),
                        VALUES(HuyetApTamThu),
                        hosobenhan.HuyetApTamThu
                    ),
                    HuyetApTamTruong = IF(
                        hosobenhan.TrangThai NOT IN ('DangKham', 'HoanTat'),
                        VALUES(HuyetApTamTruong),
                        hosobenhan.HuyetApTamTruong
                    )
                """;

        int soDong = jdbcTemplate.update(
                sqlLuu,
                dto.getMaLichKham(),
                dto.getCanNang(),
                dto.getChieuCao(),
                dto.getHuyetApTamThu(),
                dto.getHuyetApTamTruong(),
                dto.getMaLichKham(),
                caTruc.maKhoa(),
                hienTai.toLocalDate(),
                caTruc.maPhanCong(),
                caTruc.maNhanVienTiepNhan(),
                hienTai,
                hienTai
        );

        if (soDong == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không thể lưu số đo do lịch khám hoặc ca trực "
                            + "đã thay đổi. Vui lòng làm mới hồ sơ."
            );
        }

        /*
         * Kiểm tra lại trạng thái để không báo thành công
         * nếu hồ sơ đã chuyển sang trạng thái bác sĩ đang khám.
         */
        Long hoSoKhongHopLe = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM hosobenhan
                WHERE MaLichKham = ?
                  AND TrangThai IN ('DangKham', 'HoanTat')
                """,
                Long.class,
                dto.getMaLichKham()
        );

        if (hoSoKhongHopLe != null && hoSoKhongHopLe > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Hồ sơ đã được bác sĩ bắt đầu khám. "
                            + "Không thể sửa số đo trước khám."
            );
        }
    }

    // =========================================================
    // KIỂM TRA DỮ LIỆU
    // =========================================================

    private void kiemTraMaLichKham(
            Integer maLichKham
    ) {
        if (maLichKham == null || maLichKham <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã lịch khám không hợp lệ."
            );
        }
    }

    private void kiemTraDuLieu(
            ChiSoTruocKhamDTO dto
    ) {
        if (dto == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chưa có dữ liệu số đo."
            );
        }

        kiemTraMaLichKham(dto.getMaLichKham());

        kiemTraSoThapPhan(
                dto.getCanNang(),
                "Cân nặng"
        );

        kiemTraSoThapPhan(
                dto.getChieuCao(),
                "Chiều cao"
        );

        Integer tamThu = dto.getHuyetApTamThu();
        Integer tamTruong = dto.getHuyetApTamTruong();

        if ((tamThu == null) != (tamTruong == null)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hãy nhập đủ hai chỉ số huyết áp."
            );
        }

        kiemTraHuyetAp(tamThu);
        kiemTraHuyetAp(tamTruong);

        if (tamThu != null && tamThu <= tamTruong) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Huyết áp tâm thu phải lớn hơn huyết áp tâm trương."
            );
        }

        /*
         * Cho phép lưu tạm một phần số đo.
         * Khi bấm Đã tiếp nhận, DashboardService yêu cầu đủ cả bốn.
         */
        if (dto.getCanNang() == null
                && dto.getChieuCao() == null
                && tamThu == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hãy nhập ít nhất một loại số đo."
            );
        }
    }

    private void kiemTraSoThapPhan(
            BigDecimal giaTri,
            String tenChiSo
    ) {
        if (giaTri == null) {
            return;
        }

        if (giaTri.signum() <= 0
                || giaTri.compareTo(GIA_TRI_THAP_PHAN_TOI_DA) > 0
                || giaTri.stripTrailingZeros().scale() > 2) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    tenChiSo
                            + " phải lớn hơn 0, không vượt quá 999.99 "
                            + "và có tối đa 2 chữ số thập phân."
            );
        }
    }

    private void kiemTraHuyetAp(
            Integer giaTri
    ) {
        if (giaTri != null
                && (giaTri <= 0 || giaTri > 65535)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Huyết áp phải là số nguyên dương "
                            + "trong giới hạn lưu trữ của database."
            );
        }
    }

    private record LichKhamKiemTra(
            Integer maKhoa,
            LocalDate ngayKham,
            String trangThai
    ) {
    }
}