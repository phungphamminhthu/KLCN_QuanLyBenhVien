
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DuocSiDieuChinhDonThuocRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class DuocSiDieuChinhDonThuocService {

    private final JdbcTemplate jdbcTemplate;

    public DuocSiDieuChinhDonThuocService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

//    @Transactional
//    public void dieuChinh(
//            Integer maDonThuoc,
//            DuocSiDieuChinhDonThuocRequest request
//    ) {
//        if (maDonThuoc == null || maDonThuoc <= 0) {
//            throw new IllegalArgumentException("Mã đơn thuốc không hợp lệ.");
//        }
//
//        if (request == null
//                || request.getChiTietDieuChinh() == null
//                || request.getChiTietDieuChinh().isEmpty()) {
//            throw new IllegalArgumentException(
//                    "Danh sách thuốc không được để trống."
//            );
//        }
//
//        // Khóa đơn thuốc để tránh cập nhật đồng thời.
//        List<String> trangThais = jdbcTemplate.query(
//                """
//                SELECT TrangThai
//                FROM DonThuoc
//                WHERE MaDonThuoc = ?
//                FOR UPDATE
//                """,
//                (rs, rowNum) -> rs.getString("TrangThai"),
//                maDonThuoc
//        );
//
//        if (trangThais.isEmpty()) {
//            throw new IllegalArgumentException("Không tìm thấy đơn thuốc.");
//        }
//
//        String trangThai = trangThais.get(0);
//
//        // Chỉ cho điều chỉnh trước khi cấp thuốc.
//        if (!"ChoLayThuoc".equals(trangThai)
//                && !"DangLayThuoc".equals(trangThai)) {
//            throw new IllegalStateException(
//                    "Đơn thuốc không còn ở trạng thái được phép điều chỉnh."
//            );
//        }
//
//        Set<Integer> daXuLy = new HashSet<>();
//
//        for (DuocSiDieuChinhDonThuocRequest.ChiTietDieuChinh item
//                : request.getChiTietDieuChinh()) {
//
//            if (item == null
//                    || item.getMaCTDonThuoc() == null
//                    || item.getMaCTDonThuoc() <= 0) {
//                throw new IllegalArgumentException("Mã chi tiết thuốc không hợp lệ.");
//            }
//
//            if (!daXuLy.add(item.getMaCTDonThuoc())) {
//                throw new IllegalArgumentException(
//                        "Danh sách có chi tiết thuốc bị lặp."
//                );
//            }
//
//            if (item.getSoLuong() == null || item.getSoLuong() <= 0) {
//                throw new IllegalArgumentException(
//                        "Số lượng phải lớn hơn 0."
//                );
//            }
//
//            if (item.getThoiGianDung() == null
//                    || item.getThoiGianDung() <= 0) {
//                throw new IllegalArgumentException(
//                        "Thời gian dùng phải lớn hơn 0 ngày."
//                );
//            }
//
//            Integer maThuocThayThe = item.getMaThuocThayThe();
//
//            if (maThuocThayThe != null) {
//                if (maThuocThayThe <= 0) {
//                    throw new IllegalArgumentException(
//                            "Mã thuốc thay thế không hợp lệ."
//                    );
//                }
//
//                Integer hopLe = jdbcTemplate.queryForObject(
//                        """
//                        SELECT COUNT(*)
//                        FROM CTDonThuoc ct
//                        JOIN ThuocTuongDuong tt
//                            ON tt.MaThuoc = ct.MaThuoc
//                           AND tt.MaThuocThayThe = ?
//                        JOIN Thuoc t
//                            ON t.MaThuoc = tt.MaThuocThayThe
//                        WHERE ct.MaCTDonThuoc = ?
//                          AND ct.MaDonThuoc = ?
//                          AND tt.TrangThai = 'Đang áp dụng'
//                          AND t.TrangThai = TRUE
//                        """,
//                        Integer.class,
//                        maThuocThayThe,
//                        item.getMaCTDonThuoc(),
//                        maDonThuoc
//                );
//
//                if (hopLe == null || hopLe == 0) {
//                    throw new IllegalArgumentException(
//                            "Thuốc thay thế không hợp lệ hoặc không được áp dụng."
//                    );
//                }
//            }
//
//            int updated = jdbcTemplate.update(
//                    """
//                    UPDATE CTDonThuoc
//                    SET SoLuong = ?,
//                        ThoiGianDung = ?
//                        MaThuocThucCap = ?
//                    WHERE MaCTDonThuoc = ?
//                      AND MaDonThuoc = ?
//                    """,
//                    item.getSoLuong(),
//                    item.getThoiGianDung(),
//                    maThuocThayThe,
//                    item.getMaCTDonThuoc(),
//                    maDonThuoc
//            );
//
//            if (updated != 1) {
//                throw new IllegalArgumentException(
//                        "Không tìm thấy chi tiết thuốc thuộc đơn này: "
//                                + item.getMaCTDonThuoc()
//                );
//            }
//        }
//    }

    @Transactional
    public void dieuChinh(
            Integer maDonThuoc,
            DuocSiDieuChinhDonThuocRequest request
    ) {
        if (maDonThuoc == null || maDonThuoc <= 0) {
            throw new IllegalArgumentException(
                    "Mã đơn thuốc không hợp lệ."
            );
        }

        if (request == null
                || request.getChiTietDieuChinh() == null
                || request.getChiTietDieuChinh().isEmpty()) {
            throw new IllegalArgumentException(
                    "Danh sách thuốc không được để trống."
            );
        }

        // 1. Khóa đơn thuốc để tránh cập nhật đồng thời.
        List<String> trangThais = jdbcTemplate.query(
                """
                SELECT TrangThai
                FROM DonThuoc
                WHERE MaDonThuoc = ?
                FOR UPDATE
                """,
                (rs, rowNum) -> rs.getString("TrangThai"),
                maDonThuoc
        );

        if (trangThais.isEmpty()) {
            throw new IllegalArgumentException(
                    "Không tìm thấy đơn thuốc."
            );
        }

        String trangThai = trangThais.get(0);

        // 2. Chỉ cho điều chỉnh trước khi cấp thuốc.
        if (!"ChoLayThuoc".equals(trangThai)
                && !"DangLayThuoc".equals(trangThai)) {
            throw new IllegalStateException(
                    "Đơn thuốc không còn ở trạng thái được phép điều chỉnh."
            );
        }

        // 3. Không cho điều chỉnh nếu hóa đơn thuốc đã thanh toán
        // hoặc đã phát sinh giao dịch thanh toán.
        Integer soHoaDonDaThanhToan = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(DISTINCT hd.MaHoaDon)
                FROM HoaDon hd
                JOIN CTHoaDon cth
                    ON cth.MaHoaDon = hd.MaHoaDon
                JOIN CTDonThuoc ct
                    ON ct.MaCTDonThuoc = cth.MaCTDonThuoc
                WHERE ct.MaDonThuoc = ?
                  AND hd.LoaiHoaDon = 'Thuoc'
                  AND (
                      hd.TrangThai = 'DaThanhToan'
                      OR EXISTS (
                          SELECT 1
                          FROM ThanhToan tt
                          WHERE tt.MaHoaDon = hd.MaHoaDon
                      )
                  )
                """,
                Integer.class,
                maDonThuoc
        );

        if (soHoaDonDaThanhToan != null
                && soHoaDonDaThanhToan > 0) {
            throw new IllegalStateException(
                    "Hóa đơn thuốc đã thanh toán hoặc đã phát sinh giao dịch. "
                            + "Không thể điều chỉnh đơn thuốc."
            );
        }

        // 4. Kiểm tra và cập nhật từng chi tiết thuốc.
        Set<Integer> daXuLy = new HashSet<>();

        for (DuocSiDieuChinhDonThuocRequest.ChiTietDieuChinh item
                : request.getChiTietDieuChinh()) {

            if (item == null
                    || item.getMaCTDonThuoc() == null
                    || item.getMaCTDonThuoc() <= 0) {
                throw new IllegalArgumentException(
                        "Mã chi tiết thuốc không hợp lệ."
                );
            }

            if (!daXuLy.add(item.getMaCTDonThuoc())) {
                throw new IllegalArgumentException(
                        "Danh sách có chi tiết thuốc bị lặp."
                );
            }

            if (item.getSoLuong() == null
                    || item.getSoLuong() <= 0) {
                throw new IllegalArgumentException(
                        "Số lượng phải lớn hơn 0."
                );
            }

            if (item.getThoiGianDung() == null
                    || item.getThoiGianDung() <= 0) {
                throw new IllegalArgumentException(
                        "Thời gian dùng phải lớn hơn 0 ngày."
                );
            }

            // Kiểm tra chi tiết thuốc thực sự thuộc đơn thuốc.
            Integer soChiTiet = jdbcTemplate.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM CTDonThuoc
                    WHERE MaCTDonThuoc = ?
                      AND MaDonThuoc = ?
                    """,
                    Integer.class,
                    item.getMaCTDonThuoc(),
                    maDonThuoc
            );

            if (soChiTiet == null || soChiTiet == 0) {
                throw new IllegalArgumentException(
                        "Không tìm thấy chi tiết thuốc thuộc đơn này: "
                                + item.getMaCTDonThuoc()
                );
            }

            Integer maThuocThayThe = item.getMaThuocThayThe();

            // 5. Nếu chọn thuốc thay thế, phải tồn tại trong
            // danh sách thuốc tương đương đang được áp dụng.
            if (maThuocThayThe != null) {
                if (maThuocThayThe <= 0) {
                    throw new IllegalArgumentException(
                            "Mã thuốc thay thế không hợp lệ."
                    );
                }

                Integer hopLe = jdbcTemplate.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM CTDonThuoc ct
                        JOIN ThuocTuongDuong tt
                            ON tt.MaThuoc = ct.MaThuoc
                           AND tt.MaThuocThayThe = ?
                        JOIN Thuoc t
                            ON t.MaThuoc = tt.MaThuocThayThe
                        WHERE ct.MaCTDonThuoc = ?
                          AND ct.MaDonThuoc = ?
                          AND tt.TrangThai = 'Đang áp dụng'
                          AND t.TrangThai = TRUE
                        """,
                        Integer.class,
                        maThuocThayThe,
                        item.getMaCTDonThuoc(),
                        maDonThuoc
                );

                if (hopLe == null || hopLe == 0) {
                    throw new IllegalArgumentException(
                            "Thuốc thay thế không hợp lệ hoặc không được áp dụng."
                    );
                }
            }

            // 6. Cập nhật số lượng, thời gian dùng và thuốc thực cấp.
            // NULL nghĩa là sử dụng thuốc gốc đã kê.
            int updated = jdbcTemplate.update(
                    """
                    UPDATE CTDonThuoc
                    SET SoLuong = ?,
                        ThoiGianDung = ?,
                        MaThuocThucCap = ?
                    WHERE MaCTDonThuoc = ?
                      AND MaDonThuoc = ?
                    """,
                    item.getSoLuong(),
                    item.getThoiGianDung(),
                    maThuocThayThe,
                    item.getMaCTDonThuoc(),
                    maDonThuoc
            );

            if (updated != 1) {
                throw new IllegalArgumentException(
                        "Không thể cập nhật chi tiết thuốc: "
                                + item.getMaCTDonThuoc()
                );
            }
        }
    }

}
