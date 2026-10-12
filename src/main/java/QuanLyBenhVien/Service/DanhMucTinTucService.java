package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DanhMucTinTucRequest;
import QuanLyBenhVien.Entity.DanhMucTinTuc;
import QuanLyBenhVien.Repository.DanhMucTinTucRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DanhMucTinTucService {

    private final DanhMucTinTucRepository repository;
    private final ThongBaoService thongBaoService;


    public DanhMucTinTucService(
            DanhMucTinTucRepository repository,
            ThongBaoService thongBaoService
    ) {
        this.repository = repository;
        this.thongBaoService = thongBaoService;
    }


    // ==============================
    // LẤY TẤT CẢ
    // ==============================

    public List<DanhMucTinTuc> getAll() {

        return repository.findAll();
    }


    // ==============================
    // LẤY THEO ID
    // ==============================

    public DanhMucTinTuc getById(Integer id) {

        return repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy danh mục tin tức."
                        )
                );
    }


    // ==============================
    // THÊM
    // ==============================

    @Transactional
    public DanhMucTinTuc create(
            DanhMucTinTucRequest request
    ) {

        validateRequest(request);


        String tenDanhMuc =
                request.getTenDanhMuc().trim();


        // Kiểm tra trùng tên
        if (repository.existsByTenDanhMucIgnoreCase(
                tenDanhMuc)) {

            throw new RuntimeException(
                    "Tên danh mục đã tồn tại."
            );
        }


        DanhMucTinTuc danhMuc =
                new DanhMucTinTuc();

        danhMuc.setTenDanhMuc(
                tenDanhMuc
        );


        if (request.getMoTa() != null) {

            danhMuc.setMoTa(
                    request.getMoTa().trim()
            );
        }


        DanhMucTinTuc saved =
                repository.save(danhMuc);


        // ==============================
        // GỬI THÔNG BÁO
        // ==============================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN"),
                "Danh mục tin tức mới",
                "Danh mục tin tức \""
                        + saved.getTenDanhMuc()
                        + "\" đã được thêm vào hệ thống.",
                "DANH_MUC_TIN_TUC"
        );


        return saved;
    }


    // ==============================
    // CẬP NHẬT
    // ==============================

    @Transactional
    public DanhMucTinTuc update(
            Integer id,
            DanhMucTinTucRequest request
    ) {

        DanhMucTinTuc danhMuc =
                getById(id);


        validateRequest(request);


        String tenDanhMuc =
                request.getTenDanhMuc().trim();


        // Kiểm tra trùng tên
        if (!tenDanhMuc.equalsIgnoreCase(
                danhMuc.getTenDanhMuc())
                && repository.existsByTenDanhMucIgnoreCase(
                tenDanhMuc)) {

            throw new RuntimeException(
                    "Tên danh mục đã tồn tại."
            );
        }


        danhMuc.setTenDanhMuc(
                tenDanhMuc
        );


        danhMuc.setMoTa(
                request.getMoTa() == null
                        ? null
                        : request.getMoTa().trim()
        );


        DanhMucTinTuc updated =
                repository.save(danhMuc);


        // ==============================
        // GỬI THÔNG BÁO
        // ==============================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN"),
                "Danh mục tin tức đã được cập nhật",
                "Danh mục tin tức \""
                        + updated.getTenDanhMuc()
                        + "\" đã được cập nhật.",
                "DANH_MUC_TIN_TUC"
        );


        return updated;
    }


    // ==============================
    // XÓA
    // ==============================

    @Transactional
    public void delete(Integer id) {

        DanhMucTinTuc danhMuc =
                getById(id);


        String tenDanhMuc =
                danhMuc.getTenDanhMuc();


        repository.delete(danhMuc);


        // ==============================
        // GỬI THÔNG BÁO
        // ==============================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN"),
                "Danh mục tin tức đã bị xóa",
                "Danh mục tin tức \""
                        + tenDanhMuc
                        + "\" đã được xóa khỏi hệ thống.",
                "DANH_MUC_TIN_TUC"
        );
    }


    // ==============================
    // VALIDATE
    // ==============================

    private void validateRequest(
            DanhMucTinTucRequest request
    ) {

        if (request == null) {

            throw new RuntimeException(
                    "Dữ liệu danh mục không hợp lệ."
            );
        }


        if (request.getTenDanhMuc() == null
                || request.getTenDanhMuc().isBlank()) {

            throw new RuntimeException(
                    "Tên danh mục không được để trống."
            );
        }


        if (request.getTenDanhMuc()
                .trim()
                .length() > 100) {

            throw new RuntimeException(
                    "Tên danh mục không được vượt quá 100 ký tự."
            );
        }
    }
}