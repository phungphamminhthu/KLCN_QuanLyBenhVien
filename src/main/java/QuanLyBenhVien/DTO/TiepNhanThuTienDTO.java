package QuanLyBenhVien.DTO;

import java.math.BigDecimal;

public class TiepNhanThuTienDTO {

    /*
     * Mã lịch khám đang mở trên giao diện.
     * Service kiểm tra hóa đơn có thuộc lịch khám này không.
     */
    private Integer maLichKham;

    /*
     * Số tiền nhân viên đang xác nhận thu.
     *
     * Service phải lấy số tiền từ database để đối chiếu.
     * Không sử dụng trực tiếp giá trị này làm số tiền phải thu.
     */
    private BigDecimal soTien;

    /*
     * Giá trị giao diện gửi:
     * - TIEN_MAT
     * - CHUYEN_KHOAN
     *
     * Service chuyển thành giá trị lưu trong database:
     * - Tiền mặt
     * - Chuyển khoản
     */
    private String phuongThucThanhToan;

    /*
     * Mã giao dịch ngân hàng khi chuyển khoản.
     * Thanh toán tiền mặt không cần nhập.
     */
    private String maGiaoDich;

    public TiepNhanThuTienDTO() {
    }

    public Integer getMaLichKham() {
        return maLichKham;
    }

    public void setMaLichKham(Integer maLichKham) {
        this.maLichKham = maLichKham;
    }

    public BigDecimal getSoTien() {
        return soTien;
    }

    public void setSoTien(BigDecimal soTien) {
        this.soTien = soTien;
    }

    public String getPhuongThucThanhToan() {
        return phuongThucThanhToan;
    }

    public void setPhuongThucThanhToan(
            String phuongThucThanhToan
    ) {
        this.phuongThucThanhToan = phuongThucThanhToan;
    }

    public String getMaGiaoDich() {
        return maGiaoDich;
    }

    public void setMaGiaoDich(String maGiaoDich) {
        this.maGiaoDich = maGiaoDich;
    }
}