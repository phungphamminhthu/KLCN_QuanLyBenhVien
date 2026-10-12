package QuanLyBenhVien.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThongKeBaoCaoResponse {

    private Long tongLuotKham;

    private BigDecimal tongDoanhThu;

    private Long tongBenhNhan;

    private List<ThongKeTheoNgay> luotKhamTheoNgay;

    private List<ThongKeTheoNgay> doanhThuTheoNgay;

    private List<KhoaOption> danhSachKhoa;


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ThongKeTheoNgay {

        private String label;

        private Long luotKham;

        private BigDecimal doanhThu;
    }


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KhoaOption {

        private Integer maKhoa;

        private String tenKhoa;
    }
}
