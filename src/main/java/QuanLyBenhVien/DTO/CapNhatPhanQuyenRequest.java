package QuanLyBenhVien.DTO;

import java.util.List;

public class CapNhatPhanQuyenRequest {

    private List<QuyenItemDTO> danhSachQuyen;

    public List<QuyenItemDTO> getDanhSachQuyen() {
        return danhSachQuyen;
    }

    public void setDanhSachQuyen(List<QuyenItemDTO> danhSachQuyen) {
        this.danhSachQuyen = danhSachQuyen;
    }
}