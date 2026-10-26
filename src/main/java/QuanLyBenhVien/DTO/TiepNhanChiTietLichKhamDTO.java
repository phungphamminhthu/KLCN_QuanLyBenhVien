package QuanLyBenhVien.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Thông tin chỉ đọc của một lịch khám.
 */
public record TiepNhanChiTietLichKhamDTO(

        // Thông tin lịch khám
        Integer maLichKham,
        Integer maBenhNhan,
        String tenBenhNhan,
        LocalDate ngayKham,
        LocalTime gioKham,
        Integer soThuTu,

        Integer maKhoa,
        String khoa,

        Integer maBacSi,
        String bacSi,

        String phong,
        String trangThai,
        String lyDoKham,

        // Nhân viên thực tế đã tiếp nhận lịch khám này
        Integer maTiepNhan,
        Integer maNhanVienTiepNhan,
        String tenNhanVienTiepNhan,
        Integer maPhanCong,
        LocalDateTime thoiGianTiepNhan,

        // Số đo được lưu theo lịch khám
        BigDecimal canNang,
        BigDecimal chieuCao,
        Integer huyetApTamThu,
        Integer huyetApTamTruong,

        // Thông tin khám bệnh do bác sĩ ghi nhận
        Integer maHoSoBenhAn,
        String trieuChung,
        String chanDoan,
        String ketLuan,
        String huongDieuTri,
        LocalDate ngayTaiKham,
        String ghiChuTaiKham,

        // Danh sách chỉ định của lịch khám
        List<ChiDinhDTO> danhSachChiDinh
) {

    public TiepNhanChiTietLichKhamDTO {
        danhSachChiDinh = danhSachChiDinh == null
                ? List.of()
                : List.copyOf(danhSachChiDinh);
    }

    /**
     * Thông tin một chỉ định cận lâm sàng.
     */
    public record ChiDinhDTO(
            Integer maChiDinh,
            Integer maDichVu,
            String tenDichVu,
            String loaiChiDinh,

            Integer maPhong,
            String tenPhong,

            LocalDateTime ngayChiDinh,
            String trangThai
    ) {
    }
}