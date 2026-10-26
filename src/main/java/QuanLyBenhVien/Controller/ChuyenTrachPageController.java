package QuanLyBenhVien.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class ChuyenTrachPageController {

    @GetMapping({
            "/ChuyenTrach/dashboard",
            "/ChuyenTrach/dashboard.html"
    })
    public String dashboard() {
        return "ChuyenTrach/dashboard";
    }
    @GetMapping("/ChuyenTrach/nhap-ket-qua/{maLichKham}")
    public String nhapKetQua(
            @org.springframework.web.bind.annotation.PathVariable
            Integer maLichKham
    ) {
        return "ChuyenTrach/nhap-ket-qua";
    }
    @GetMapping("/ChuyenTrach/benh-nhan")
    public String danhSachBenhNhan() {
        return "ChuyenTrach/benh-nhan";
    }

    @GetMapping("/ChuyenTrach/benh-nhan-cho")
    public String benhNhanDangCho() {
        return "ChuyenTrach/benh-nhan-cho";
    }

    @GetMapping("/ChuyenTrach/chi-dinh")
    public String danhSachChiDinh() {
        return "ChuyenTrach/chi-dinh";
    }


    @GetMapping("/ChuyenTrach/chi-dinh/{maChiDinh}")
    public String chiTietChiDinh(
            @PathVariable Integer maChiDinh
    ) {
        return "ChuyenTrach/chi-tiet-chi-dinh";
    }


    @GetMapping("/ChuyenTrach/ket-qua-da-thuc-hien")
    public String ketQuaDaThucHien() {
        return "ChuyenTrach/ket-qua-da-thuc-hien";
    }


}