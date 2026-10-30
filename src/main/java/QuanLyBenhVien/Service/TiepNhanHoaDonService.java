package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO;
import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO.ChiTietHoaDonDTO;
import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO.HoaDonItemDTO;
import QuanLyBenhVien.DTO.TiepNhanHoaDonDTO.LanThanhToanDTO;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TiepNhanHoaDonService {

    private static final BigDecimal KHONG =
            new BigDecimal("0.00");

    private static final ZoneId MUI_GIO =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private static final Set<String> LOAI_HOA_DON = Set.of(
            "PhiKham",
            "CanLamSang",
            "TienThuoc"
    );

    private static final Set<String> TRANG_THAI_HOA_DON = Set.of(
            "ChuaThanhToan",
            "ThanhToanMotPhan",
            "DaThanhToan",
            "DaHuy"
    );

    private final JdbcTemplate jdbcTemplate;
    private final TiepNhanPhanCongService phanCongService;

    public TiepNhanHoaDonService(
            JdbcTemplate jdbcTemplate,
            TiepNhanPhanCongService phanCongService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.phanCongService = phanCongService;
    }

    // =====================================================
    // DANH SÁCH HÓA ĐƠN CỦA MỘT LỊCH KHÁM
    // Không tự tạo hóa đơn hoặc xác nhận thanh toán.
    // =====================================================

    @Transactional(
            readOnly = true,
            isolation = Isolation.REPEATABLE_READ
    )
    public TiepNhanHoaDonDTO layDanhSachHoaDon(
            Integer maLichKham,
            Authentication authentication
    ) {
        var caTruc = phanCongService.kiemTraQuyenVoiLichKham(
                authentication,
                maLichKham
        );

        String sqlLichKham = """
                SELECT
                    l.MaLichKham,
                    l.MaBenhNhan,
                    l.MaKhoa,
                    l.NgayKham,
                    l.TrangThai,
                    nd.HoTen,
                    k.TenKhoa

                FROM lichdangkykham l

                JOIN benhnhan bn
                    ON bn.MaBenhNhan = l.MaBenhNhan

                JOIN nguoidung nd
                    ON nd.MaNguoiDung = bn.MaNguoiDung

                JOIN khoa k
                    ON k.MaKhoa = l.MaKhoa

                WHERE l.MaLichKham = ?
                  AND l.MaKhoa = ?
                """;

        List<LichKhamRow> lichKhamRows = jdbcTemplate.query(
                sqlLichKham,
                (rs, rowNum) -> new LichKhamRow(
                        rs.getInt("MaLichKham"),
                        rs.getInt("MaBenhNhan"),
                        rs.getInt("MaKhoa"),
                        rs.getString("HoTen"),
                        rs.getString("TenKhoa"),
                        rs.getObject("NgayKham", LocalDate.class),
                        rs.getString("TrangThai")
                ),
                maLichKham,
                caTruc.maKhoa()
        );

        if (lichKhamRows.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lịch khám trong khoa đang phụ trách."
            );
        }

        LichKhamRow lich = lichKhamRows.get(0);

        String sqlHoaDon = """
                SELECT
                    MaHoaDon,
                    MaBenhNhan,
                    LoaiHoaDon,
                    NgayLapHoaDon,
                    TongTien,
                    TrangThai

                FROM hoadon

                WHERE MaLichKham = ?

                ORDER BY NgayLapHoaDon, MaHoaDon
                """;

        List<HoaDonRow> hoaDonRows = jdbcTemplate.query(
                sqlHoaDon,
                (rs, rowNum) -> new HoaDonRow(
                        rs.getInt("MaHoaDon"),
                        rs.getInt("MaBenhNhan"),
                        rs.getString("LoaiHoaDon"),
                        rs.getObject(
                                "NgayLapHoaDon",
                                LocalDateTime.class
                        ),
                        tien(rs.getBigDecimal("TongTien")),
                        rs.getString("TrangThai")
                ),
                maLichKham
        );

        // Không trả thông tin hóa đơn liên kết sai bệnh nhân.
        for (HoaDonRow hd : hoaDonRows) {
            if (!lich.maBenhNhan().equals(hd.maBenhNhan())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Hóa đơn #" + hd.maHoaDon()
                                + " không khớp bệnh nhân của lịch khám. "
                                + "Cần kiểm tra dữ liệu."
                );
            }
        }

        /*
         * Đọc riêng chi tiết và giao dịch.
         * Tránh JOIN hai danh sách làm nhân bản số tiền.
         */
        Map<Integer, List<ChiTietHoaDonDTO>> chiTietTheoHoaDon =
                layChiTiet(maLichKham);

        Map<Integer, List<LanThanhToanDTO>> thanhToanTheoHoaDon =
                layThanhToan(maLichKham);

        List<HoaDonItemDTO> danhSach = new ArrayList<>();

        BigDecimal tongTien = KHONG;
        BigDecimal tongDaThu = KHONG;
        BigDecimal tongConThu = KHONG;

        long soHoaDonConNo = 0;

        long soHoaDonPhiKham = hoaDonRows.stream()
                .filter(hd ->
                        "PhiKham".equals(hd.loaiHoaDon())
                                && !"DaHuy".equals(hd.trangThai())
                )
                .count();

        boolean phiKhamDaTraDu = false;

        for (HoaDonRow hd : hoaDonRows) {
            List<ChiTietHoaDonDTO> chiTiet =
                    chiTietTheoHoaDon.getOrDefault(
                            hd.maHoaDon(),
                            List.of()
                    );

            List<LanThanhToanDTO> thanhToan =
                    thanhToanTheoHoaDon.getOrDefault(
                            hd.maHoaDon(),
                            List.of()
                    );

            // Chỉ cộng giao dịch có trạng thái DaThanhToan.
            //            BigDecimal daThu = thanhToan.stream()
            //                    .filter(tt ->
            //                            "ThanhCong".equals(tt.trangThai())
            //                    )
            //                    .map(LanThanhToanDTO::soTien)
            //                    .reduce(KHONG, BigDecimal::add);
            BigDecimal daThu = thanhToan.stream()
                    .filter(tt -> "DaThanhToan".equals(tt.trangThai()))
                    .map(LanThanhToanDTO::soTien)
                    .reduce(KHONG, BigDecimal::add);

            boolean daHuy = "DaHuy".equals(hd.trangThai());

            BigDecimal conThu = daHuy
                    ? KHONG
                    : hd.tongTien()
                    .subtract(daThu)
                    .max(KHONG);

            List<String> canhBao = kiemTraHoaDon(
                    hd,
                    chiTiet,
                    thanhToan,
                    daThu
            );

            if (
                    !daHuy
                            && "PhiKham".equals(hd.loaiHoaDon())
                            && soHoaDonPhiKham > 1
            ) {
                canhBao.add(
                        "Có nhiều hóa đơn phí khám còn hiệu lực. "
                                + "Cần kiểm tra trước khi thu tiền."
                );
            }

            boolean duLieuHopLe = canhBao.isEmpty();

            if (!daHuy) {
                tongTien = tongTien.add(hd.tongTien());
                tongConThu = tongConThu.add(conThu);

                if (conThu.signum() > 0) {
                    soHoaDonConNo++;
                }

                if ("PhiKham".equals(hd.loaiHoaDon())) {
                    phiKhamDaTraDu = duLieuHopLe
                            && hd.tongTien().signum() > 0
                            && daThu.compareTo(hd.tongTien()) == 0
                            && "DaThanhToan".equals(hd.trangThai());
                }
            }

            /*
             * Tiền thực tế đã thu vẫn được giữ trong tổng đã thu,
             * kể cả khi hóa đơn bị hủy sau đó.
             * Hóa đơn hủy có tiền đã thu sẽ có cảnh báo riêng.
             */
            tongDaThu = tongDaThu.add(daThu);

            boolean choPhepThu = duLieuHopLe
                    && !daHuy
                    && conThu.signum() > 0;

            // Tiếp nhận không thu tiền thuốc.
            if ("TienThuoc".equals(hd.loaiHoaDon())) {
                choPhepThu = false;

                canhBao.add(
                        "Tiền thuốc do dược sĩ thu. "
                                + "Nhân viên tiếp nhận chỉ xem."
                );
            }

            // Lịch khác ngày được xem lại, chưa cho thu tại luồng này.
            if (!LocalDate.now(MUI_GIO).equals(lich.ngayKham())) {
                choPhepThu = false;

                canhBao.add(
                        "Lịch khám khác ngày hiện tại: chỉ xem viện phí."
                );
            }

            if (
                    Set.of("DaHuy", "KhongDen")
                            .contains(chuoi(lich.trangThai()))
            ) {
                choPhepThu = false;

                canhBao.add(
                        "Lịch khám đã hủy hoặc bệnh nhân không đến: "
                                + "chưa cho thu tiền."
                );
            }

            if (
                    "CanLamSang".equals(hd.loaiHoaDon())
                            && conThu.signum() > 0
                            && !"ChoThanhToan".equals(lich.trangThai())
            ) {
                choPhepThu = false;

                canhBao.add(
                        "Chỉ thu phí CLS khi lịch khám đang Chờ thanh toán."
                );
            }

            if (daHuy) {
                canhBao.add(
                        "Hóa đơn đã hủy, "
                                + "không tính vào số tiền còn phải thu."
                );
            }

            String nhanTrangThai = duLieuHopLe || daHuy
                    ? tenTrangThai(hd.trangThai())
                    : "Cần đối soát";

            danhSach.add(
                    new HoaDonItemDTO(
                            hd.maHoaDon(),
                            hd.loaiHoaDon(),
                            tenLoai(hd.loaiHoaDon()),
                            hd.ngayLapHoaDon(),
                            hd.tongTien(),
                            daThu,
                            conThu,
                            hd.trangThai(),
                            nhanTrangThai,
                            choPhepThu,
                            String.join(" ", canhBao),
                            chiTiet,
                            thanhToan
                    )
            );
        }

        /*
         * Phải có đúng một hóa đơn phí khám còn hiệu lực
         * và hóa đơn đó được thanh toán đủ.
         * Không có hóa đơn không đồng nghĩa với đã thanh toán.
         */
        boolean daThanhToanPhiKham =
                soHoaDonPhiKham == 1 && phiKhamDaTraDu;

        return new TiepNhanHoaDonDTO(
                lich.maLichKham(),
                lich.maBenhNhan(),
                lich.tenBenhNhan(),
                lich.maKhoa(),
                lich.tenKhoa(),
                lich.trangThai(),
                tongTien,
                tongDaThu,
                tongConThu,
                soHoaDonConNo,
                daThanhToanPhiKham,
                danhSach
        );
    }

    // =====================================================
    // CHI TIẾT CỦA CÁC HÓA ĐƠN
    // =====================================================

    private Map<Integer, List<ChiTietHoaDonDTO>> layChiTiet(
            Integer maLichKham
    ) {
        String sql = """
                SELECT
                    ct.MaHoaDon,
                    ct.MaCTHoaDon,
                    ct.MaDichVu,
                    ct.MaChiDinh,
                    ct.MaCTDonThuoc,
                    ct.NoiDung,
                    ct.SoLuong,
                    ct.DonGia,
                    ct.ThanhTien

                FROM cthoadon ct

                JOIN hoadon hd
                    ON hd.MaHoaDon = ct.MaHoaDon

                WHERE hd.MaLichKham = ?

                ORDER BY ct.MaHoaDon, ct.MaCTHoaDon
                """;

        Map<Integer, List<ChiTietHoaDonDTO>> ketQua =
                new HashMap<>();

        jdbcTemplate.query(
                sql,
                (RowCallbackHandler) rs -> {
                    ChiTietHoaDonDTO item =
                            new ChiTietHoaDonDTO(
                                    rs.getInt("MaCTHoaDon"),
                                    rs.getObject(
                                            "MaDichVu",
                                            Integer.class
                                    ),
                                    rs.getObject(
                                            "MaChiDinh",
                                            Integer.class
                                    ),
                                    rs.getObject(
                                            "MaCTDonThuoc",
                                            Integer.class
                                    ),
                                    rs.getString("NoiDung"),
                                    rs.getInt("SoLuong"),
                                    tien(rs.getBigDecimal("DonGia")),
                                    tien(rs.getBigDecimal("ThanhTien"))
                            );

                    ketQua.computeIfAbsent(
                            rs.getInt("MaHoaDon"),
                            key -> new ArrayList<>()
                    ).add(item);
                },
                maLichKham
        );

        return ketQua;
    }

    // =====================================================
    // LỊCH SỬ THANH TOÁN VÀ NGƯỜI THU
    // =====================================================

    private Map<Integer, List<LanThanhToanDTO>> layThanhToan(
            Integer maLichKham
    ) {
        String sql = """
                SELECT
                    tt.MaHoaDon,
                    tt.MaThanhToan,
                    tt.NgayThanhToan,
                    tt.SoTien,
                    tt.PhuongThucThanhToan,
                    tt.TrangThai,
                    tt.MaGiaoDich,
                    tt.MaNguoiThu,
                    nd.HoTen AS TenNguoiThu

                FROM thanhtoan tt

                JOIN hoadon hd
                    ON hd.MaHoaDon = tt.MaHoaDon

                LEFT JOIN nguoidung nd
                    ON nd.MaNguoiDung = tt.MaNguoiThu

                WHERE hd.MaLichKham = ?

                ORDER BY
                    tt.NgayThanhToan DESC,
                    tt.MaThanhToan DESC
                """;

        Map<Integer, List<LanThanhToanDTO>> ketQua =
                new HashMap<>();

        jdbcTemplate.query(
                sql,
                (RowCallbackHandler) rs -> {
                    LanThanhToanDTO item =
                            new LanThanhToanDTO(
                                    rs.getInt("MaThanhToan"),
                                    rs.getObject(
                                            "NgayThanhToan",
                                            LocalDateTime.class
                                    ),
                                    tien(rs.getBigDecimal("SoTien")),
                                    rs.getString("PhuongThucThanhToan"),
                                    rs.getString("TrangThai"),
                                    rs.getString("MaGiaoDich"),
                                    rs.getObject(
                                            "MaNguoiThu",
                                            Integer.class
                                    ),
                                    rs.getString("TenNguoiThu")
                            );

                    ketQua.computeIfAbsent(
                            rs.getInt("MaHoaDon"),
                            key -> new ArrayList<>()
                    ).add(item);
                },
                maLichKham
        );

        return ketQua;
    }

    // =====================================================
    // KIỂM TRA TÍNH NHẤT QUÁN CỦA HÓA ĐƠN
    // Chỉ cảnh báo, không tự sửa dữ liệu.
    // =====================================================

    private List<String> kiemTraHoaDon(
            HoaDonRow hd,
            List<ChiTietHoaDonDTO> chiTiet,
            List<LanThanhToanDTO> thanhToan,
            BigDecimal daThu
    ) {
        List<String> canhBao = new ArrayList<>();

        String loai = chuoi(hd.loaiHoaDon());
        String trangThai = chuoi(hd.trangThai());

        if (!LOAI_HOA_DON.contains(loai)) {
            canhBao.add(
                    "Hóa đơn chưa có loại hợp lệ. "
                            + "Cần phân loại dữ liệu cũ."
            );
        }

        if (!TRANG_THAI_HOA_DON.contains(trangThai)) {
            canhBao.add(
                    "Trạng thái hóa đơn chưa xác định."
            );
        }

        if (chiTiet.isEmpty()) {
            canhBao.add(
                    "Hóa đơn chưa có chi tiết khoản thu."
            );
        }

        if (hd.tongTien().signum() <= 0) {
            canhBao.add(
                    "Hóa đơn chưa có số tiền phải thu hợp lệ."
            );
        }

        BigDecimal tongChiTiet = KHONG;

        boolean nguonHopLe = true;
        boolean thanhTienHopLe = true;

        for (ChiTietHoaDonDTO ct : chiTiet) {
            tongChiTiet = tongChiTiet.add(ct.thanhTien());

            boolean phiKham =
                    ct.maDichVu() != null
                            && ct.maChiDinh() == null
                            && ct.maCTDonThuoc() == null;

            boolean cls =
                    ct.maDichVu() == null
                            && ct.maChiDinh() != null
                            && ct.maCTDonThuoc() == null;

            boolean thuoc =
                    ct.maDichVu() == null
                            && ct.maChiDinh() == null
                            && ct.maCTDonThuoc() != null;

            // Dữ liệu phí khám hiện tại chưa lưu mã nguồn riêng.
            boolean phiKhamTheoNoiDung =
                    ct.maDichVu() == null
                            && ct.maChiDinh() == null
                            && ct.maCTDonThuoc() == null
                            && ct.noiDung() != null
                            && ct.noiDung().trim().startsWith("Phí khám - ");

            boolean nguonChiTietHopLe = switch (loai) {
                case "PhiKham" -> phiKham || phiKhamTheoNoiDung;
                case "CanLamSang" -> cls;
                case "TienThuoc" -> thuoc;
                default -> false;
            };

            if (!nguonChiTietHopLe) {
                nguonHopLe = false;
            }

            BigDecimal thanhTienTinhLai = ct.donGia()
                    .multiply(BigDecimal.valueOf(ct.soLuong()));

            if (ct.soLuong() <= 0
                    || thanhTienTinhLai.compareTo(ct.thanhTien()) != 0) {
                thanhTienHopLe = false;
            }
        }

        if (!nguonHopLe) {
            canhBao.add("Nguồn chi tiết không khớp loại hóa đơn.");
        }

        if (!thanhTienHopLe) {
            canhBao.add(
                    "Số lượng, đơn giá hoặc thành tiền chi tiết không khớp."
            );
        }

        if (tongChiTiet.compareTo(hd.tongTien()) != 0) {
            canhBao.add(
                    "Tổng tiền hóa đơn không khớp tổng chi tiết. "
                            + "Cần đối soát."
            );
        }

        if (daThu.compareTo(hd.tongTien()) > 0) {
            canhBao.add(
                    "Số tiền đã thu vượt tổng hóa đơn. "
                            + "Cần đối soát."
            );
        }

        boolean coTrangThaiChuaXacDinh =
                thanhToan.stream().anyMatch(tt ->
                        !Set.of(
                                "DaThanhToan",
                                "ThanhCong",
                                "ThatBai",
                                "DangXuLy"
                        ).contains(chuoi(tt.trangThai()))
                );

        if (coTrangThaiChuaXacDinh) {
            canhBao.add(
                    "Có giao dịch chưa xác định trạng thái. "
                            + "Cần đối soát trước khi thu thêm."
            );
        }

        boolean coGiaoDichDangXuLy =
                thanhToan.stream().anyMatch(tt ->
                        "DangXuLy".equals(tt.trangThai())
                );

        if (coGiaoDichDangXuLy) {
            canhBao.add(
                    "Có giao dịch đang xử lý. Chưa cho thu thêm."
            );
        }

        if (!"DaHuy".equals(trangThai)) {
            String mongDoi;

            if (daThu.signum() == 0) {
                mongDoi = "ChuaThanhToan";
            } else if (daThu.compareTo(hd.tongTien()) >= 0) {
                mongDoi = "DaThanhToan";
            } else {
                mongDoi = "ThanhToanMotPhan";
            }

            if (!mongDoi.equals(trangThai)) {
                canhBao.add(
                        "Trạng thái hóa đơn không khớp "
                                + "các giao dịch thành công."
                );
            }

            if (
                    daThu.signum() > 0
                            && daThu.compareTo(hd.tongTien()) < 0
            ) {
                canhBao.add(
                        "Hóa đơn đã thu một phần. "
                                + "Cần đối soát phân bổ trước khi thu tiếp."
                );
            }
        } else if (daThu.signum() > 0) {
            canhBao.add(
                    "Hóa đơn đã hủy nhưng có tiền đã thu. "
                            + "Cần kiểm tra xử lý hoàn tiền."
            );
        }

        return canhBao;
    }

    // =====================================================
    // HÀM HỖ TRỢ
    // =====================================================

    private static BigDecimal tien(BigDecimal value) {
        if (value == null || value.signum() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Dữ liệu số tiền bị thiếu hoặc không hợp lệ."
            );
        }

        return value.setScale(
                2,
                RoundingMode.UNNECESSARY
        );
    }

    private static String chuoi(String value) {
        return value == null ? "" : value;
    }

    private static String tenLoai(String loai) {
        return switch (chuoi(loai)) {
            case "PhiKham" -> "Phí khám";
            case "CanLamSang" -> "Cận lâm sàng";
            case "TienThuoc" -> "Tiền thuốc";
            default -> "Chưa phân loại";
        };
    }

    private static String tenTrangThai(String trangThai) {
        return switch (chuoi(trangThai)) {
            case "ChuaThanhToan" -> "Chưa thanh toán";
            case "ThanhToanMotPhan" -> "Đã thanh toán một phần";
            case "DaThanhToan" -> "Đã thanh toán";
            case "DaHuy" -> "Đã hủy";
            default -> "Chưa xác định";
        };
    }

    // =====================================================
    // DỮ LIỆU NỘI BỘ KHI ĐỌC DATABASE
    // =====================================================

    private record LichKhamRow(
            Integer maLichKham,
            Integer maBenhNhan,
            Integer maKhoa,
            String tenBenhNhan,
            String tenKhoa,
            LocalDate ngayKham,
            String trangThai
    ) {
    }

    private record HoaDonRow(
            Integer maHoaDon,
            Integer maBenhNhan,
            String loaiHoaDon,
            LocalDateTime ngayLapHoaDon,
            BigDecimal tongTien,
            String trangThai
    ) {
    }
}
