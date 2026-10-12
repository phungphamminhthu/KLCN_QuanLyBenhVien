package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.ChiSoTruocKhamDTO;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

@Service
public class ChiSoTruocKhamService {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbcTemplate;

    public ChiSoTruocKhamService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ChiSoTruocKhamDTO getChiSo(Integer maLichKham) {
        kiemTraMaLichKham(maLichKham);

        String sql = """
                SELECT MaLichKham, CanNang, ChieuCao,
                       HuyetApTamThu, HuyetApTamTruong
                FROM lichdangkykham
                WHERE MaLichKham = ?
                """;

        List<ChiSoTruocKhamDTO> ketQua = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    ChiSoTruocKhamDTO dto = new ChiSoTruocKhamDTO();

                    dto.setMaLichKham(rs.getInt("MaLichKham"));
                    dto.setCanNang(rs.getBigDecimal("CanNang"));
                    dto.setChieuCao(rs.getBigDecimal("ChieuCao"));
                    dto.setHuyetApTamThu(
                            rs.getObject("HuyetApTamThu", Integer.class)
                    );
                    dto.setHuyetApTamTruong(
                            rs.getObject("HuyetApTamTruong", Integer.class)
                    );

                    return dto;
                },
                maLichKham
        );

        if (ketQua.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám."
            );
        }

        return ketQua.get(0);
    }

    @Transactional
    public void luuChiSo(ChiSoTruocKhamDTO dto) {
        kiemTraDuLieu(dto);

        // Khóa dòng lịch khám trong thời gian kiểm tra và cập nhật.
        String sqlLichKham = """
                SELECT NgayKham, TrangThai
                FROM lichdangkykham
                WHERE MaLichKham = ?
                FOR UPDATE
                """;

        List<Map<String, Object>> ketQua =
                jdbcTemplate.queryForList(
                        sqlLichKham,
                        dto.getMaLichKham()
                );

        if (ketQua.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám."
            );
        }

        Map<String, Object> lichKham = ketQua.get(0);
        LocalDate ngayKham =
                ((java.sql.Date) lichKham.get("NgayKham")).toLocalDate();

        if (!ngayKham.equals(LocalDate.now(MUI_GIO))) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ được ghi nhận số đo cho lịch khám hôm nay."
            );
        }

        if (!"DaGoi".equals(lichKham.get("TrangThai"))) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Lịch khám phải ở trạng thái Đã gọi để lưu số đo."
            );
        }

        Long soHoSo = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM hosobenhan
                WHERE MaLichKham = ?
                """,
                Long.class,
                dto.getMaLichKham()
        );

        if (soHoSo != null && soHoSo > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bác sĩ đã mở hồ sơ khám. Không thể sửa số đo trước khám."
            );
        }

        // Chỉ cập nhật số đo, không thay đổi trạng thái lịch khám.
        String sqlCapNhat = """
                UPDATE lichdangkykham
                SET CanNang = ?,
                    ChieuCao = ?,
                    HuyetApTamThu = ?,
                    HuyetApTamTruong = ?
                WHERE MaLichKham = ?
                """;

        jdbcTemplate.update(
                sqlCapNhat,
                dto.getCanNang(),
                dto.getChieuCao(),
                dto.getHuyetApTamThu(),
                dto.getHuyetApTamTruong(),
                dto.getMaLichKham()
        );
    }

    private void kiemTraMaLichKham(Integer maLichKham) {
        if (maLichKham == null || maLichKham <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã lịch khám không hợp lệ."
            );
        }
    }

    private void kiemTraDuLieu(ChiSoTruocKhamDTO dto) {
        if (dto == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chưa có dữ liệu số đo."
            );
        }

        kiemTraMaLichKham(dto.getMaLichKham());

        kiemTraSoThapPhan(dto.getCanNang(), "Cân nặng");
        kiemTraSoThapPhan(dto.getChieuCao(), "Chiều cao");

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
                || giaTri.compareTo(new BigDecimal("999.99")) > 0
                || giaTri.stripTrailingZeros().scale() > 2) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    tenChiSo
                            + " phải lớn hơn 0, không vượt quá 999.99"
                            + " và có tối đa 2 chữ số thập phân."
            );
        }
    }

    private void kiemTraHuyetAp(Integer giaTri) {
        if (giaTri != null && (giaTri <= 0 || giaTri > 65535)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Huyết áp phải là số nguyên dương"
                            + " trong giới hạn lưu trữ của database."
            );
        }
    }
}