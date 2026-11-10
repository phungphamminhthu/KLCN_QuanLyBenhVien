
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
     * Danh sách mã dịch vụ CLS hiện tại.
     * Nếu thêm dịch vụ CLS mới, cần bổ sung mã tại đây.
     */
    private static final Set<Integer> MA_DICH_VU_CLS = Set.of(
            1, 2, 3, 4, 5, 6, 7,
            8, 9, 10, 11, 12, 13, 14,
            15, 16, 17, 18, 19, 20, 21,
            22, 23, 24, 25, 26, 27, 28
    );

    private final JdbcTemplate jdbcTemplate;
    private final ThongBaoService thongBaoService;

    public TiepNhanThanhToanCLSService(
            JdbcTemplate jdbcTemplate,
            ThongBaoService thongBaoService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.thongBaoService = thongBaoService;
    }

    // =========================================================
    // 1. LẤY THÔNG TIN THANH TOÁN THEO LỊCH VÀ HÓA ĐƠN
    // =========================================================

    @Transactional(readOnly = true)
    public TiepNhanThanhToanCLSDTO getThongTinThanhToan(
            Integer maLichKham,
            Integer maHoaDon
    ) {
        kiemTraMaLichKham(maLichKham);

        if (maHoaDon == null || maHoaDon <= 0) {
            throw khongHopLe("Mã hóa đơn không hợp lệ.");
        }

        return docDuLieu(
                maLichKham,
                maHoaDon,
                false
        ).dto();
    }

    // =========================================================
    // 2. XÁC NHẬN THANH TOÁN MỘT HÓA ĐƠN CLS
    //
    // Chỉ thanh toán các dòng phí thuộc hóa đơn được chọn.
    // Không thay đổi trạng thái chung của lịch khám.
    // Không thay đổi trạng thái tiếp nhận chung.
    // =========================================================

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public KetQua xacNhanThanhToan(
            Integer maLichKham,
            XacNhanRequest request
    ) {
        kiemTraMaLichKham(maLichKham);
        kiemTraRequest(request);

        // Đọc và khóa dữ liệu của hóa đơn đang thanh toán.
        DuLieu duLieu = docDuLieu(
                maLichKham,
                request.maHoaDon(),
                true
        );

        TiepNhanThanhToanCLSDTO dto = duLieu.dto();

        if (!dto.choPhepThanhToan()) {
            throw xungDot(dto.thongBao());
        }

        if (dto.maHoaDon() == null
                || !dto.maHoaDon().equals(request.maHoaDon())) {
            throw xungDot(
                    "Hóa đơn đã thay đổi. Vui lòng tải lại thông tin."
            );
        }

        // -----------------------------------------------------
        // 2.1. Xác định các dòng phí chưa thanh toán
        // -----------------------------------------------------

        Set<Integer> cacDongCanThu = new HashSet<>();

        for (ChiPhiCLS dong : dto.danhSachChiPhi()) {
            if (!dong.daThanhToan()) {
                cacDongCanThu.add(dong.maCTHoaDon());
            }
        }

        if (cacDongCanThu.isEmpty()) {
            throw xungDot(
                    "Hóa đơn không còn khoản phí CLS cần thanh toán."
            );
        }

        // -----------------------------------------------------
        // 2.2. Kiểm tra danh sách dòng phí frontend gửi lên
        // -----------------------------------------------------

        Set<Integer> cacDongXacNhan =
                new HashSet<>(request.maCTHoaDon());

        if (!cacDongCanThu.equals(cacDongXacNhan)) {
            throw xungDot(
                    "Danh sách phí CLS đã thay đổi. "
                            + "Vui lòng mở lại bảng thanh toán."
            );
        }

        // -----------------------------------------------------
        // 2.3. Kiểm tra số tiền
        // -----------------------------------------------------

        if (dto.tongCanThu().compareTo(
                request.soTienXacNhan()
        ) != 0) {
            throw xungDot(
                    "Số tiền đã thay đổi. "
                            + "Vui lòng kiểm tra lại trước khi thu."
            );
        }

        // -----------------------------------------------------
        // 2.4. Xác định phương thức thanh toán
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // 2.5. Tạo giao dịch thanh toán cho hóa đơn được chọn
        // -----------------------------------------------------

        Integer maThanhToan = themThanhToan(
                dto.maHoaDon(),
                dto.tongCanThu(),
                phuongThuc,
                maGiaoDich
        );

        // -----------------------------------------------------
        // 2.6. Liên kết giao dịch với từng dòng phí
        // -----------------------------------------------------

        for (Integer maCTHoaDon : cacDongCanThu) {
            int soDong = jdbcTemplate.update(
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

            if (soDong != 1) {
                throw xungDot(
                        "Không thể liên kết dòng phí "
                                + maCTHoaDon
                                + " với giao dịch thanh toán."
                );
            }
        }

        // -----------------------------------------------------
        // 2.7. Tính lại tổng tiền của chính hóa đơn này
        // -----------------------------------------------------

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

        String trangThaiHoaDon;

        if (tongDaTra.signum() <= 0) {
            trangThaiHoaDon = "ChuaThanhToan";
        } else if (tongDaTra.compareTo(tongHoaDon) >= 0) {
            trangThaiHoaDon = "DaThanhToan";
        } else {
            trangThaiHoaDon = "ThanhToanMotPhan";
        }

        int soDongHoaDon = jdbcTemplate.update(
                """
                UPDATE hoadon
                SET TongTien = ?,
                    TrangThai = ?
                WHERE MaHoaDon = ?
                  AND MaLichKham = ?
                """,
                tongHoaDon,
                trangThaiHoaDon,
                dto.maHoaDon(),
                maLichKham
        );

        if (soDongHoaDon != 1) {
            throw xungDot(
                    "Không thể cập nhật trạng thái hóa đơn."
            );
        }

        // -----------------------------------------------------
        // 2.8. Chỉ chuyển các chỉ định thuộc hóa đơn vừa thu
        // -----------------------------------------------------

        int soChiDinhDuocMo = 0;

        for (ChiPhiCLS dong : dto.danhSachChiPhi()) {

            if (!cacDongCanThu.contains(dong.maCTHoaDon())) {
                continue;
            }

            int soDong = jdbcTemplate.update(
                    """
                    UPDATE chidinhyte cd
                    JOIN cthoadon ct
                        ON ct.MaChiDinh = cd.MaChiDinh
                    JOIN hosobenhan hs
                        ON hs.MaHoSoBenhAn = cd.MaHoSoBenhAn
                    SET cd.TrangThai = 'ChoThucHien'
                    WHERE ct.MaCTHoaDon = ?
                      AND ct.MaHoaDon = ?
                      AND hs.MaLichKham = ?
                      AND cd.TrangThai = 'ChoThanhToan'
                    """,
                    dong.maCTHoaDon(),
                    dto.maHoaDon(),
                    maLichKham
            );

            if (soDong != 1) {
                throw xungDot(
                        "Không thể chuyển trạng thái chỉ định "
                                + dong.maChiDinh()
                                + " sang chờ thực hiện. "
                                + "Giao dịch chưa được ghi nhận."
                );
            }

            soChiDinhDuocMo += soDong;
        }

        if (soChiDinhDuocMo == 0) {
            throw xungDot(
                    "Không có chỉ định nào được chuyển sang chờ thực hiện."
            );
        }

        // -----------------------------------------------------
        // 2.9. Thông báo nhân viên chuyên trách
        // -----------------------------------------------------

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("CHUYENTRACH"),
                "Có chỉ định CLS chờ thực hiện",
                "Bệnh nhân " + dto.tenBenhNhan()
                        + " đã thanh toán hóa đơn CLS "
                        + dto.maHoaDon()
                        + ". Có "
                        + soChiDinhDuocMo
                        + " chỉ định chờ thực hiện.",
                "BENH_NHAN_CHO_CLS"
        );

        // Không cập nhật lichdangkykham hoặc tiepnhanbenhnhan
        // tại đây vì một lịch khám có thể có nhiều hóa đơn CLS.

        return new KetQua(
                true,
                "Đã xác nhận thanh toán phí CLS.",
                maLichKham,
                dto.maHoaDon(),
                maThanhToan,
                dto.tongCanThu(),
                "ChoThucHien"
        );
    }

    // =========================================================
    // 3. ĐỌC DỮ LIỆU HÓA ĐƠN ĐƯỢC CHỌN
    // =========================================================

    private DuLieu docDuLieu(
            Integer maLichKham,
            Integer maHoaDon,
            boolean khoaDuLieu
    ) {
        String khoa = khoaDuLieu ? " FOR UPDATE" : "";

        // -----------------------------------------------------
        // 3.1. Kiểm tra lịch khám và bệnh nhân
        // -----------------------------------------------------

        List<Map<String, Object>> lichKham =
                jdbcTemplate.queryForList(
                        """
                        SELECT
                            l.MaLichKham,
                            l.MaBenhNhan,
                            l.TrangThai,
                            bn.HoTen
                        FROM lichdangkykham l
                        JOIN benhnhan bn
                            ON bn.MaBenhNhan = l.MaBenhNhan
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

        String tenBenhNhan =
                chuoi(lich.get("HoTen"));

        String trangThaiLich =
                chuoi(lich.get("TrangThai"));

        // -----------------------------------------------------
        // 3.2. Lấy đúng hóa đơn được chọn
        // -----------------------------------------------------

        List<Map<String, Object>> hoaDon =
                jdbcTemplate.queryForList(
                        """
                        SELECT
                            MaHoaDon,
                            MaBenhNhan,
                            TrangThai,
                            TongTien
                        FROM hoadon
                        WHERE MaLichKham = ?
                          AND MaHoaDon = ?
                        """ + khoa,
                        maLichKham,
                        maHoaDon
                );

        if (hoaDon.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy hóa đơn thuộc lịch khám này."
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

        Integer maHoaDonDuocChon =
                soNguyen(hd.get("MaHoaDon"));

        // -----------------------------------------------------
        // 3.3. Lấy tất cả chỉ định thuộc lịch khám
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // 3.4. Lấy tất cả dòng phí của hóa đơn đang chọn
        // -----------------------------------------------------

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
                        maHoaDonDuocChon
                );

        // -----------------------------------------------------
        // 3.5. Lấy giao dịch của hóa đơn đang chọn
        // -----------------------------------------------------

        List<Map<String, Object>> cacThanhToan =
                jdbcTemplate.queryForList(
                        """
                        SELECT
                            MaThanhToan,
                            SoTien,
                            TrangThai
                        FROM thanhtoan
                        WHERE MaHoaDon = ?
                        ORDER BY MaThanhToan
                        """ + khoa,
                        maHoaDonDuocChon
                );

        // -----------------------------------------------------
        // 3.6. Kiểm tra các chỉ định đã có dòng phí ở hóa đơn nào
        // của cùng lịch khám.
        // -----------------------------------------------------

        List<Integer> cacMaChiDinhDaLapPhi =
                jdbcTemplate.queryForList(
                        """
                        SELECT DISTINCT ct.MaChiDinh
                        FROM cthoadon ct
                        JOIN chidinhyte cd
                            ON cd.MaChiDinh = ct.MaChiDinh
                        JOIN hosobenhan hs
                            ON hs.MaHoSoBenhAn = cd.MaHoSoBenhAn
                        WHERE hs.MaLichKham = ?
                          AND ct.MaChiDinh IS NOT NULL
                        """,
                        Integer.class,
                        maLichKham
                );

        Set<Integer> chiDinhDaLapPhi =
                new HashSet<>(cacMaChiDinhDaLapPhi);

        // Phát hiện chỉ định trùng dòng phí trong hóa đơn đang chọn.
        Set<Integer> chiDinhTrongHoaDon = new HashSet<>();

        // -----------------------------------------------------
        // 3.7. Tổng hợp dữ liệu thanh toán
        // -----------------------------------------------------

        Map<Integer, BigDecimal> tienDaPhanBo =
                new HashMap<>();

        Map<Integer, Integer> soDongDaPhanBo =
                new HashMap<>();

        List<ChiPhiCLS> danhSachCLS =
                new ArrayList<>();

        BigDecimal tongDaThanhToan = KHONG;
        BigDecimal tongCanThu = KHONG;

        for (Map<String, Object> dong : cacDong) {

            Integer maCTHoaDon =
                    soNguyen(dong.get("MaCTHoaDon"));

            Integer soLuong =
                    soNguyen(dong.get("SoLuong"));

            BigDecimal donGia =
                    docTien(dong.get("DonGia"));

            BigDecimal thanhTien =
                    docTien(dong.get("ThanhTien"));

            if (maCTHoaDon == null
                    || soLuong == null
                    || soLuong <= 0
                    || donGia.signum() < 0
                    || thanhTien.signum() < 0
                    || donGia.multiply(
                    BigDecimal.valueOf(soLuong)
            ).compareTo(thanhTien) != 0) {

                throw xungDot(
                        "Dòng phí "
                                + maCTHoaDon
                                + " có số lượng hoặc thành tiền không hợp lệ."
                );
            }

            Integer maThanhToan =
                    soNguyen(dong.get("MaThanhToan"));

            boolean daThanhToan = false;

            if (maThanhToan != null) {

                if (!maHoaDonDuocChon.equals(
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

            // Dòng không liên quan chỉ định CLS, ví dụ dòng thuốc.
            if (maChiDinh == null) {
                continue;
            }

            if (!maLichKham.equals(
                    soNguyen(dong.get("MaLichKhamChiDinh"))
            )) {
                throw xungDot(
                        "Có chỉ định trên hóa đơn không thuộc lịch khám này."
                );
            }

            if (!chiDinhTrongHoaDon.add(maChiDinh)) {
                throw xungDot(
                        "Chỉ định "
                                + maChiDinh
                                + " đang có nhiều dòng phí trong hóa đơn."
                );
            }

            Integer maDichVu =
                    soNguyen(dong.get("MaDichVu"));

            if (maDichVu == null
                    || !MA_DICH_VU_CLS.contains(maDichVu)) {
                continue;
            }

            String trangThaiChiDinh =
                    chuoi(dong.get("TrangThaiChiDinh"));

            // Chỉ định chưa thanh toán phải đang chờ thanh toán.
            if (!daThanhToan
                    && !"ChoThanhToan".equals(trangThaiChiDinh)) {

                throw xungDot(
                        "Chỉ định "
                                + maChiDinh
                                + " không ở trạng thái chờ thanh toán. "
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
                tongCanThu =
                        tongCanThu.add(thanhTien);
            }
        }

        // -----------------------------------------------------
        // 3.8. Đối soát giao dịch đã thành công
        // -----------------------------------------------------

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
                        "Giao dịch "
                                + id
                                + " đã thành công nhưng chưa được liên kết "
                                + "đầy đủ với các dòng phí. "
                                + "Cần đối soát trước khi thu tiếp."
                );
            }
        }

        // -----------------------------------------------------
        // 3.9. Kiểm tra chỉ định CLS chưa được lập dòng phí
        // -----------------------------------------------------

        String lyDoChan = "";

        for (Map<String, Object> chiDinh : cacChiDinh) {

            Integer maDichVu =
                    soNguyen(chiDinh.get("MaDichVu"));

            Integer maChiDinh =
                    soNguyen(chiDinh.get("MaChiDinh"));

            if (maDichVu != null
                    && MA_DICH_VU_CLS.contains(maDichVu)
                    && !chiDinhDaLapPhi.contains(maChiDinh)) {

                lyDoChan =
                        "Còn chỉ định CLS chưa có dòng phí "
                                + "trong hóa đơn. Cần lập đủ phí trước khi thu.";

                break;
            }
        }

        // Không kiểm tra trạng thái lịch khám ở đây.
        // Mỗi hóa đơn được thanh toán độc lập.

        if (lyDoChan.isBlank() && danhSachCLS.isEmpty()) {
            lyDoChan = "Hóa đơn chưa có khoản phí CLS.";
        }

        if (lyDoChan.isBlank() && tongCanThu.signum() <= 0) {
            lyDoChan =
                    "Không còn phí CLS có số tiền cần thu. "
                            + "Không tạo giao dịch thanh toán 0 đồng.";
        }

        boolean choPhepThanhToan = lyDoChan.isBlank();

        String thongBao = choPhepThanhToan
                ? "Vui lòng kiểm tra dịch vụ và số tiền trước khi xác nhận."
                : lyDoChan;

        // -----------------------------------------------------
        // 3.10. Trả DTO
        // -----------------------------------------------------

        return new DuLieu(
                new TiepNhanThanhToanCLSDTO(
                        maLichKham,
                        maHoaDonDuocChon,
                        maBenhNhan,
                        tenBenhNhan,
                        trangThaiLich,
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
    // 4. TẠO GIAO DỊCH THANH TOÁN
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
    // 5. KIỂM TRA DỮ LIỆU ĐẦU VÀO
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

            throw khongHopLe(
                    "Thông tin hóa đơn không hợp lệ."
            );
        }

        List<Integer> danhSach = request.maCTHoaDon();

        if (danhSach == null
                || danhSach.isEmpty()
                || danhSach.size() > 500) {

            throw khongHopLe(
                    "Danh sách khoản thu không hợp lệ."
            );
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
            throw khongHopLe(
                    "Số tiền xác nhận phải lớn hơn 0."
            );
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

            throw khongHopLe(
                    "Mã giao dịch tối đa 255 ký tự."
            );
        }
    }

    // =========================================================
    // 6. HÀM HỖ TRỢ
    // =========================================================

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
            throw xungDot(
                    "Có khoản phí thiếu thông tin số tiền."
            );
        }

        return value instanceof BigDecimal tien
                ? tien
                : new BigDecimal(value.toString());
    }

    private ResponseStatusException khongHopLe(
            String message
    ) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }

    private ResponseStatusException xungDot(
            String message
    ) {
        return new ResponseStatusException(
                HttpStatus.CONFLICT,
                message
        );
    }

    // =========================================================
    // 7. OBJECT CHỨA DỮ LIỆU NỘI BỘ
    // =========================================================

    private record DuLieu(
            TiepNhanThanhToanCLSDTO dto,
            List<Map<String, Object>> cacDongHoaDon
    ) {
    }
}
