package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.ThuocRequest;
import QuanLyBenhVien.DTO.ThuocResponse;
import QuanLyBenhVien.Entity.KhoThuoc;
import QuanLyBenhVien.Entity.Thuoc;
import QuanLyBenhVien.Repository.KhoThuocRepository;
import QuanLyBenhVien.Repository.ThuocRepository;
import QuanLyBenhVien.Repository.ThuocTuongDuongRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

@Service
@Transactional
public class ThuocService {

    private final ThuocRepository thuocRepository;
    private final KhoThuocRepository khoThuocRepository;
    private final ThuocTuongDuongRepository thuocTuongDuongRepository;
    private final ThongBaoService thongBaoService;

    public ThuocService(
            ThuocRepository thuocRepository,
            KhoThuocRepository khoThuocRepository,
            ThuocTuongDuongRepository thuocTuongDuongRepository,
            ThongBaoService thongBaoService) {

        this.thuocRepository = thuocRepository;
        this.khoThuocRepository = khoThuocRepository;
        this.thuocTuongDuongRepository = thuocTuongDuongRepository;
        this.thongBaoService = thongBaoService;
    }

    // =========================================================
    // GET ALL
    // =========================================================

    @Transactional(readOnly = true)
    public List<ThuocResponse> getAll() {

        return thuocRepository
                .findAllByOrderByMaThuocAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================================
    // GET BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public ThuocResponse getById(Integer id) {

        Thuoc thuoc = thuocRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy thuốc có mã: " + id
                        )
                );

        return toResponse(thuoc);
    }

    // =========================================================
    // CREATE
    // =========================================================

    public ThuocResponse create(ThuocRequest request) {

        validateRequest(request);

        Thuoc thuoc = new Thuoc();

        thuoc.setTenThuoc(
                request.getTenThuoc().trim()
        );

        thuoc.setDonViTinh(
                normalize(request.getDonViTinh())
        );

        thuoc.setNhaSanXuat(
                normalize(request.getNhaSanXuat())
        );

        thuoc.setGia(
                request.getGia()
        );

        thuoc.setMoTa(
                normalize(request.getMoTa())
        );

        thuoc.setTrangThai(
                request.getTrangThai() == null
                        ? true
                        : request.getTrangThai()
        );

        Thuoc saved = thuocRepository.save(thuoc);

        // =====================================================
        // THÔNG BÁO
        // =====================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Thuốc mới được thêm",
                "Thuốc \"" + saved.getTenThuoc()
                        + "\" đã được thêm vào hệ thống.",
                "THUOC"
        );

        return toResponse(saved);
    }

    // =========================================================
    // UPDATE
    // =========================================================

    public ThuocResponse update(
            Integer id,
            ThuocRequest request) {

        validateRequest(request);

        Thuoc thuoc = thuocRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy thuốc có mã: " + id
                        )
                );

        thuoc.setTenThuoc(
                request.getTenThuoc().trim()
        );

        thuoc.setDonViTinh(
                normalize(request.getDonViTinh())
        );

        thuoc.setNhaSanXuat(
                normalize(request.getNhaSanXuat())
        );

        thuoc.setGia(
                request.getGia()
        );

        thuoc.setMoTa(
                normalize(request.getMoTa())
        );

        if (request.getTrangThai() != null) {

            thuoc.setTrangThai(
                    request.getTrangThai()
            );
        }

        Thuoc updated = thuocRepository.save(thuoc);

        // =====================================================
        // THÔNG BÁO
        // =====================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Thông tin thuốc đã thay đổi",
                "Thuốc \"" + updated.getTenThuoc()
                        + "\" đã được cập nhật.",
                "THUOC"
        );

        return toResponse(updated);
    }

    // =========================================================
    // DELETE / NGỪNG SỬ DỤNG
    // =========================================================

    public String delete(Integer id) {

        Thuoc thuoc = thuocRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy thuốc có mã: " + id
                        )
                );

        String tenThuoc = thuoc.getTenThuoc();

        // =====================================================
        // KIỂM TRA CÓ DỮ LIỆU KHO HAY KHÔNG
        // =====================================================

        boolean coTrongKho =
                khoThuocRepository.existsByThuoc_MaThuoc(id);

        // =====================================================
        // KIỂM TRA CÓ THUỐC TƯƠNG ĐƯƠNG HAY KHÔNG
        // =====================================================

        boolean coThuocTuongDuong =
                thuocTuongDuongRepository
                        .existsByThuoc_MaThuocOrThuocThayThe_MaThuoc(
                                id,
                                id
                        );

        // =====================================================
        // ĐÃ CÓ DỮ LIỆU LIÊN QUAN
        // => KHÔNG XÓA CỨNG
        // => CHUYỂN NGỪNG SỬ DỤNG
        // =====================================================

        if (coTrongKho || coThuocTuongDuong) {

            thuoc.setTrangThai(false);

            thuocRepository.save(thuoc);

            String lyDo;

            if (coTrongKho && coThuocTuongDuong) {

                lyDo = "đã có dữ liệu kho thuốc và thuốc tương đương";

            } else if (coTrongKho) {

                lyDo = "đã có dữ liệu kho thuốc";

            } else {

                lyDo = "đã được thiết lập thuốc tương đương";
            }

            // =================================================
            // THÔNG BÁO
            // =================================================

            thongBaoService.taoThongBaoTheoVaiTro(
                    List.of("ADMIN", "DUOCSI"),
                    "Thuốc đã ngừng sử dụng",
                    "Thuốc \"" + tenThuoc
                            + "\" không thể xóa hoàn toàn vì "
                            + lyDo
                            + ". Hệ thống đã chuyển thuốc sang "
                            + "trạng thái \"Ngừng sử dụng\".",
                    "THUOC"
            );

            return "Thuốc đã có dữ liệu liên quan nên được chuyển "
                    + "sang trạng thái Ngừng sử dụng.";
        }

        // =====================================================
        // CHƯA CÓ DỮ LIỆU LIÊN QUAN
        // => XÓA THẬT
        // =====================================================

        thuocRepository.delete(thuoc);

        // =====================================================
        // THÔNG BÁO
        // =====================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Thuốc đã bị xóa",
                "Thuốc \"" + tenThuoc
                        + "\" đã được xóa khỏi hệ thống.",
                "THUOC"
        );

        return "Đã xóa thuốc khỏi hệ thống.";
    }

    // =========================================================
    // CHUYỂN ENTITY -> RESPONSE
    // =========================================================

    private ThuocResponse toResponse(Thuoc thuoc) {

        /*
         * Một thuốc có thể có nhiều lô trong KhoThuoc.
         *
         * Ví dụ:
         *
         * Thuốc A
         * ├── Lô A01: 100 viên - HSD 01/2027
         * ├── Lô A02: 50 viên  - HSD 06/2027
         * └── Lô A03: 80 viên  - HSD 12/2027
         *
         * => Số lượng tồn = 230
         * => HSD hiển thị = 01/2027
         * => Số lô hiển thị = A01
         */

        List<KhoThuoc> khoList =
                khoThuocRepository
                        .findByThuoc_MaThuocOrderByHanSuDungAsc(
                                thuoc.getMaThuoc()
                        );

        int tongSoLuongTon = 0;

        int soLuongToiThieu = 0;

        String soLo = null;

        java.time.LocalDate hanSuDung = null;

        if (khoList != null && !khoList.isEmpty()) {

            // =================================================
            // TỔNG TỒN
            // =================================================

            tongSoLuongTon = khoList.stream()
                    .filter(k -> k.getSoLuongTon() != null)
                    .mapToInt(KhoThuoc::getSoLuongTon)
                    .sum();

            // =================================================
            // MỨC TỒN TỐI THIỂU
            // =================================================

            soLuongToiThieu = khoList.stream()
                    .filter(k -> k.getSoLuongToiThieu() != null)
                    .mapToInt(KhoThuoc::getSoLuongToiThieu)
                    .min()
                    .orElse(0);

            // =================================================
            // LÔ CÓ HẠN SỬ DỤNG GẦN NHẤT
            // =================================================

            KhoThuoc loGanNhat = khoList.stream()
                    .filter(k -> k.getHanSuDung() != null)
                    .min(
                            Comparator.comparing(
                                    KhoThuoc::getHanSuDung
                            )
                    )
                    .orElse(null);

            if (loGanNhat != null) {

                soLo = loGanNhat.getSoLo();

                hanSuDung = loGanNhat.getHanSuDung();
            }
        }

        // =====================================================
        // RESPONSE
        // =====================================================

        return new ThuocResponse(
                thuoc.getMaThuoc(),
                thuoc.getTenThuoc(),
                thuoc.getDonViTinh(),
                thuoc.getNhaSanXuat(),
                thuoc.getGia(),
                thuoc.getMoTa(),
                thuoc.getTrangThai(),

                // ===== THÔNG TIN KHO =====
                tongSoLuongTon,
                soLuongToiThieu,
                soLo,
                hanSuDung
        );
    }

    // =========================================================
    // VALIDATE
    // =========================================================

    private void validateRequest(
            ThuocRequest request) {

        if (request == null) {

            throw new IllegalArgumentException(
                    "Dữ liệu thuốc không được để trống."
            );
        }

        if (request.getTenThuoc() == null
                || request.getTenThuoc().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Tên thuốc không được để trống."
            );
        }

        if (request.getTenThuoc().trim().length() > 255) {

            throw new IllegalArgumentException(
                    "Tên thuốc không được vượt quá 255 ký tự."
            );
        }

        if (request.getDonViTinh() != null
                && request.getDonViTinh().trim().length() > 50) {

            throw new IllegalArgumentException(
                    "Đơn vị tính không được vượt quá 50 ký tự."
            );
        }

        if (request.getNhaSanXuat() != null
                && request.getNhaSanXuat().trim().length() > 255) {

            throw new IllegalArgumentException(
                    "Nhà sản xuất không được vượt quá 255 ký tự."
            );
        }

        if (request.getGia() == null) {

            throw new IllegalArgumentException(
                    "Giá thuốc không được để trống."
            );
        }

        if (request.getGia().compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Giá thuốc không được nhỏ hơn 0."
            );
        }

        if (request.getMoTa() != null
                && request.getMoTa().trim().length() > 255) {

            throw new IllegalArgumentException(
                    "Mô tả không được vượt quá 255 ký tự."
            );
        }
    }

    // =========================================================
    // NORMALIZE
    // =========================================================

    private String normalize(String value) {

        if (value == null) {
            return null;
        }

        String result = value.trim();

        return result.isEmpty()
                ? null
                : result;
    }
}