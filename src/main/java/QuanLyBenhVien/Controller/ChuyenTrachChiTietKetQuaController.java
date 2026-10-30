package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Entity.ChiDinhYTe;
import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Entity.KetQuaDichVu;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.KetQuaDichVuRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.List;

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

    @PersistenceContext
    private EntityManager em;


    public ChuyenTrachChiTietKetQuaController(
            KetQuaDichVuRepository ketQuaRepository
    ) {
        this.ketQuaRepository = ketQuaRepository;
    }

    // =====================================================
    // TRANG CHI TIẾT KẾT QUẢ
    // =====================================================
// Trang chi tiết một chỉ định: CT, siêu âm, nội soi...
    @GetMapping("/ChuyenTrach/ket-qua-da-thuc-hien/{maChiDinh}")

    public String trangChiTiet(
            @PathVariable Integer maChiDinh
    ) {
        return "ChuyenTrach/chi-tiet-ket-qua";
    }


    // Trang chi tiết toàn bộ phiếu xét nghiệm
    @GetMapping("/ChuyenTrach/ket-qua-da-thuc-hien/phieu/{maPhieu}")
    public String trangChiTietPhieu(
            @PathVariable String maPhieu
    ) {
        return "ChuyenTrach/chi-tiet-ket-qua";
    }

    // ====================================================
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

    @ResponseBody
    @GetMapping(
            "/api/chuyen-trach/ket-qua-da-thuc-hien/phieu/{maPhieu}"
    )
    @Transactional(readOnly = true)
    public Map<String, Object> chiTietPhieu(
            @PathVariable String maPhieu,
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getAuthorities().stream()
                .noneMatch(a -> "ROLE_CHUYENTRACH"
                        .equals(a.getAuthority()))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Không có quyền xem phiếu xét nghiệm"
            );
        }

        // Lấy các chỉ định thuộc đúng mã phiếu từ MySQL
        @SuppressWarnings("unchecked")
        List<Number> ids = em.createNativeQuery("""
            SELECT MaChiDinh
            FROM ChiDinhYTe
            WHERE MaPhieuChiDinh = :maPhieu
            ORDER BY MaChiDinh
            """)
                .setParameter("maPhieu", maPhieu)
                .getResultList();

        if (ids.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy phiếu xét nghiệm"
            );
        }

        List<Map<String, Object>> danhSach = new ArrayList<>();
        ChiDinhYTe dauTien = null;
        Integer maHoSo = null;

        for (Number id : ids) {
            ChiDinhYTe chiDinh = em.find(
                    ChiDinhYTe.class,
                    id.intValue()
            );

            if (chiDinh == null) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy chỉ định trong phiếu"
                );
            }

            if (dauTien == null) {
                dauTien = chiDinh;
                maHoSo = chiDinh.getHoSoBenhAn()
                        .getMaHoSoBenhAn();
            }

            // Không cho gộp nhầm dữ liệu của hồ sơ khác
            if (!maHoSo.equals(
                    chiDinh.getHoSoBenhAn().getMaHoSoBenhAn()
            )) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Phiếu chứa chỉ định thuộc nhiều hồ sơ"
                );
            }

            String loai = String.valueOf(
                    chiDinh.getDichVuYTe().getLoaiDichVu()
            );

            if (!"Xét nghiệm".equalsIgnoreCase(loai.trim())
                    || !"DaHoanThanh".equals(
                    chiDinh.getTrangThai())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Phiếu có chỉ định không phải xét nghiệm "
                                + "hoặc chưa hoàn thành"
                );
            }

            KetQuaDichVu ketQua = ketQuaRepository
                    .findByChiDinhYTe_MaChiDinh(
                            chiDinh.getMaChiDinh()
                    )
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.CONFLICT,
                                    "Có xét nghiệm chưa có kết quả"
                            )
                    );

            Map<String, Object> item = new LinkedHashMap<>();

            item.put("maChiDinh", chiDinh.getMaChiDinh());
            item.put("tenDichVu",
                    chiDinh.getDichVuYTe().getTenDichVu());
            item.put("nhomXetNghiem",
                    docThuocTinh(
                            chiDinh.getDichVuYTe(),
                            "nhomXetNghiem"
                    ));
            item.put("noiDungKetQua",
                    ketQua.getNoiDungKetQua());
            item.put("ketLuan", ketQua.getKetLuan());
            item.put("ngayCoKetQua",
                    ketQua.getNgayCoKetQua());
            item.put("fileURL", ketQua.getFileURL());

            danhSach.add(item);
        }

        LichDangKyKham lich = dauTien
                .getHoSoBenhAn()
                .getLichDangKyKham();

        BenhNhan benhNhan = lich.getBenhNhan();

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("maPhieuChiDinh", maPhieu);
        result.put("maHoSoBenhAn", maHoSo);
        result.put("maBenhNhan", benhNhan.getMaBenhNhan());
        result.put("tenBenhNhan",
                benhNhan.getNguoiDung().getHoTen());
        result.put("gioiTinh", benhNhan.getGioiTinh());
        result.put("ngaySinh", benhNhan.getNgaySinh());

        result.put("bacSiPhuTrach",
                lich.getBacSi().getNguoiDung().getHoTen());

        result.put("ngayChiDinh",
                dauTien.getNgayChiDinh());

        result.put("soXetNghiem", danhSach.size());
        result.put("danhSachXetNghiem", danhSach);

        return result;
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
