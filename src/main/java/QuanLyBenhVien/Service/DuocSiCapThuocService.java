package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DuocSiCapThuocRequest;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class DuocSiCapThuocService {

    private final JdbcTemplate jdbcTemplate;

    private final NguoiDungRepository nguoiDungRepository;

    private final ThongBaoWebSocketService thongBaoWebSocketService;


    public DuocSiCapThuocService(
            JdbcTemplate jdbcTemplate,
            NguoiDungRepository nguoiDungRepository,
            ThongBaoWebSocketService thongBaoWebSocketService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.nguoiDungRepository = nguoiDungRepository;
        this.thongBaoWebSocketService = thongBaoWebSocketService;
    }


    // =====================================================
    // XÁC NHẬN CẤP THUỐC
    // =====================================================

    @Transactional
    public void capThuoc(
            Integer maDonThuoc,
            DuocSiCapThuocRequest request,
            String tenDangNhap
    ) {

        // =================================================
        // 1. KIỂM TRA ĐƠN THUỐC
        // =================================================

        List<String> statuses =
                jdbcTemplate.query(
                        """
                        SELECT TrangThai
                        FROM DonThuoc
                        WHERE MaDonThuoc = ?
                        FOR UPDATE
                        """,
                        (rs, rowNum) ->
                                rs.getString(
                                        "TrangThai"
                                ),
                        maDonThuoc
                );


        if (statuses.isEmpty()) {

            throw new RuntimeException(
                    "Không tìm thấy đơn thuốc."
            );
        }


        String trangThai =
                statuses.get(0);


        if (
                !"ChoCapThuoc".equals(
                        trangThai
                )
                        &&
                        !"DangCapThuoc".equals(
                                trangThai
                        )
        ) {

            throw new RuntimeException(
                    "Đơn thuốc không ở trạng thái chờ cấp."
            );
        }


        // =================================================
        // 2. TÌM NGƯỜI ĐANG ĐĂNG NHẬP
        // =================================================

        List<Integer> nguoiDungIds =
                jdbcTemplate.query(
                        """
                        SELECT MaNguoiDung
                        FROM Nguoidung
                        WHERE TenDangNhap = ?
                        """,
                        (rs, rowNum) ->
                                rs.getInt(
                                        "MaNguoiDung"
                                ),
                        tenDangNhap
                );


        if (nguoiDungIds.isEmpty()) {

            throw new RuntimeException(
                    "Không tìm thấy tài khoản dược sĩ."
            );
        }


        Integer maNguoiCap =
                nguoiDungIds.get(0);


        // =================================================
        // 3. KIỂM TRA REQUEST
        // =================================================

        if (
                request == null
                        ||
                        request.getChiTiet() == null
                        ||
                        request.getChiTiet().isEmpty()
        ) {

            throw new RuntimeException(
                    "Đơn thuốc chưa có thuốc cần cấp."
            );
        }


        BigDecimal tongTien =
                BigDecimal.ZERO;


        // =================================================
        // 4. KIỂM TRA + TRỪ KHO
        // =================================================

        for (
                DuocSiCapThuocRequest.ChiTietCapThuoc item
                : request.getChiTiet()
        ) {

            if (
                    item.getMaThuoc() == null
                            ||
                            item.getSoLuongThucCap() == null
                            ||
                            item.getSoLuongThucCap() <= 0
            ) {

                throw new RuntimeException(
                        "Số lượng thực cấp không hợp lệ."
                );
            }


            Integer maThuoc =
                    item.getMaThuoc();

            int soLuongCanCap =
                    item.getSoLuongThucCap();


            // =============================================
            // 4.1 KIỂM TRA THUỐC CÓ TRONG ĐƠN
            // =============================================

            List<Integer> soLuongKeList =
                    jdbcTemplate.query(
                            """
                            SELECT SoLuong
                            FROM CTDonThuoc
                            WHERE MaDonThuoc = ?
                              AND MaThuoc = ?
                            """,
                            (rs, rowNum) ->
                                    rs.getInt(
                                            "SoLuong"
                                    ),
                            maDonThuoc,
                            maThuoc
                    );


            if (
                    soLuongKeList.isEmpty()
            ) {

                throw new RuntimeException(
                        "Thuốc không thuộc đơn thuốc."
                );
            }


            int soLuongKe =
                    soLuongKeList.get(0);


            if (
                    soLuongCanCap > soLuongKe
            ) {

                throw new RuntimeException(
                        "Số lượng thực cấp không được lớn hơn số lượng kê."
                );
            }


            // =============================================
            // 4.2 KIỂM TRA TỔNG TỒN KHO
            // =============================================

            Integer tongTon =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT COALESCE(
                                SUM(SoLuongTon),
                                0
                            )
                            FROM KhoThuoc
                            WHERE MaThuoc = ?
                              AND SoLuongTon > 0
                            """,
                            Integer.class,
                            maThuoc
                    );


            if (
                    tongTon == null
                            ||
                            tongTon < soLuongCanCap
            ) {

                String tenThuoc =
                        jdbcTemplate.queryForObject(
                                """
                                SELECT TenThuoc
                                FROM Thuoc
                                WHERE MaThuoc = ?
                                """,
                                String.class,
                                maThuoc
                        );


                throw new RuntimeException(
                        "Thuốc "
                                + tenThuoc
                                + " không đủ tồn kho. "
                                + "Tồn kho: "
                                + (
                                tongTon == null
                                        ? 0
                                        : tongTon
                        )
                );
            }


            // =============================================
            // 4.3 TÍNH TIỀN
            // =============================================

            BigDecimal donGia =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT DonGiaBan
                            FROM CTDonThuoc
                            WHERE MaDonThuoc = ?
                              AND MaThuoc = ?
                            """,
                            BigDecimal.class,
                            maDonThuoc,
                            maThuoc
                    );


            if (donGia == null) {

                donGia =
                        BigDecimal.ZERO;
            }


            tongTien =
                    tongTien.add(
                            donGia.multiply(
                                    BigDecimal.valueOf(
                                            soLuongCanCap
                                    )
                            )
                    );


            // =============================================
            // 4.4 LẤY CÁC LÔ THUỐC
            //     ƯU TIÊN LÔ SẮP HẾT HẠN
            // =============================================

            List<KhoLot> lots =
                    jdbcTemplate.query(
                            """
                            SELECT
                                MaKhoThuoc,
                                SoLuongTon
                            FROM KhoThuoc
                            WHERE MaThuoc = ?
                              AND SoLuongTon > 0
                            ORDER BY
                                HanSuDung ASC,
                                MaKhoThuoc ASC
                            FOR UPDATE
                            """,
                            (rs, rowNum) -> {

                                KhoLot lot =
                                        new KhoLot();

                                lot.maKhoThuoc =
                                        rs.getInt(
                                                "MaKhoThuoc"
                                        );

                                lot.soLuongTon =
                                        rs.getInt(
                                                "SoLuongTon"
                                        );

                                return lot;
                            },
                            maThuoc
                    );


            int conLai =
                    soLuongCanCap;


            // =============================================
            // 4.5 TRỪ TỒN KHO
            // =============================================

            for (
                    KhoLot lot : lots
            ) {

                if (conLai <= 0) {
                    break;
                }


                int soLuongTru =
                        Math.min(
                                conLai,
                                lot.soLuongTon
                        );


                jdbcTemplate.update(
                        """
                        UPDATE KhoThuoc
                        SET
                            SoLuongTon =
                                SoLuongTon - ?,

                            ThoiGianCapNhatCuoi =
                                ?
                        WHERE MaKhoThuoc = ?
                        """,

                        soLuongTru,

                        Timestamp.valueOf(
                                LocalDateTime.now()
                        ),

                        lot.maKhoThuoc
                );


                conLai -=
                        soLuongTru;
            }


            if (conLai > 0) {

                throw new RuntimeException(
                        "Không thể trừ đủ tồn kho."
                );
            }
        }


        // =================================================
        // 5. TẠO PHIẾU CẤP THUỐC
        // =================================================

        jdbcTemplate.update(
                """
                INSERT INTO PhieuCapThuoc (
                    MaDonThuoc,
                    MaNguoiCap,
                    ThoiGianCap,
                    TongTien,
                    TrangThai
                )
                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    'DaCapThuoc'
                )
                """,

                maDonThuoc,

                maNguoiCap,

                Timestamp.valueOf(
                        LocalDateTime.now()
                ),

                tongTien
        );


        // =================================================
        // 6. CẬP NHẬT ĐƠN THUỐC
        // =================================================

        jdbcTemplate.update(
                """
                UPDATE DonThuoc
                SET TrangThai = 'DaCapThuoc'
                WHERE MaDonThuoc = ?
                """,
                maDonThuoc
        );

        // =================================================
        // 7. TẠO THÔNG BÁO
        // =================================================

            NguoiDung nguoiDung =
                    nguoiDungRepository
                            .findById(maNguoiCap)
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Không tìm thấy người dùng."
                                    )
                            );


            // Lấy mã hiển thị đơn thuốc
            String maHienThi =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT CONCAT(
                                'DP',
                                LPAD(MaDonThuoc, 5, '0')
                            )
                            FROM DonThuoc
                            WHERE MaDonThuoc = ?
                            """,
                            String.class,
                            maDonThuoc
                    );


            // Lấy tên bệnh nhân
            String tenBenhNhan =
                    jdbcTemplate.queryForObject(
                            """
                            SELECT nd.HoTen
                            FROM DonThuoc d
            
                            INNER JOIN HoSoBenhAn hs
                                ON hs.MaHoSoBenhAn =
                                   d.MaHoSoBenhAn
            
                            INNER JOIN LichDangKyKham lk
                                ON lk.MaLichKham =
                                   hs.MaLichKham
            
                            INNER JOIN BenhNhan bn
                                ON bn.MaBenhNhan =
                                   lk.MaBenhNhan
            
                            INNER JOIN Nguoidung nd
                                ON nd.MaNguoiDung =
                                   bn.MaNguoiDung
            
                            WHERE d.MaDonThuoc = ?
                            """,
                            String.class,
                            maDonThuoc
                    );


             // Tạo thông báo
            thongBaoWebSocketService.taoThongBao(
                    nguoiDung,
                    "Cấp thuốc thành công",
                    "Đơn thuốc "
                            + maHienThi
                            + " của bệnh nhân "
                            + tenBenhNhan
                            + " đã được cấp thuốc.",
                    "CAP_THUOC",
                    "DaCapThuoc"
            );

        if (TransactionSynchronizationManager.isSynchronizationActive()) {

            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {

                        @Override
                        public void afterCommit() {

                            thongBaoWebSocketService
                                    .guiSoThongBaoChuaDoc(
                                            nguoiDung
                                    );
                        }
                    }
            );

        } else {

            thongBaoWebSocketService
                    .guiSoThongBaoChuaDoc(
                            nguoiDung
                    );
        }
    }


    // =====================================================
    // CLASS KHO THUỐC
    // =====================================================

    private static class KhoLot {

        Integer maKhoThuoc;

        Integer soLuongTon;
    }
}