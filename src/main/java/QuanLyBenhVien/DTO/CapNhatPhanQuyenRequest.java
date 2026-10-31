package QuanLyBenhVien.DTO;

import java.util.List;

public class CapNhatPhanQuyenRequest {

    private List<QuyenItemDTO> DanhSachQuyen;

    public List<QuyenItemDTO> getDanhSachQuyen() {
        return DanhSachQuyen;
    }

    public void setDanhSachQuyen(List<QuyenItemDTO> DanhSachQuyen) {
        this.DanhSachQuyen = DanhSachQuyen;
    }
}