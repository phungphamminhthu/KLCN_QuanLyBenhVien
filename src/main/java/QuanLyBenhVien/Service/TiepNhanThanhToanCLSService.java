package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanThanhToanCLSDTO;
import QuanLyBenhVien.DTO.TiepNhanThanhToanCLSDTO.ChiPhiCLS;
import QuanLyBenhVien.DTO.TiepNhanThanhToanCLSDTO.KetQua;
import QuanLyBenhVien.DTO.TiepNhanThanhToanCLSDTO.XacNhanRequest;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TiepNhanThanhToanCLSService {

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private static final BigDecimal KHONG =
            new BigDecimal("0.00");

    /*
     * Danh mục CLS đã đối chiếu từ database bạn gửi.
     *
     * Mã 29 và 30 là khám chuyên khoa, không thuộc phần thu CLS.
     * Khi thêm dịch vụ CLS mới, phải bổ sung mã tại đây.
     */
    private static final Set<Integer> MA_DICH_VU_CLS = Set.of(
            1, 2, 3, 4, 5, 6, 7,
            8, 9, 10, 11, 12, 13, 14,
            15, 16, 17, 18, 19, 20, 21,
            22, 23, 24, 25, 26, 27, 28
    );

    private final JdbcTemplate jdbcTemplate;

    public TiepNhanThanhToanCLSService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // =========================================================
    // XEM CÁC KHOẢN PHÍ CLS
    // Không tạo hóa đơn hoặc ghi nhận thanh toán khi xem.
    // =========================================================

    @Transactional(readOnly = true)
    public TiepNhanThanhToanCLSDTO getThongTinThanhToan(
            Integer maLichKham
    ) {
        kiemTraMaLichKham(maLichKham);

        return docDuLieu(maLichKham, false).dto();
    }

    // =========================================================
    // XÁC NHẬN ĐÃ THỰC TẾ NHẬN TIỀN
    //
    // Ghi giao dịch, liên kết dòng phí và đổi trạng thái
    // trong cùng một transaction.
    //
    // Không tích hợp kiểm tra ngân hàng tự động ở phương thức này.
    // =========================================================

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public KetQua xacNhanThanhToan(
            Integer maLichKham,
            XacNhanRequest request
    ) {
        kiemTraMaLichKham(maLichKham);
        kiemTraRequest(request);

        DuLieu duLieu = docDuLieu(maLichKham, true);
        TiepNhanThanhToanCLSDTO dto = duLieu.dto();

        if (!dto.choPhepThanhToan()) {
            throw xungDot(dto.thongBao());
        }

        if (!dto.maHoaDon().equals(request.maHoaDon())) {
            throw xungDot(
                    "Hóa đơn đã thay đổi. Vui lòng tải lại thông tin."
            );
        }

        Set<Integer> cacDongCanThu = new HashSet<>();

        for (ChiPhiCLS dong : dto.danhSachChiPhi()) {
            if (!dong.daThanhToan()) {
                cacDongCanThu.add(dong.maCTHoaDon());
            }
        }

        Set<Integer> cacDongXacNhan =
                new HashSet<>(request.maCTHoaDon());

        if (!cacDongCanThu.equals(cacDongXacNhan)) {
            throw xungDot(
                    "Danh sách phí CLS đã thay đổi. "
                            + "Vui lòng mở lại bảng thanh toán."
            );
        }

        if (dto.tongCanThu().compareTo(
                request.soTienXacNhan()
        ) != 0) {
            throw xungDot(
                    "Số tiền đã thay đổi. "
                            + "Vui lòng kiểm tra lại trước khi thu."
            );
        }

        String phuongThuc = switch (
                request.phuongThucThanhToan()
                ) {
            case "TIEN_MAT" -> "Tiền mặt";
            case "CHUYEN_KHOAN" -> "Chuyển khoản";
            default -> throw khongHopLe(
                    "Phương thức thanh toán không hợp lệ."
            );
        };

        String maGiaoDich = request.maGiaoDich() == null
                ? null
                : request.maGiaoDich().trim();

        if (maGiaoDich != null && maGiaoDich.isBlank()) {
            maGiaoDich = null;
        }

        Integer maThanhToan = themThanhToan(
                dto.maHoaDon(),
                dto.tongCanThu(),
                phuongThuc,
                maGiaoDich
        );

        /*
         * UNIQUE(MaCTHoaDon) trong ctthanhtoan là lớp bảo vệ
         * bổ sung chống thanh toán trùng một dòng phí.
         */
        for (Integer maCTHoaDon : cacDongCanThu) {
            jdbcTemplate.update(
                    """
                    INSERT INTO ctthanhtoan (
                        MaThanhToan,
                        MaCTHoaDon
                    )
                    VALUES (?, ?)
                    """,
                    maThanhToan,
                    maCTHoaDon
            );
        }

        /*
         * Tổng hóa đơn gồm mọi dòng phí: CLS, khám, thuốc...
         * Chỉ thu các dòng CLS được xác nhận ở phía trên.
         */
        BigDecimal tongHoaDon = KHONG;
        BigDecimal tongDaTra = KHONG;

        for (Map<String, Object> dong : duLieu.cacDongHoaDon()) {
            BigDecimal thanhTien = docTien(
                    dong.get("ThanhTien")
            );

            tongHoaDon = tongHoaDon.add(thanhTien);

            boolean daTraTruoc = "ThanhCong".equals(
                    chuoi(dong.get("TrangThaiThanhToan"))
            );

            boolean vuaThanhToan = cacDongCanThu.contains(
                    soNguyen(dong.get("MaCTHoaDon"))
            );

            if (daTraTruoc || vuaThanhToan) {
                tongDaTra = tongDaTra.add(thanhTien);
            }
        }

        /*
         * Đây là trạng thái thanh toán của hóa đơn chung.
         * Hóa đơn có thể tiếp tục phát sinh khoản phí mới.
         */
        String trangThaiHoaDon =
                tongDaTra.compareTo(tongHoaDon) == 0
                        ? "DaThanhToan"
                        : "ChuaThanhToan";

        jdbcTemplate.update(
                """
                UPDATE hoadon
                SET TongTien = ?,
                    TrangThai = ?
                WHERE MaHoaDon = ?
                """,
                tongHoaDon,
                trangThaiHoaDon,
                dto.maHoaDon()
        );

        int soDongCapNhat = jdbcTemplate.update(
                """
                UPDATE lichdangkykham
                SET TrangThai = 'ChoCLS'
                WHERE MaLichKham = ?
                  AND TrangThai = 'ChoThanhToan'
                """,
                maLichKham
        );

        if (soDongCapNhat != 1) {
            throw xungDot(
                    "Trạng thái lịch khám đã thay đổi. "
                            + "Giao dịch chưa được ghi nhận."
            );
        }

        return new KetQua(
                true,
                "Đã xác nhận thanh toán phí CLS.",
                maLichKham,
                dto.maHoaDon(),
                maThanhToan,
                dto.tongCanThu(),
                "ChoCLS"
        );
    }

    // =========================================================
    // ĐỌC VÀ KIỂM TRA DỮ LIỆU
    // =========================================================

    private DuLieu docDuLieu(
            Integer maLichKham,
            boolean khoaDuLieu
    ) {
        String khoa = khoaDuLieu ? " FOR UPDATE" : "";

        List<Map<String, Object>> lichKham = jdbcTemplate.queryForList(
                """
                SELECT
                    l.MaLichKham,
                    l.MaBenhNhan,
                    l.TrangThai,
                    nd.HoTen
                FROM lichdangkykham l
                JOIN benhnhan bn
                    ON bn.MaBenhNhan = l.MaBenhNhan
                JOIN nguoidung nd
                    ON nd.MaNguoiDung = bn.MaNguoiDung
                WHERE l.MaLichKham = ?
                """ + khoa,
                maLichKham
        );

        if (lichKham.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám."
            );
        }

        Map<String, Object> lich = lichKham.get(0);

        Integer maBenhNhan =
                soNguyen(lich.get("MaBenhNhan"));

        String tenBenhNhan = chuoi(lich.get("HoTen"));
        String trangThai = chuoi(lich.get("TrangThai"));

        List<Map<String, Object>> hoaDon = jdbcTemplate.queryForList(
                """
                SELECT MaHoaDon, MaBenhNhan
                FROM hoadon
                WHERE MaLichKham = ?
                """ + khoa,
                maLichKham
        );

        if (hoaDon.isEmpty()) {
            return new DuLieu(
                    new TiepNhanThanhToanCLSDTO(
                            maLichKham,
                            null,
                            maBenhNhan,
                            tenBenhNhan,
                            trangThai,
                            List.of(),
                            KHONG,
                            KHONG,
                            false,
                            "Lịch khám chưa có hóa đơn. "
                                    + "Cần lập các khoản phí trước khi thu."
                    ),
                    List.of()
            );
        }

        Map<String, Object> hd = hoaDon.get(0);

        if (!maBenhNhan.equals(
                soNguyen(hd.get("MaBenhNhan"))
        )) {
            throw xungDot(
                    "Bệnh nhân trên hóa đơn không khớp lịch khám."
            );
        }

        Integer maHoaDon = soNguyen(hd.get("MaHoaDon"));

        /*
         * Đọc tất cả chỉ định của lịch để phát hiện
         * trường hợp còn chỉ định CLS chưa được lập dòng phí.
         */
        List<Map<String, Object>> cacChiDinh =
                jdbcTemplate.queryForList(
                        """
                        SELECT
                            cd.MaChiDinh,
                            cd.MaDichVu,
                            cd.TrangThai
                        FROM chidinhyte cd
                        JOIN hosobenhan hs
                            ON hs.MaHoSoBenhAn = cd.MaHoSoBenhAn
                        WHERE hs.MaLichKham = ?
                        ORDER BY cd.MaChiDinh
                        """ + khoa,
                        maLichKham
                );

        List<Map<String, Object>> cacDong =
                jdbcTemplate.queryForList(
                        """
                        SELECT
                            ct.MaCTHoaDon,
                            ct.MaChiDinh,
                            ct.MaCTDonThuoc,
                            ct.SoLuong,
                            ct.DonGia,
                            ct.ThanhTien,

                            cd.MaDichVu,
                            cd.TrangThai AS TrangThaiChiDinh,
                            hs.MaLichKham AS MaLichKhamChiDinh,

                            dv.TenDichVu,
                            p.TenPhong,

                            lk.MaThanhToan,
                            tt.MaHoaDon AS MaHoaDonThanhToan,
                            tt.TrangThai AS TrangThaiThanhToan

                        FROM cthoadon ct

                        LEFT JOIN chidinhyte cd
                            ON cd.MaChiDinh = ct.MaChiDinh

                        LEFT JOIN hosobenhan hs
                            ON hs.MaHoSoBenhAn = cd.MaHoSoBenhAn

                        LEFT JOIN dichvuyte dv
                            ON dv.MaDichVu = cd.MaDichVu

                        LEFT JOIN phongchuyentrach p
                            ON p.MaPhong = cd.MaPhong

                        LEFT JOIN ctthanhtoan lk
                            ON lk.MaCTHoaDon = ct.MaCTHoaDon

                        LEFT JOIN thanhtoan tt
                            ON tt.MaThanhToan = lk.MaThanhToan

                        WHERE ct.MaHoaDon = ?
                        ORDER BY ct.MaCTHoaDon
                        """ + khoa,
                        maHoaDon
                );

        List<Map<String, Object>> cacThanhToan =
                jdbcTemplate.queryForList(
                        """
                        SELECT MaThanhToan, SoTien, TrangThai
                        FROM thanhtoan
                        WHERE MaHoaDon = ?
                        ORDER BY MaThanhToan
                        """ + khoa,
                        maHoaDon
                );

        Map<Integer, BigDecimal> tienDaPhanBo = new HashMap<>();
        Map<Integer, Integer> soDongDaPhanBo = new HashMap<>();

        Set<Integer> chiDinhDaLapPhi = new HashSet<>();

        List<ChiPhiCLS> danhSachCLS = new ArrayList<>();

        BigDecimal tongDaThanhToan = KHONG;
        BigDecimal tongCanThu = KHONG;

        for (Map<String, Object> dong : cacDong) {
            Integer maCTHoaDon =
                    soNguyen(dong.get("MaCTHoaDon"));

            Integer soLuong = soNguyen(dong.get("SoLuong"));

            BigDecimal donGia = docTien(dong.get("DonGia"));
            BigDecimal thanhTien = docTien(dong.get("ThanhTien"));

            if (soLuong == null
                    || soLuong <= 0
                    || donGia.signum() < 0
                    || thanhTien.signum() < 0
                    || donGia.multiply(
                    BigDecimal.valueOf(soLuong)
            ).compareTo(thanhTien) != 0) {
                throw xungDot(
                        "Dòng phí " + maCTHoaDon
                                + " có số lượng hoặc thành tiền không hợp lệ."
                );
            }

            Integer maThanhToan =
                    soNguyen(dong.get("MaThanhToan"));

            boolean daThanhToan = false;

            if (maThanhToan != null) {
                if (!maHoaDon.equals(
                        soNguyen(dong.get("MaHoaDonThanhToan"))
                )) {
                    throw xungDot(
                            "Có dòng phí liên kết sai hóa đơn thanh toán."
                    );
                }

                if (!"ThanhCong".equals(
                        chuoi(dong.get("TrangThaiThanhToan"))
                )) {
                    throw xungDot(
                            "Có dòng phí liên kết với giao dịch chưa thành công. "
                                    + "Cần kiểm tra trước khi thu tiếp."
                    );
                }

                daThanhToan = true;

                tienDaPhanBo.merge(
                        maThanhToan,
                        thanhTien,
                        BigDecimal::add
                );

                soDongDaPhanBo.merge(
                        maThanhToan,
                        1,
                        Integer::sum
                );
            }

            Integer maChiDinh =
                    soNguyen(dong.get("MaChiDinh"));

            if (maChiDinh == null) {
                // Dòng tiền thuốc không thuộc danh sách thu CLS.
                continue;
            }

            if (!maLichKham.equals(
                    soNguyen(dong.get("MaLichKhamChiDinh"))
            )) {
                throw xungDot(
                        "Có chỉ định trên hóa đơn không thuộc lịch khám này."
                );
            }

            if (!chiDinhDaLapPhi.add(maChiDinh)) {
                throw xungDot(
                        "Chỉ định " + maChiDinh
                                + " đang có nhiều dòng phí. Cần kiểm tra lại."
                );
            }

            Integer maDichVu =
                    soNguyen(dong.get("MaDichVu"));

            if (!MA_DICH_VU_CLS.contains(maDichVu)) {
                continue;
            }

            String trangThaiChiDinh =
                    chuoi(dong.get("TrangThaiChiDinh"));

            /*
             * Quy trình thu trước khi thực hiện.
             * Không tự thu hồi tố các chỉ định đã thực hiện
             * mà chưa có liên kết thanh toán.
             */
            if (!daThanhToan
                    && !"ChoThucHien".equals(trangThaiChiDinh)) {
                throw xungDot(
                        "Chỉ định " + maChiDinh
                                + " không còn ở trạng thái chờ thực hiện "
                                + "nhưng chưa có liên kết thanh toán. "
                                + "Cần kiểm tra dữ liệu."
                );
            }

            danhSachCLS.add(
                    new ChiPhiCLS(
                            maCTHoaDon,
                            maChiDinh,
                            maDichVu,
                            chuoi(dong.get("TenDichVu")),
                            chuoi(dong.get("TenPhong")),
                            trangThaiChiDinh,
                            soLuong,
                            donGia,
                            thanhTien,
                            daThanhToan
                    )
            );

            if (daThanhToan) {
                tongDaThanhToan =
                        tongDaThanhToan.add(thanhTien);
            } else {
                tongCanThu = tongCanThu.add(thanhTien);
            }
        }

        /*
         * Giao dịch cũ đã thành công nhưng chưa được phân bổ
         * không được coi là "chưa trả" để thu thêm lần nữa.
         */
        for (Map<String, Object> thanhToan : cacThanhToan) {
            if (!"ThanhCong".equals(
                    chuoi(thanhToan.get("TrangThai"))
            )) {
                continue;
            }

            Integer id = soNguyen(
                    thanhToan.get("MaThanhToan")
            );

            BigDecimal soTien = docTien(
                    thanhToan.get("SoTien")
            );

            if (soTien.signum() <= 0
                    || !soDongDaPhanBo.containsKey(id)
                    || soTien.compareTo(
                    tienDaPhanBo.getOrDefault(id, KHONG)
            ) != 0) {
                throw xungDot(
                        "Giao dịch " + id
                                + " đã thành công nhưng chưa được liên kết "
                                + "đầy đủ với các dòng phí. "
                                + "Cần đối soát trước khi thu tiếp."
                );
            }
        }

        String lyDoChan = "";

        for (Map<String, Object> chiDinh : cacChiDinh) {
            Integer maDichVu =
                    soNguyen(chiDinh.get("MaDichVu"));

            Integer maChiDinh =
                    soNguyen(chiDinh.get("MaChiDinh"));

            if (MA_DICH_VU_CLS.contains(maDichVu)
                    && !chiDinhDaLapPhi.contains(maChiDinh)) {
                lyDoChan = "Còn chỉ định CLS chưa có dòng phí "
                        + "trong hóa đơn. Cần lập đủ phí trước khi thu.";
                break;
            }
        }

        if (lyDoChan.isBlank()
                && !"ChoThanhToan".equals(trangThai)) {
            lyDoChan = "Lịch khám không ở trạng thái chờ thanh toán CLS.";
        }

        if (lyDoChan.isBlank() && danhSachCLS.isEmpty()) {
            lyDoChan = "Hóa đơn chưa có khoản phí CLS.";
        }

        if (lyDoChan.isBlank() && tongCanThu.signum() <= 0) {
            lyDoChan = "Không còn phí CLS có số tiền cần thu. "
                    + "Không tạo giao dịch thanh toán 0 đồng.";
        }

        boolean choPhepThanhToan = lyDoChan.isBlank();

        String thongBao = choPhepThanhToan
                ? "Vui lòng kiểm tra dịch vụ và số tiền trước khi xác nhận."
                : lyDoChan;

        return new DuLieu(
                new TiepNhanThanhToanCLSDTO(
                        maLichKham,
                        maHoaDon,
                        maBenhNhan,
                        tenBenhNhan,
                        trangThai,
                        danhSachCLS,
                        tongDaThanhToan,
                        tongCanThu,
                        choPhepThanhToan,
                        thongBao
                ),
                cacDong
        );
    }

    // =========================================================
    // GHI GIAO DỊCH
    // =========================================================

    private Integer themThanhToan(
            Integer maHoaDon,
            BigDecimal soTien,
            String phuongThuc,
            String maGiaoDich
    ) {
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement statement =
                    connection.prepareStatement(
                            """
                            INSERT INTO thanhtoan (
                                MaHoaDon,
                                NgayThanhToan,
                                SoTien,
                                PhuongThucThanhToan,
                                TrangThai,
                                MaGiaoDich
                            )
                            VALUES (?, ?, ?, ?, 'ThanhCong', ?)
                            """,
                            new String[]{"MaThanhToan"}
                    );

            statement.setInt(1, maHoaDon);

            statement.setObject(
                    2,
                    LocalDateTime.now(MUI_GIO)
            );

            statement.setBigDecimal(3, soTien);
            statement.setString(4, phuongThuc);
            statement.setString(5, maGiaoDich);

            return statement;
        }, keyHolder);

        Number key = keyHolder.getKey();

        if (key == null) {
            throw new IllegalStateException(
                    "Không lấy được mã giao dịch thanh toán."
            );
        }

        return key.intValue();
    }

    // =========================================================
    // KIỂM TRA REQUEST
    // =========================================================

    private void kiemTraMaLichKham(Integer maLichKham) {
        if (maLichKham == null || maLichKham <= 0) {
            throw khongHopLe("Mã lịch khám không hợp lệ.");
        }
    }

    private void kiemTraRequest(XacNhanRequest request) {
        if (request == null
                || request.maHoaDon() == null
                || request.maHoaDon() <= 0) {
            throw khongHopLe("Thông tin hóa đơn không hợp lệ.");
        }

        List<Integer> danhSach = request.maCTHoaDon();

        if (danhSach == null
                || danhSach.isEmpty()
                || danhSach.size() > 500) {
            throw khongHopLe("Danh sách khoản thu không hợp lệ.");
        }

        Set<Integer> cacMa = new HashSet<>();

        for (Integer id : danhSach) {
            if (id == null || id <= 0 || !cacMa.add(id)) {
                throw khongHopLe(
                        "Danh sách khoản thu có mã sai hoặc bị trùng."
                );
            }
        }

        BigDecimal soTien = request.soTienXacNhan();

        if (soTien == null || soTien.signum() <= 0) {
            throw khongHopLe("Số tiền xác nhận phải lớn hơn 0.");
        }

        try {
            soTien.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw khongHopLe(
                    "Số tiền chỉ được có tối đa hai chữ số thập phân."
            );
        }

        String phuongThuc = request.phuongThucThanhToan();

        if (!"TIEN_MAT".equals(phuongThuc)
                && !"CHUYEN_KHOAN".equals(phuongThuc)) {
            throw khongHopLe(
                    "Vui lòng chọn tiền mặt hoặc chuyển khoản."
            );
        }

        if (request.maGiaoDich() != null
                && request.maGiaoDich().length() > 255) {
            throw khongHopLe("Mã giao dịch tối đa 255 ký tự.");
        }
    }

    private Integer soNguyen(Object value) {
        return value instanceof Number number
                ? number.intValue()
                : null;
    }

    private String chuoi(Object value) {
        return value == null ? "" : value.toString();
    }

    private BigDecimal docTien(Object value) {
        if (value == null) {
            throw xungDot("Có khoản phí thiếu thông tin số tiền.");
        }

        return value instanceof BigDecimal tien
                ? tien
                : new BigDecimal(value.toString());
    }

    private ResponseStatusException khongHopLe(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }

    private ResponseStatusException xungDot(String message) {
        return new ResponseStatusException(
                HttpStatus.CONFLICT,
                message
        );
    }

    private record DuLieu(
            TiepNhanThanhToanCLSDTO dto,
            List<Map<String, Object>> cacDongHoaDon
    ) {
    }
}