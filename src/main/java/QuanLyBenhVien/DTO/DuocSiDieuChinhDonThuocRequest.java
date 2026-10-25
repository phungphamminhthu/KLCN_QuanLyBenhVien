
package QuanLyBenhVien.DTO;

import java.util.List;

public class DuocSiDieuChinhDonThuocRequest {

    private List<ChiTietDieuChinh> chiTietDieuChinh;

    public List<ChiTietDieuChinh> getChiTietDieuChinh() {
        return chiTietDieuChinh;
    }

    public void setChiTietDieuChinh(
            List<ChiTietDieuChinh> chiTietDieuChinh
    ) {
        this.chiTietDieuChinh = chiTietDieuChinh;
    }

    public static class ChiTietDieuChinh {

        private Integer maCTDonThuoc;
        private Integer soLuong;
        private Integer thoiGianDung;
        private Integer maThuocThayThe;

        public Integer getMaCTDonThuoc() {
            return maCTDonThuoc;
        }

        public void setMaCTDonThuoc(Integer maCTDonThuoc) {
            this.maCTDonThuoc = maCTDonThuoc;
        }

        public Integer getSoLuong() {
            return soLuong;
        }

        public void setSoLuong(Integer soLuong) {
            this.soLuong = soLuong;
        }

        public Integer getThoiGianDung() {
            return thoiGianDung;
        }

        public void setThoiGianDung(Integer thoiGianDung) {
            this.thoiGianDung = thoiGianDung;
        }

        public Integer getMaThuocThayThe() {
            return maThuocThayThe;
        }

        public void setMaThuocThayThe(Integer maThuocThayThe) {
            this.maThuocThayThe = maThuocThayThe;
        }
    }
}
