package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.util.List;

public record TiepNhanThanhToanCLSDTO(
        Integer maLichKham,
        Integer maHoaDon,
        Integer maBenhNhan,
        String tenBenhNhan,
        String trangThaiLichKham,

        List<ChiPhiCLS> danhSachChiPhi,

        BigDecimal tongDaThanhToan,
        BigDecimal tongCanThu,

        boolean choPhepThanhToan,
        String thongBao
) {

    public TiepNhanThanhToanCLSDTO {
        danhSachChiPhi = danhSachChiPhi == null
                ? List.of()
                : List.copyOf(danhSachChiPhi);
    }

    /*
     * Một dòng phí CLS trong chi tiết hóa đơn.
     *
     * Giá và thành tiền lấy từ cthoadon.
     * Không lấy giá dịch vụ hiện tại để thay đổi khoản đã lập.
     *
     * daThanhToan chỉ đúng khi dòng phí liên kết với
     * giao dịch có trạng thái ThanhCong.
     */
    public record ChiPhiCLS(
            Integer maCTHoaDon,
            Integer maChiDinh,
            Integer maDichVu,
            String tenDichVu,
            String tenPhong,
            String trangThaiChiDinh,

            int soLuong,
            BigDecimal donGia,
            BigDecimal thanhTien,

            boolean daThanhToan
    ) {
    }

    /*
     * Dữ liệu giao diện gửi khi nhân viên xác nhận đã thu tiền.
     *
     * maCTHoaDon:
     *     Danh sách các dòng phí CLS đang xác nhận.
     *
     * soTienXacNhan:
     *     Tổng tiền nhân viên đã xem và xác nhận.
     *     Backend phải tự tính lại từ database và đối chiếu.
     *
     * phuongThucThanhToan:
     *     TIEN_MAT hoặc CHUYEN_KHOAN.
     *     Service sẽ chuyển thành giá trị lưu trong database.
     *
     * maGiaoDich:
     *     Mã giao dịch chuyển khoản, nếu có.
     */
    public record XacNhanRequest(
            Integer maHoaDon,
            List<Integer> maCTHoaDon,
            BigDecimal soTienXacNhan,
            String phuongThucThanhToan,
            String maGiaoDich
    ) {
    }

    /*
     * Kết quả sau khi ghi nhận thanh toán thành công.
     *
     * Thanh toán đủ phí CLS cần thực hiện:
     *     ChoThanhToan -> ChoCLS.
     */
    public record KetQua(
            boolean success,
            String message,
            Integer maLichKham,
            Integer maHoaDon,
            Integer maThanhToan,
            BigDecimal soTien,
            String trangThaiLichKham
    ) {
    }
}