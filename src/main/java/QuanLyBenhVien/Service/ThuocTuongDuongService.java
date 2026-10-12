package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.ThuocTuongDuongRequest;
import QuanLyBenhVien.DTO.ThuocTuongDuongResponse;
import QuanLyBenhVien.Entity.Thuoc;
import QuanLyBenhVien.Entity.ThuocTuongDuong;
import QuanLyBenhVien.Repository.ThuocRepository;
import QuanLyBenhVien.Repository.ThuocTuongDuongRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;


@Service
public class ThuocTuongDuongService {

    private final ThuocTuongDuongRepository repository;

    private final ThuocRepository thuocRepository;

    private final ThongBaoService thongBaoService;


    public ThuocTuongDuongService(
            ThuocTuongDuongRepository repository,
            ThuocRepository thuocRepository,
            ThongBaoService thongBaoService) {

        this.repository = repository;

        this.thuocRepository =
                thuocRepository;

        this.thongBaoService =
                thongBaoService;
    }


    // =====================================================
    // GET ALL
    // =====================================================

    public Page<ThuocTuongDuongResponse> getAll(
            String keyword,
            int page,
            int size) {

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                Sort.Direction.DESC,
                                "maThuocTuongDuong"
                        )
                );


        Page<ThuocTuongDuong> result;


        // =================================================
        // KHÔNG TÌM KIẾM
        // =================================================

        if (keyword == null
                || keyword.trim().isEmpty()) {

            result =
                    repository.findAll(
                            pageable
                    );

        }


        // =================================================
        // CÓ TÌM KIẾM
        // =================================================

        else {

            String Keyword =
                    keyword.trim();

            result =
                    repository
                            .findByThuoc_TenThuocContainingIgnoreCaseOrThuocThayThe_TenThuocContainingIgnoreCase(
                                    Keyword,
                                    Keyword,
                                    pageable
                            );
        }


        // =================================================
        // ENTITY -> RESPONSE
        // =================================================

        return result.map(
                this::toResponse
        );
    }


    // =====================================================
    // ENTITY -> RESPONSE
    // =====================================================

    private ThuocTuongDuongResponse toResponse(
            ThuocTuongDuong entity) {

        ThuocTuongDuongResponse response =
                new ThuocTuongDuongResponse();


        // =================================================
        // MÃ THUỐC TƯƠNG ĐƯƠNG
        // =================================================

        response.setMaThuocTuongDuong(
                entity.getMaThuocTuongDuong()
        );


        // =================================================
        // THUỐC GỐC
        // =================================================

        if (entity.getThuoc() != null) {

            response.setMaThuoc(
                    entity.getThuoc()
                            .getMaThuoc()
            );

            response.setTenThuoc(
                    entity.getThuoc()
                            .getTenThuoc()
            );
        }


        // =================================================
        // THUỐC THAY THẾ
        // =================================================

        if (entity.getThuocThayThe() != null) {

            response.setMaThuocThayThe(
                    entity.getThuocThayThe()
                            .getMaThuoc()
            );

            response.setTenThuocThayThe(
                    entity.getThuocThayThe()
                            .getTenThuoc()
            );
        }


        // =================================================
        // GHI CHÚ
        // =================================================

        response.setGhiChu(
                entity.getGhiChu()
        );


        // =================================================
        // TRẠNG THÁI
        // =================================================

        response.setTrangThai(
                entity.getTrangThai()
        );


        return response;
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    public ThuocTuongDuong getById(
            Integer id) {

        return repository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy thuốc tương đương."
                        )
                );
    }


    // =====================================================
    // CREATE
    // =====================================================

    @Transactional
    public ThuocTuongDuong create(
            ThuocTuongDuongRequest request) {

        validate(request);


        // =================================================
        // THUỐC GỐC
        // =================================================

        Thuoc thuoc =
                thuocRepository
                        .findById(
                                request.getMaThuoc()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy thuốc gốc."
                                )
                        );


        // =================================================
        // THUỐC THAY THẾ
        // =================================================

        Thuoc thuocThayThe =
                thuocRepository
                        .findById(
                                request.getMaThuocThayThe()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy thuốc thay thế."
                                )
                        );


        // =================================================
        // KHÔNG CHO PHÉP TRÙNG
        // =================================================

        if (thuoc.getMaThuoc()
                .equals(
                        thuocThayThe.getMaThuoc()
                )) {

            throw new RuntimeException(
                    "Thuốc gốc và thuốc thay thế không được giống nhau."
            );
        }


        // =================================================
        // TẠO ENTITY
        // =================================================

        ThuocTuongDuong entity =
                new ThuocTuongDuong();


        entity.setThuoc(
                thuoc
        );


        entity.setThuocThayThe(
                thuocThayThe
        );


        entity.setGhiChu(
                request.getGhiChu()
        );


        entity.setTrangThai(
                request.getTrangThai()
        );


        // =================================================
        // LƯU
        // =================================================

        ThuocTuongDuong saved =
                repository.save(entity);


        // =================================================
        // THÔNG BÁO CHUÔNG
        // ADMIN + DUOCSI
        // =================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Thêm thuốc tương đương",
                "Đã thêm thuốc "
                        + thuoc.getTenThuoc()
                        + " → "
                        + thuocThayThe.getTenThuoc()
                        + " vào danh sách thuốc tương đương.",
                "THUOC_TUONG_DUONG"
        );


        return saved;
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @Transactional
    public ThuocTuongDuong update(
            Integer id,
            ThuocTuongDuongRequest request) {

        validate(request);


        // =================================================
        // LẤY ENTITY
        // =================================================

        ThuocTuongDuong entity =
                getById(id);


        // =================================================
        // THUỐC GỐC
        // =================================================

        Thuoc thuoc =
                thuocRepository
                        .findById(
                                request.getMaThuoc()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy thuốc gốc."
                                )
                        );


        // =================================================
        // THUỐC THAY THẾ
        // =================================================

        Thuoc thuocThayThe =
                thuocRepository
                        .findById(
                                request.getMaThuocThayThe()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy thuốc thay thế."
                                )
                        );


        // =================================================
        // KHÔNG CHO PHÉP TRÙNG
        // =================================================

        if (thuoc.getMaThuoc()
                .equals(
                        thuocThayThe.getMaThuoc()
                )) {

            throw new RuntimeException(
                    "Thuốc gốc và thuốc thay thế không được giống nhau."
            );
        }


        // =================================================
        // CẬP NHẬT
        // =================================================

        entity.setThuoc(
                thuoc
        );


        entity.setThuocThayThe(
                thuocThayThe
        );


        entity.setGhiChu(
                request.getGhiChu()
        );


        entity.setTrangThai(
                request.getTrangThai()
        );


        // =================================================
        // LƯU
        // =================================================

        ThuocTuongDuong saved =
                repository.save(entity);


        // =================================================
        // THÔNG BÁO CHUÔNG
        // ADMIN + DUOCSI
        // =================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Cập nhật thuốc tương đương",
                "Đã cập nhật thuốc "
                        + thuoc.getTenThuoc()
                        + " → "
                        + thuocThayThe.getTenThuoc()
                        + ".",
                "THUOC_TUONG_DUONG"
        );


        return saved;
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Transactional
    public void delete(
            Integer id) {

        // =================================================
        // LẤY ENTITY
        // =================================================

        ThuocTuongDuong entity =
                getById(id);


        // =================================================
        // LẤY TÊN TRƯỚC KHI XÓA
        // =================================================

        String tenThuoc =
                entity.getThuoc() != null
                        ? entity.getThuoc().getTenThuoc()
                        : "Không xác định";


        String tenThuocThayThe =
                entity.getThuocThayThe() != null
                        ? entity.getThuocThayThe().getTenThuoc()
                        : "Không xác định";


        // =================================================
        // XÓA
        // =================================================

        repository.delete(entity);


        // =================================================
        // THÔNG BÁO CHUÔNG
        // ADMIN + DUOCSI
        // =================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Xóa thuốc tương đương",
                "Đã xóa thuốc "
                        + tenThuoc
                        + " → "
                        + tenThuocThayThe
                        + " khỏi danh sách thuốc tương đương.",
                "THUOC_TUONG_DUONG"
        );
    }


    // =====================================================
    // VALIDATE
    // =====================================================

    private void validate(
            ThuocTuongDuongRequest request) {

        // =================================================
        // REQUEST NULL
        // =================================================

        if (request == null) {

            throw new RuntimeException(
                    "Dữ liệu không hợp lệ."
            );
        }


        // =================================================
        // THUỐC GỐC
        // =================================================

        if (request.getMaThuoc() == null) {

            throw new RuntimeException(
                    "Vui lòng chọn thuốc."
            );
        }


        // =================================================
        // THUỐC THAY THẾ
        // =================================================

        if (request.getMaThuocThayThe() == null) {

            throw new RuntimeException(
                    "Vui lòng chọn thuốc thay thế."
            );
        }


        // =================================================
        // TRẠNG THÁI
        // =================================================

        if (request.getTrangThai() == null
                || request.getTrangThai()
                .trim()
                .isEmpty()) {

            request.setTrangThai(
                    "Đang áp dụng"
            );
        }
    }
}