package QuanLyBenhVien.DTO;

import java.util.List;

public class TaoDotChiDinhCLSRequest {

    private Integer maLichKham;
    private Integer maPhong;
    private List<Integer> maDichVuList;

    public Integer getMaLichKham() {
        return maLichKham;
    }

    public void setMaLichKham(Integer maLichKham) {
        this.maLichKham = maLichKham;
    }

    public Integer getMaPhong() {
        return maPhong;
    }

    public void setMaPhong(Integer maPhong) {
        this.maPhong = maPhong;
    }

    public List<Integer> getMaDichVuList() {
        return maDichVuList;
    }

    public void setMaDichVuList(List<Integer> maDichVuList) {
        this.maDichVuList = maDichVuList;
    }
}