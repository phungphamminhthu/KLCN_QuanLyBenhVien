
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Entity.ChiDinhYTe;
import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Entity.KetQuaDichVu;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.KetQuaDichVuRepository;

import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@Controller
public class ChuyenTrachChiTietKetQuaController {

    private final KetQuaDichVuRepository ketQuaRepository;

    public ChuyenTrachChiTietKetQuaController(
            KetQuaDichVuRepository ketQuaRepository
    ) {
        this.ketQuaRepository = ketQuaRepository;
    }

    // =====================================================
    // TRANG CHI TIẾT KẾT QUẢ
    // =====================================================

    @GetMapping(
            "/ChuyenTrach/ket-qua-da-thuc-hien/{maChiDinh}"
    )
    public String trangChiTiet(
            @PathVariable Integer maChiDinh
    ) {
        return "ChuyenTrach/chi-tiet-ket-qua";
    }

    // =====================================================
    // API ĐỌC KẾT QUẢ ĐÃ HOÀN THÀNH
    // Không cập nhật bất kỳ trạng thái nào
    // =====================================================

    @ResponseBody
    @GetMapping(
            "/api/chuyen-trach/ket-qua-da-thuc-hien/chi-tiet/{maChiDinh}"
    )
    @Transactional(readOnly = true)
    public Map<String, Object> chiTiet(
            @PathVariable Integer maChiDinh,
            Authentication authentication
    ) {

        // Kiểm tra quyền CHUYENTRACH
        if (authentication == null ||
                !authentication.isAuthenticated() ||
                authentication.getAuthorities()
                        .stream()
                        .noneMatch(a ->
                                "ROLE_CHUYENTRACH"
                                        .equals(a.getAuthority())
                        )) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Bạn không có quyền xem kết quả này."
            );
        }

        // Tìm kết quả của đúng chỉ định
        KetQuaDichVu ketQua = ketQuaRepository
                .findByChiDinhYTe_MaChiDinh(maChiDinh)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Chỉ định chưa có kết quả được lưu."
                        )
                );

        ChiDinhYTe chiDinh = ketQua.getChiDinhYTe();

        // Chỉ cho xem ở trang kết quả đã thực hiện
        // khi chỉ định đã hoàn thành
        if (!"DaHoanThanh".equals(chiDinh.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ định này chưa hoàn thành."
            );
        }

        HoSoBenhAn hoSo = chiDinh.getHoSoBenhAn();

        LichDangKyKham lich =
                hoSo.getLichDangKyKham();

        BenhNhan benhNhan = lich.getBenhNhan();

        NguoiDung nguoiDung =
                benhNhan.getNguoiDung();

        String tenBacSi = null;

        if (lich.getBacSi() != null &&
                lich.getBacSi().getNguoiDung() != null) {

            tenBacSi = lich.getBacSi()
                    .getNguoiDung()
                    .getHoTen();
        }

        Map<String, Object> data =
                new LinkedHashMap<>();

        // Thông tin bệnh nhân
        data.put(
                "maBenhNhan",
                benhNhan.getMaBenhNhan()
        );

        data.put(
                "tenBenhNhan",
                nguoiDung.getHoTen()
        );

        data.put(
                "gioiTinh",
                benhNhan.getGioiTinh()
        );

        data.put(
                "ngaySinh",
                benhNhan.getNgaySinh()
        );

        data.put(
                "soDienThoai",
                docThuocTinh(
                        nguoiDung,
                        "soDienThoai",
                        "sdt",
                        "dienThoai"
                )
        );

        // Hồ sơ và chỉ định
        data.put(
                "maHoSoBenhAn",
                hoSo.getMaHoSoBenhAn()
        );

        data.put(
                "maLichKham",
                lich.getMaLichKham()
        );

        data.put(
                "maChiDinh",
                chiDinh.getMaChiDinh()
        );

        data.put(
                "tenDichVu",
                chiDinh.getDichVuYTe().getTenDichVu()
        );

        // Đây là bác sĩ phụ trách lượt khám,
        // không tự khẳng định là người tạo chỉ định.
        data.put(
                "bacSiPhuTrach",
                tenBacSi
        );

        data.put(
                "ngayChiDinh",
                chiDinh.getNgayChiDinh()
        );

        data.put(
                "trangThaiChiDinh",
                chiDinh.getTrangThai()
        );

        // Kết quả đã lưu
        data.put(
                "maKetQua",
                ketQua.getMaKetQua()
        );

        data.put(
                "ngayCoKetQua",
                ketQua.getNgayCoKetQua()
        );

        data.put(
                "noiDungKetQua",
                ketQua.getNoiDungKetQua()
        );

        data.put(
                "ketLuan",
                ketQua.getKetLuan()
        );

        data.put(
                "fileURL",
                ketQua.getFileURL()
        );

        data.put(
                "trangThaiKetQua",
                ketQua.getTrangThai()
        );

        return data;
    }

    // =====================================================
    // ĐỌC SĐT NẾU NGUOIDUNG CÓ THUỘC TÍNH
    // =====================================================

    private Object docThuocTinh(
            Object object,
            String... thuocTinh
    ) {
        if (object == null) {
            return null;
        }

        BeanWrapper wrapper =
                new BeanWrapperImpl(object);

        for (String ten : thuocTinh) {
            if (wrapper.isReadableProperty(ten)) {
                try {
                    return wrapper.getPropertyValue(ten);
                } catch (Exception ignored) {
                    // Không làm lỗi API khi thiếu dữ liệu phụ.
                }
            }
        }

        return null;
    }
}
