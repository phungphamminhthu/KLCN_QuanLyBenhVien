package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanChiTietLichKhamDTO;
import QuanLyBenhVien.DTO.TiepNhanChiTietLichKhamDTO.ChiDinhDTO;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class TiepNhanChiTietLichKhamService {

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanPhanCongService phanCongService;

    public TiepNhanChiTietLichKhamService(
            JdbcTemplate jdbcTemplate,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.phanCongService = phanCongService;
    }

    // =====================================================
    // LẤY CHI TIẾT MỘT LỊCH KHÁM
    // Chỉ đọc, không cập nhật trạng thái hoặc số đo.
    // =====================================================

    @Transactional(
            readOnly = true,
            isolation = Isolation.REPEATABLE_READ
    )
    public TiepNhanChiTietLichKhamDTO layChiTiet(
            Integer maBenhNhan,
            Integer maLichKham,
            Authentication authentication
    ) {

        if (maBenhNhan == null || maBenhNhan <= 0
                || maLichKham == null || maLichKham <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã bệnh nhân hoặc mã lịch khám không hợp lệ."
            );
        }

        /*
         * Kiểm tra tài khoản và khoa đang phụ trách.
         * Được xem lịch cũ thuộc khoa hiện đang được phân công.
         */
        var caTruc = phanCongService.kiemTraQuyenVoiLichKham(
                authentication,
                maLichKham
        );

        // Kiểm tra lịch khám thuộc đúng bệnh nhân.
        List<Integer> lichHopLe = jdbcTemplate.query(
                """
                SELECT MaLichKham
                FROM lichdangkykham
                WHERE MaLichKham = ?
                  AND MaBenhNhan = ?
                  AND MaKhoa = ?
                """,
                (rs, rowNum) -> rs.getInt("MaLichKham"),
                maLichKham,
                maBenhNhan,
                caTruc.maKhoa()
        );

        if (lichHopLe.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám trong hồ sơ bệnh nhân này."
            );
        }

        List<ChiDinhDTO> danhSachChiDinh =
                layChiDinh(maLichKham);

        String sql = """
                SELECT
                    l.MaLichKham,
                    l.MaBenhNhan,
                    ndBN.HoTen AS TenBenhNhan,
                    l.NgayKham,
                    l.GioKham,
                    s.SoThuTu,
                    l.MaKhoa,
                    k.TenKhoa,
                    l.MaBacSi,
                    ndBS.HoTen AS TenBacSi,

                    l.TrangThai AS TrangThaiLichKham,
                    l.LyDoKham,

                    l.CanNang,
                    l.ChieuCao,
                    l.HuyetApTamThu,
                    l.HuyetApTamTruong,

                    (
                        SELECT CASE
                            WHEN COUNT(DISTINCT lv.MaPhong) = 1
                                THEN MAX(p.TenPhong)
                            ELSE NULL
                        END
                        FROM lichlamviec lv
                        JOIN phongchuyentrach p
                          ON p.MaPhong = lv.MaPhong

                        WHERE lv.MaBacSi = l.MaBacSi
                          AND lv.NgayLamViec = l.NgayKham
                          AND l.GioKham >= lv.GioBatDau
                          AND l.GioKham < lv.GioKetThuc
                          AND p.MaKhoa = l.MaKhoa
                    ) AS TenPhong,

                    tn.MaTiepNhan,
                    tn.MaNhanVienTiepNhan,
                    ndTN.HoTen AS TenNhanVienTiepNhan,
                    tn.MaPhanCong,
                    tn.ThoiGianTiepNhan,

                    h.MaHoSoBenhAn,
                    h.TrieuChung,
                    h.ChanDoan,
                    h.KetLuan,
                    h.HuongDieuTri,
                    h.NgayTaiKham,
                    h.GhiChuTaiKham

                FROM lichdangkykham l

                JOIN benhnhan bn
                  ON bn.MaBenhNhan = l.MaBenhNhan

                JOIN nguoidung ndBN
                  ON ndBN.MaNguoiDung = bn.MaNguoiDung

                LEFT JOIN sothutu s
                  ON s.MaSoThuTu = l.MaSoThuTu

                LEFT JOIN khoa k
                  ON k.MaKhoa = l.MaKhoa

                LEFT JOIN bacsi bs
                  ON bs.MaBacSi = l.MaBacSi

                LEFT JOIN nguoidung ndBS
                  ON ndBS.MaNguoiDung = bs.MaNguoiDung

                LEFT JOIN tiepnhanbenhnhan tn
                  ON tn.MaLichKham = l.MaLichKham

                LEFT JOIN nguoidung ndTN
                  ON ndTN.MaNguoiDung = tn.MaNhanVienTiepNhan

                LEFT JOIN hosobenhan h
                  ON h.MaLichKham = l.MaLichKham

                WHERE l.MaLichKham = ?
                  AND l.MaBenhNhan = ?
                  AND l.MaKhoa = ?

                LIMIT 2
                """;

        List<TiepNhanChiTietLichKhamDTO> ketQua =
                jdbcTemplate.query(
                        sql,
                        (rs, rowNum) ->
                                new TiepNhanChiTietLichKhamDTO(

                                        // Thông tin lịch khám
                                        rs.getInt("MaLichKham"),
                                        rs.getInt("MaBenhNhan"),
                                        rs.getString("TenBenhNhan"),

                                        rs.getObject(
                                                "NgayKham",
                                                LocalDate.class
                                        ),

                                        rs.getObject(
                                                "GioKham",
                                                LocalTime.class
                                        ),

                                        rs.getObject(
                                                "SoThuTu",
                                                Integer.class
                                        ),

                                        rs.getInt("MaKhoa"),
                                        rs.getString("TenKhoa"),

                                        rs.getInt("MaBacSi"),
                                        rs.getString("TenBacSi"),

                                        rs.getString("TenPhong"),
                                        rs.getString("TrangThaiLichKham"),
                                        rs.getString("LyDoKham"),

                                        // Thông tin tiếp nhận thực tế
                                        rs.getObject(
                                                "MaTiepNhan",
                                                Integer.class
                                        ),

                                        rs.getObject(
                                                "MaNhanVienTiepNhan",
                                                Integer.class
                                        ),

                                        rs.getString(
                                                "TenNhanVienTiepNhan"
                                        ),

                                        rs.getObject(
                                                "MaPhanCong",
                                                Integer.class
                                        ),

                                        rs.getObject(
                                                "ThoiGianTiepNhan",
                                                LocalDateTime.class
                                        ),

                                        // Số đo của lịch khám
                                        rs.getBigDecimal("CanNang"),
                                        rs.getBigDecimal("ChieuCao"),

                                        rs.getObject(
                                                "HuyetApTamThu",
                                                Integer.class
                                        ),

                                        rs.getObject(
                                                "HuyetApTamTruong",
                                                Integer.class
                                        ),

                                        // Thông tin khám bệnh
                                        rs.getObject(
                                                "MaHoSoBenhAn",
                                                Integer.class
                                        ),

                                        rs.getString("TrieuChung"),
                                        rs.getString("ChanDoan"),
                                        rs.getString("KetLuan"),
                                        rs.getString("HuongDieuTri"),

                                        rs.getObject(
                                                "NgayTaiKham",
                                                LocalDate.class
                                        ),

                                        rs.getString("GhiChuTaiKham"),

                                        // Danh sách chỉ định
                                        danhSachChiDinh
                                ),
                        maLichKham,
                        maBenhNhan,
                        caTruc.maKhoa()
                );

        if (ketQua.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy chi tiết lịch khám."
            );
        }

        /*
         * Nếu có nhiều bản ghi tiếp nhận của cùng lịch khám,
         * không tự chọn một nhân viên bất kỳ để hiển thị.
         */
        if (ketQua.size() > 1) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Lịch khám có nhiều bản ghi tiếp nhận. "
                            + "Cần kiểm tra dữ liệu trước khi hiển thị."
            );
        }

        return ketQua.get(0);
    }

    // =====================================================
    // DANH SÁCH CHỈ ĐỊNH CỦA LỊCH KHÁM
    // =====================================================

    private List<ChiDinhDTO> layChiDinh(
            Integer maLichKham
    ) {
        String sql = """
                SELECT
                    cd.MaChiDinh,
                    cd.MaDichVu,
                    dv.TenDichVu,
                    cd.LoaiChiDinh,
                    cd.MaPhong,
                    p.TenPhong,
                    cd.NgayChiDinh,
                    cd.TrangThai

                FROM chidinhyte cd

                JOIN hosobenhan h
                  ON h.MaHoSoBenhAn = cd.MaHoSoBenhAn

                LEFT JOIN dichvuyte dv
                  ON dv.MaDichVu = cd.MaDichVu

                LEFT JOIN phongchuyentrach p
                  ON p.MaPhong = cd.MaPhong

                WHERE h.MaLichKham = ?

                ORDER BY
                    cd.NgayChiDinh,
                    cd.MaChiDinh
                """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new ChiDinhDTO(
                        rs.getInt("MaChiDinh"),
                        rs.getInt("MaDichVu"),
                        rs.getString("TenDichVu"),
                        rs.getString("LoaiChiDinh"),

                        rs.getObject(
                                "MaPhong",
                                Integer.class
                        ),

                        rs.getString("TenPhong"),

                        rs.getObject(
                                "NgayChiDinh",
                                LocalDateTime.class
                        ),

                        rs.getString("TrangThai")
                ),
                maLichKham
        );
    }
}