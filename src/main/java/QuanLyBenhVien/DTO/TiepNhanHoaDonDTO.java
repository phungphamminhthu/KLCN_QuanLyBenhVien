package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Thông tin viện phí của một lịch khám.
 *
 * Bao gồm hóa đơn chưa thanh toán, đã thanh toán
 * và đã hủy.
 */
public record TiepNhanHoaDonDTO(
        Integer maLichKham,
        Integer maBenhNhan,
        String tenBenhNhan,

        Integer maKhoa,
        String tenKhoa,
        String trangThaiLichKham,

        // Tổng tiền các hóa đơn còn hiệu lực, không tính hóa đơn hủy.
        BigDecimal tongTienHieuLuc,

        // Tổng tiền thanh toán thành công.
        BigDecimal tongDaThanhToan,

        // Tổng số tiền còn phải thu của các hóa đơn còn hiệu lực.
        BigDecimal tongConPhaiThu,

        long soHoaDonConNo,

        // Chỉ true khi có hóa đơn phí khám hợp lệ đã thanh toán đủ.
        boolean daThanhToanPhiKham,

        List<HoaDonItemDTO> danhSachHoaDon
) {

    public TiepNhanHoaDonDTO {
        danhSachHoaDon = danhSachHoaDon == null
                ? List.of()
                : List.copyOf(danhSachHoaDon);
    }

    /**
     * Một hóa đơn trong danh sách viện phí.
     *
     * Loại hóa đơn:
     * - PhiKham
     * - CanLamSang
     * - TienThuoc
     */
    public record HoaDonItemDTO(
            Integer maHoaDon,

            String loaiHoaDon,
            String tenLoaiHoaDon,

            LocalDateTime ngayLapHoaDon,

            BigDecimal tongTien,
            BigDecimal daThanhToan,
            BigDecimal conPhaiThu,

            String trangThai,
            String trangThaiHienThi,

            // Backend quyết định quyền thu tiền.
            boolean choPhepThanhToan,

            // Lý do không được thu hoặc cảnh báo dữ liệu.
            String thongBao,

            List<ChiTietHoaDonDTO> chiTiet,
            List<LanThanhToanDTO> lichSuThanhToan
    ) {

        public HoaDonItemDTO {
            chiTiet = chiTiet == null
                    ? List.of()
                    : List.copyOf(chiTiet);

            lichSuThanhToan = lichSuThanhToan == null
                    ? List.of()
                    : List.copyOf(lichSuThanhToan);
        }
    }

    /**
     * Một dòng dịch vụ hoặc thuốc trên hóa đơn.
     *
     * Giá lấy từ hóa đơn đã lập để giữ nguyên lịch sử,
     * không lấy giá hiện tại trong danh mục để ghi đè.
     */
    public record ChiTietHoaDonDTO(
            Integer maCTHoaDon,

            // Phí khám trực tiếp.
            Integer maDichVu,

            // Dịch vụ CLS theo chỉ định.
            Integer maChiDinh,

            // Thuốc trong đơn.
            Integer maCTDonThuoc,

            String noiDung,
            int soLuong,

            BigDecimal donGia,
            BigDecimal thanhTien
    ) {
    }

    /**
     * Một lần thanh toán của hóa đơn.
     *
     * Người thu có thể null đối với dữ liệu cũ.
     */
    public record LanThanhToanDTO(
            Integer maThanhToan,
            LocalDateTime ngayThanhToan,

            BigDecimal soTien,
            String phuongThucThanhToan,
            String trangThai,
            String maGiaoDich,

            Integer maNguoiThu,
            String tenNguoiThu
    ) {
    }
}