package QuanLyBenhVien.DTO;

import java.util.List;

public class DuocSiCapThuocRequest {

    private List<ChiTietCapThuoc> chiTiet;


    public DuocSiCapThuocRequest() {
    }


    public List<ChiTietCapThuoc> getChiTiet() {
        return chiTiet;
    }


    public void setChiTiet(
            List<ChiTietCapThuoc> chiTiet
    ) {
        this.chiTiet = chiTiet;
    }


    // =====================================================
    // CHI TIẾT CẤP THUỐC
    // =====================================================

    public static class ChiTietCapThuoc {

        private Integer maThuoc;

        private Integer soLuongThucCap;


        public ChiTietCapThuoc() {
        }


        public Integer getMaThuoc() {
            return maThuoc;
        }


        public void setMaThuoc(
                Integer maThuoc
        ) {
            this.maThuoc = maThuoc;
        }


        public Integer getSoLuongThucCap() {
            return soLuongThucCap;
        }


        public void setSoLuongThucCap(
                Integer soLuongThucCap
        ) {
            this.soLuongThucCap =
                    soLuongThucCap;
        }
    }
}