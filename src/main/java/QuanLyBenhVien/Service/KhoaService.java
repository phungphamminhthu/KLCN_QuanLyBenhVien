package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.KhoaRequest;
import QuanLyBenhVien.DTO.KhoaResponse;
import QuanLyBenhVien.Entity.Khoa;
import QuanLyBenhVien.Repository.KhoaRepository;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class KhoaService {

    private final KhoaRepository khoaRepository;
    private final AuditLogService auditLogService;
    private final ThongBaoService thongBaoService;


    public KhoaService(
            KhoaRepository khoaRepository,
            AuditLogService auditLogService,
            ThongBaoService thongBaoService
    ) {
        this.khoaRepository = khoaRepository;
        this.auditLogService = auditLogService;
        this.thongBaoService = thongBaoService;
    }


    // =====================================================
    // GET ALL
    // =====================================================

    public List<KhoaResponse> getAll() {

        return khoaRepository
                .findAllByOrderByMaKhoaAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }


    // =====================================================
    // GET BY ID
    // =====================================================

    public KhoaResponse getById(Integer id) {

        Khoa khoa = khoaRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy khoa với mã: " + id
                        )
                );

        return toResponse(khoa);
    }


    // =====================================================
    // CREATE
    // =====================================================

    @Transactional
    public KhoaResponse create(
            KhoaRequest request,
            HttpServletRequest httpRequest
    ) {

        validate(request);

        String tenKhoa =
                request.getTenKhoa().trim();

        if (khoaRepository.existsByTenKhoaIgnoreCase(tenKhoa)) {

            throw new RuntimeException(
                    "Tên khoa đã tồn tại."
            );
        }


        Khoa khoa = new Khoa();

        khoa.setTenKhoa(tenKhoa);

        khoa.setMoTa(
                request.getMoTa() == null
                        ? null
                        : request.getMoTa().trim()
        );


        Khoa savedKhoa =
                khoaRepository.save(khoa);


        // =================================================
        // AUDIT LOG
        // =================================================

        auditLogService.log(
                "Thêm",
                "Khoa",
                String.valueOf(savedKhoa.getMaKhoa()),
                "Thêm khoa: " + savedKhoa.getTenKhoa(),
                httpRequest
        );


        // =================================================
        // THÔNG BÁO
        // =================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "TIEPNHAN"),
                "Khoa mới được thêm",
                "Khoa \"" +
                        savedKhoa.getTenKhoa() +
                        "\" đã được thêm vào hệ thống.",
                "KHOA"
        );


        return toResponse(savedKhoa);
    }


    // =====================================================
    // UPDATE
    // =====================================================

    @Transactional
    public KhoaResponse update(
            Integer id,
            KhoaRequest request,
            HttpServletRequest httpRequest
    ) {

        validate(request);

        Khoa khoa =
                khoaRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy khoa."
                                )
                        );


        String tenKhoa =
                request.getTenKhoa().trim();


        // =================================================
        // KIỂM TRA TRÙNG TÊN KHOA
        // =================================================

        boolean duplicate =
                khoaRepository
                        .existsByTenKhoaIgnoreCase(
                                tenKhoa
                        );


        if (
                duplicate
                        && !khoa.getTenKhoa()
                        .equalsIgnoreCase(tenKhoa)
        ) {

            throw new RuntimeException(
                    "Tên khoa đã tồn tại."
            );
        }


        khoa.setTenKhoa(tenKhoa);

        khoa.setMoTa(
                request.getMoTa() == null
                        ? null
                        : request.getMoTa().trim()
        );


        Khoa updatedKhoa =
                khoaRepository.save(khoa);


        // =================================================
        // AUDIT LOG
        // =================================================

        auditLogService.log(
                "Sửa",
                "Khoa",
                String.valueOf(updatedKhoa.getMaKhoa()),
                "Sửa thông tin khoa: "
                        + updatedKhoa.getTenKhoa(),
                httpRequest
        );


        // =================================================
        // THÔNG BÁO
        // =================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "TIEPNHAN"),
                "Thông tin khoa đã được cập nhật",
                "Thông tin khoa \"" +
                        updatedKhoa.getTenKhoa() +
                        "\" đã được cập nhật.",
                "KHOA"
        );


        return toResponse(updatedKhoa);
    }


    // =====================================================
    // DELETE
    // =====================================================

    @Transactional
    public void delete(
            Integer id,
            HttpServletRequest httpRequest
    ) {

        Khoa khoa =
                khoaRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy khoa."
                                )
                        );


        // Lưu tên trước khi xóa
        String tenKhoa =
                khoa.getTenKhoa();


        khoaRepository.delete(khoa);


        // =================================================
        // AUDIT LOG
        // =================================================

        auditLogService.log(
                "Xóa",
                "Khoa",
                String.valueOf(id),
                "Xóa khoa: " + tenKhoa,
                httpRequest
        );


        // =================================================
        // THÔNG BÁO
        // =================================================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "TIEPNHAN"),
                "Khoa đã bị xóa",
                "Khoa \"" +
                        tenKhoa +
                        "\" đã được xóa khỏi hệ thống.",
                "KHOA"
        );
    }


    // =====================================================
    // VALIDATE
    // =====================================================

    private void validate(KhoaRequest request) {

        if (
                request == null
                        || request.getTenKhoa() == null
                        || request.getTenKhoa().trim().isEmpty()
        ) {

            throw new RuntimeException(
                    "Tên khoa không được để trống."
            );
        }


        if (
                request.getTenKhoa().trim().length()
                        > 100
        ) {

            throw new RuntimeException(
                    "Tên khoa không được vượt quá 100 ký tự."
            );
        }


        if (
                request.getMoTa() != null
                        && request.getMoTa().trim().length()
                        > 255
        ) {

            throw new RuntimeException(
                    "Mô tả không được vượt quá 255 ký tự."
            );
        }
    }


    // =====================================================
    // MAPPING
    // =====================================================

    private KhoaResponse toResponse(Khoa khoa) {

        KhoaResponse response =
                new KhoaResponse();

        response.setMaKhoa(
                khoa.getMaKhoa()
        );

        response.setTenKhoa(
                khoa.getTenKhoa()
        );

        response.setMoTa(
                khoa.getMoTa()
        );

        return response;
    }
}