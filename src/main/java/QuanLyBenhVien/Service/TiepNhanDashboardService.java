package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TiepNhanDashboardDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class TiepNhanDashboardService {

    private final JdbcTemplate jdbcTemplate;

    public TiepNhanDashboardService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public TiepNhanDashboardDTO getDashboardData() {
        TiepNhanDashboardDTO dto = new TiepNhanDashboardDTO();

        try {
            // 1. Tổng số ca có lịch hôm nay (không tính lịch hủy)
            String sqlTongBn = "SELECT COUNT(*) FROM lichdangkykham WHERE DATE(NgayKham) = CURDATE() AND TrangThai != 'DaHuy'";
            Long tongBn = jdbcTemplate.queryForObject(sqlTongBn, Long.class);
            dto.setTongBnHienTai(tongBn != null ? tongBn : 0);

            // 2. Tổng tất cả lịch hẹn hôm nay
            String sqlLichHen = "SELECT COUNT(*) FROM lichdangkykham WHERE DATE(NgayKham) = CURDATE()";
            Long lichHen = jdbcTemplate.queryForObject(sqlLichHen, Long.class);
            dto.setLichHenHomNay(lichHen != null ? lichHen : 0);

            // 3. Đang chờ khám (TrangThai = 'ChoKham')
            String sqlChoKham = "SELECT COUNT(*) FROM lichdangkykham WHERE DATE(NgayKham) = CURDATE() AND TrangThai = 'ChoKham'";
            Long choKham = jdbcTemplate.queryForObject(sqlChoKham, Long.class);
            dto.setBnDangCho(choKham != null ? choKham : 0);

            // 4. Đang trong phòng khám (TrangThai = 'DangKham')
            String sqlDangKham = "SELECT COUNT(*) FROM lichdangkykham WHERE DATE(NgayKham) = CURDATE() AND TrangThai = 'DangKham'";
            Long dangKham = jdbcTemplate.queryForObject(sqlDangKham, Long.class);
            dto.setDangTrongPhongKham(dangKham != null ? dangKham : 0);

            // 5. Chờ thanh toán & Đã thanh toán
            dto.setChoThanhToan(8);
            dto.setDaThanhToan(112);

            // 6. Truy vấn danh sách hàng đợi khám thực tế hôm nay
            String sqlHangDoi =
                    "SELECT l.MaLichKham, l.MaSoThuTu, l.GioKham, l.TrangThai, l.MaBenhNhan, " +
                            "       nd.HoTen, bn.GioiTinh, YEAR(bn.NgaySinh) AS NamSinh " +
                            "FROM lichdangkykham l " +
                            "JOIN benhnhan bn ON l.MaBenhNhan = bn.MaBenhNhan " +
                            "JOIN nguoidung nd ON bn.MaNguoiDung = nd.MaNguoiDung " +
                            "WHERE DATE(l.NgayKham) = CURDATE() " +
                            "ORDER BY l.MaSoThuTu ASC";

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sqlHangDoi);
            List<TiepNhanDashboardDTO.HangDoiItemDTO> items = new ArrayList<>();

            for (Map<String, Object> r : rows) {
                TiepNhanDashboardDTO.HangDoiItemDTO item = new TiepNhanDashboardDTO.HangDoiItemDTO();

                Object sttVal = r.get("MaSoThuTu");
                item.setStt(sttVal != null ? String.format("#%03d", ((Number) sttVal).intValue()) : "#000");

                Object maBnVal = r.get("MaBenhNhan");
                item.setMaBn(maBnVal != null ? String.format("BN-2026-%03d", ((Number) maBnVal).intValue()) : "BN-CHUA_CO");

                item.setTenBenhNhan((String) r.getOrDefault("HoTen", "Bệnh nhân"));

                String namSinh = String.valueOf(r.getOrDefault("NamSinh", "----"));
                String gioiTinh = (String) r.getOrDefault("GioiTinh", "Nam");
                item.setThongTinPhu(namSinh + " • " + gioiTinh + " (BHYT)");

                item.setKhoa("Nội tổng quát");
                item.setBacSi("BS.CKII Lê Hoàng Nam");
                item.setPhong("P.101");

                Object gioVal = r.get("GioKham");
                item.setGioHen(gioVal != null ? gioVal.toString().substring(0, 5) : "--:--");
                item.setThoiGianCho("15 phút");

                String tt = (String) r.getOrDefault("TrangThai", "ChoKham");
                if ("ChoKham".equalsIgnoreCase(tt)) {
                    item.setTrangThai("Chờ gọi vào");
                } else if ("DangKham".equalsIgnoreCase(tt)) {
                    item.setTrangThai("Đang khám");
                } else if ("DaHuy".equalsIgnoreCase(tt)) {
                    item.setTrangThai("Đã hủy");
                } else {
                    item.setTrangThai(tt);
                }

                items.add(item);
            }

            dto.setHangDoiKham(items);

        } catch (Exception e) {
            System.err.println("Lỗi nạp dữ liệu dashboard: " + e.getMessage());
        }

        return dto;
    }

    public boolean updateTrangThaiHangDoi(String maLichKham, String trangThaiMoi) {
        try {
            String sql = "UPDATE lichdangkykham SET TrangThai = ? WHERE MaLichKham = ?";
            jdbcTemplate.update(sql, trangThaiMoi, maLichKham);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}