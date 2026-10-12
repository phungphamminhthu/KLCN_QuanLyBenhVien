package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TinTucRequest;
import QuanLyBenhVien.DTO.TinTucResponse;
import QuanLyBenhVien.Entity.DanhMucTinTuc;
import QuanLyBenhVien.Entity.TinTuc;
import QuanLyBenhVien.Repository.DanhMucTinTucRepository;
import QuanLyBenhVien.Repository.TinTucRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TinTucService {

    private final TinTucRepository tinTucRepository;
    private final DanhMucTinTucRepository danhMucTinTucRepository;
    private final AuditLogService auditLogService;
    private final ThongBaoService thongBaoService;


    public TinTucService(
            TinTucRepository tinTucRepository,
            DanhMucTinTucRepository danhMucTinTucRepository,
            AuditLogService auditLogService,
            ThongBaoService thongBaoService
    ) {
        this.tinTucRepository = tinTucRepository;
        this.danhMucTinTucRepository = danhMucTinTucRepository;
        this.auditLogService = auditLogService;
        this.thongBaoService = thongBaoService;
    }


    // =========================
    // LẤY DANH SÁCH
    // =========================

    public List<TinTucResponse> getAll() {

        return tinTucRepository
                .findAllByOrderByNgayDangDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }


    // =========================
    // LẤY THEO ID
    // =========================

    public TinTucResponse getById(Integer id) {

        TinTuc tinTuc = tinTucRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy tin tức có mã: " + id
                        )
                );

        return toResponse(tinTuc);
    }


    // =========================
    // THÊM TIN TỨC
    // =========================

    @Transactional
    public TinTucResponse create(
            TinTucRequest request,
            HttpServletRequest httpRequest
    ) {

        validateRequest(request);


        // =========================
        // KIỂM TRA DANH MỤC
        // =========================

        DanhMucTinTuc danhMuc =
                danhMucTinTucRepository
                        .findById(request.getMaDanhMuc())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Danh mục không tồn tại"
                                )
                        );


        // =========================
        // NỘI DUNG
        // =========================

        String noiDung =
                request.getNoiDung().trim();


        // Loại HTML để kiểm tra nội dung thực tế
        String noiDungText =
                noiDung
                        .replaceAll("<[^>]*>", "")
                        .replace("&nbsp;", " ")
                        .trim();


        if (noiDungText.isBlank()) {

            throw new RuntimeException(
                    "Nội dung bài viết không được để trống"
            );
        }


        // =========================
        // TRẠNG THÁI
        // =========================

        String trangThai =
                request.getTrangThai();


        if (trangThai == null ||
                trangThai.isBlank()) {

            trangThai = "Đang hiển thị";
        }


        // =========================
        // TẠO ENTITY
        // =========================

        TinTuc tinTuc =
                new TinTuc();

        tinTuc.setDanhMuc(danhMuc);

        tinTuc.setTieuDe(
                request.getTieuDe().trim()
        );

        // Lưu nguyên HTML từ editor
        tinTuc.setNoiDung(noiDung);

        // FileKey của Cloudflare R2
        tinTuc.setImageURL(
                request.getImageURL()
        );

        tinTuc.setTrangThai(
                trangThai
        );


        // =========================
        // SAVE
        // =========================

        TinTuc saved =
                tinTucRepository.save(tinTuc);


        // =========================
        // AUDIT LOG
        // =========================

        auditLogService.log(
                "Thêm",
                "Tin tức",
                String.valueOf(
                        saved.getMaTinTuc()
                ),
                "Thêm tin tức: "
                        + saved.getTieuDe(),
                httpRequest
        );


        // =========================
        // THÔNG BÁO
        // =========================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN"),
                "Tin tức mới được đăng",
                "Tin tức \""
                        + saved.getTieuDe()
                        + "\" đã được thêm vào hệ thống.",
                "TIN_TUC"
        );


        return toResponse(saved);
    }


    // =========================
    // SỬA TIN TỨC
    // =========================

    @Transactional
    public TinTucResponse update(
            Integer id,
            TinTucRequest request,
            HttpServletRequest httpRequest
    ) {

        // =========================
        // TÌM TIN TỨC
        // =========================

        TinTuc tinTuc =
                tinTucRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy tin tức có mã: "
                                                + id
                                )
                        );


        validateRequest(request);


        // =========================
        // KIỂM TRA DANH MỤC
        // =========================

        DanhMucTinTuc danhMuc =
                danhMucTinTucRepository
                        .findById(
                                request.getMaDanhMuc()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Danh mục không tồn tại"
                                )
                        );


        // =========================
        // NỘI DUNG
        // =========================

        String noiDung =
                request.getNoiDung().trim();


        String noiDungText =
                noiDung
                        .replaceAll("<[^>]*>", "")
                        .replace("&nbsp;", " ")
                        .trim();


        if (noiDungText.isBlank()) {

            throw new RuntimeException(
                    "Nội dung bài viết không được để trống"
            );
        }


        // =========================
        // TRẠNG THÁI
        // =========================

        String trangThai =
                request.getTrangThai();


        if (trangThai == null ||
                trangThai.isBlank()) {

            trangThai = "Đang hiển thị";
        }


        // =========================
        // CẬP NHẬT ENTITY
        // =========================

        tinTuc.setDanhMuc(
                danhMuc
        );


        tinTuc.setTieuDe(
                request.getTieuDe().trim()
        );


        // Lưu nguyên HTML từ editor
        tinTuc.setNoiDung(
                noiDung
        );


        // FileKey Cloudflare R2
        tinTuc.setImageURL(
                request.getImageURL()
        );


        tinTuc.setTrangThai(
                trangThai
        );


        // =========================
        // SAVE
        // =========================

        TinTuc saved =
                tinTucRepository.save(
                        tinTuc
                );


        // =========================
        // AUDIT LOG
        // =========================

        auditLogService.log(
                "Sửa",
                "Tin tức",
                String.valueOf(
                        saved.getMaTinTuc()
                ),
                "Sửa tin tức: "
                        + saved.getTieuDe(),
                httpRequest
        );


        // =========================
        // THÔNG BÁO
        // =========================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN"),
                "Tin tức đã được cập nhật",
                "Tin tức \""
                        + saved.getTieuDe()
                        + "\" đã được cập nhật.",
                "TIN_TUC"
        );


        return toResponse(
                saved
        );
    }


    // =========================
    // XÓA TIN TỨC
    // =========================

    @Transactional
    public void delete(
            Integer id,
            HttpServletRequest httpRequest
    ) {

        TinTuc tinTuc =
                tinTucRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy tin tức có mã: "
                                                + id
                                )
                        );


        // Lưu lại tiêu đề trước khi xóa
        String tieuDe =
                tinTuc.getTieuDe();


        // =========================
        // XÓA
        // =========================

        tinTucRepository.delete(
                tinTuc
        );


        // =========================
        // AUDIT LOG
        // =========================

        auditLogService.log(
                "Xóa",
                "Tin tức",
                String.valueOf(id),
                "Xóa tin tức: " + tieuDe,
                httpRequest
        );


        // =========================
        // THÔNG BÁO
        // =========================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN"),
                "Tin tức đã bị xóa",
                "Tin tức \""
                        + tieuDe
                        + "\" đã được xóa khỏi hệ thống.",
                "TIN_TUC"
        );
    }


    // =========================
    // VALIDATE
    // =========================

    private void validateRequest(
            TinTucRequest request
    ) {

        if (request == null) {

            throw new RuntimeException(
                    "Dữ liệu tin tức không hợp lệ"
            );
        }


        // =========================
        // TIÊU ĐỀ
        // =========================

        if (request.getTieuDe() == null ||
                request.getTieuDe().isBlank()) {

            throw new RuntimeException(
                    "Tiêu đề không được để trống"
            );
        }


        if (request.getTieuDe()
                .trim()
                .length() > 255) {

            throw new RuntimeException(
                    "Tiêu đề không được vượt quá 255 ký tự"
            );
        }


        // =========================
        // DANH MỤC
        // =========================

        if (request.getMaDanhMuc() == null) {

            throw new RuntimeException(
                    "Vui lòng chọn danh mục"
            );
        }


        // =========================
        // NỘI DUNG
        // =========================

        if (request.getNoiDung() == null ||
                request.getNoiDung().isBlank()) {

            throw new RuntimeException(
                    "Nội dung bài viết không được để trống"
            );
        }
    }


    // =========================
    // ENTITY -> RESPONSE
    // =========================

    private TinTucResponse toResponse(
            TinTuc tinTuc
    ) {

        TinTucResponse response =
                new TinTucResponse();


        response.setMaTinTuc(
                tinTuc.getMaTinTuc()
        );


        response.setMaDanhMuc(
                tinTuc.getDanhMuc()
                        .getMaDanhMuc()
        );


        response.setTenDanhMuc(
                tinTuc.getDanhMuc()
                        .getTenDanhMuc()
        );


        response.setTieuDe(
                tinTuc.getTieuDe()
        );


        response.setNoiDung(
                tinTuc.getNoiDung()
        );


        response.setImageURL(
                tinTuc.getImageURL()
        );


        response.setNgayDang(
                tinTuc.getNgayDang()
        );


        response.setTrangThai(
                tinTuc.getTrangThai()
        );


        return response;
    }
}