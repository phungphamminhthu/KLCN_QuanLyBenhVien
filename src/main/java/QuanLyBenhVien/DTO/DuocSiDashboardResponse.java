package QuanLyBenhVien.DTO;

import java.util.List;

public class DuocSiDashboardResponse {

    private long donThuocChoCap;
    private long daCapHomNay;
    private long soLoaiThuocTrongKho;
    private long thuocSapHetHan;
    private long thuocDaHetHan;
    private long thuocSapHetTon;

    private List<PrescriptionItem> donThuoc;
    private StockWarning stockWarning;


    // =====================================================
    // GETTER / SETTER
    // =====================================================

    public long getDonThuocChoCap() {
        return donThuocChoCap;
    }

    public void setDonThuocChoCap(long donThuocChoCap) {
        this.donThuocChoCap = donThuocChoCap;
    }


    public long getDaCapHomNay() {
        return daCapHomNay;
    }

    public void setDaCapHomNay(long daCapHomNay) {
        this.daCapHomNay = daCapHomNay;
    }


    public long getSoLoaiThuocTrongKho() {
        return soLoaiThuocTrongKho;
    }

    public void setSoLoaiThuocTrongKho(long soLoaiThuocTrongKho) {
        this.soLoaiThuocTrongKho = soLoaiThuocTrongKho;
    }


    public long getThuocSapHetHan() {
        return thuocSapHetHan;
    }

    public void setThuocSapHetHan(long thuocSapHetHan) {
        this.thuocSapHetHan = thuocSapHetHan;
    }


    public long getThuocDaHetHan() {
        return thuocDaHetHan;
    }

    public void setThuocDaHetHan(long thuocDaHetHan) {
        this.thuocDaHetHan = thuocDaHetHan;
    }


    public long getThuocSapHetTon() {
        return thuocSapHetTon;
    }

    public void setThuocSapHetTon(long thuocSapHetTon) {
        this.thuocSapHetTon = thuocSapHetTon;
    }


    public List<PrescriptionItem> getDonThuoc() {
        return donThuoc;
    }

    public void setDonThuoc(List<PrescriptionItem> donThuoc) {
        this.donThuoc = donThuoc;
    }


    public StockWarning getStockWarning() {
        return stockWarning;
    }

    public void setStockWarning(StockWarning stockWarning) {
        this.stockWarning = stockWarning;
    }


    // =====================================================
    // PRESCRIPTION ITEM
    // =====================================================

    public static class PrescriptionItem {

        private Integer maDonThuoc;
        private String maHienThi;
        private String benhNhan;
        private String bacSi;
        private String ngayKe;
        private int soLoaiThuoc;
        private String trangThai;


        public Integer getMaDonThuoc() {
            return maDonThuoc;
        }

        public void setMaDonThuoc(Integer maDonThuoc) {
            this.maDonThuoc = maDonThuoc;
        }


        public String getMaHienThi() {
            return maHienThi;
        }

        public void setMaHienThi(String maHienThi) {
            this.maHienThi = maHienThi;
        }


        public String getBenhNhan() {
            return benhNhan;
        }

        public void setBenhNhan(String benhNhan) {
            this.benhNhan = benhNhan;
        }


        public String getBacSi() {
            return bacSi;
        }

        public void setBacSi(String bacSi) {
            this.bacSi = bacSi;
        }


        public String getNgayKe() {
            return ngayKe;
        }

        public void setNgayKe(String ngayKe) {
            this.ngayKe = ngayKe;
        }


        public int getSoLoaiThuoc() {
            return soLoaiThuoc;
        }

        public void setSoLoaiThuoc(int soLoaiThuoc) {
            this.soLoaiThuoc = soLoaiThuoc;
        }


        public String getTrangThai() {
            return trangThai;
        }

        public void setTrangThai(String trangThai) {
            this.trangThai = trangThai;
        }
    }


    // =====================================================
    // STOCK WARNING
    // =====================================================

    public static class StockWarning {

        private long sapHet;
        private long sapHetHan;
        private long hetHan;


        public StockWarning() {
        }


        public StockWarning(
                long sapHet,
                long sapHetHan,
                long hetHan
        ) {
            this.sapHet = sapHet;
            this.sapHetHan = sapHetHan;
            this.hetHan = hetHan;
        }


        public long getSapHet() {
            return sapHet;
        }

        public void setSapHet(long sapHet) {
            this.sapHet = sapHet;
        }


        public long getSapHetHan() {
            return sapHetHan;
        }

        public void setSapHetHan(long sapHetHan) {
            this.sapHetHan = sapHetHan;
        }


        public long getHetHan() {
            return hetHan;
        }

        public void setHetHan(long hetHan) {
            this.hetHan = hetHan;
        }
    }
}