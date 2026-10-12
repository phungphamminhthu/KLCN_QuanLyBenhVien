package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.PhongRequest;
import QuanLyBenhVien.DTO.PhongResponse;
import QuanLyBenhVien.Entity.Khoa;
import QuanLyBenhVien.Entity.Phong;
import QuanLyBenhVien.Repository.KhoaRepository;
import QuanLyBenhVien.Repository.PhongRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PhongService {

    private final PhongRepository phongRepository;
    private final KhoaRepository khoaRepository;
    private final ThongBaoService thongBaoService;


    public PhongService(
            PhongRepository phongRepository,
            KhoaRepository khoaRepository,
            ThongBaoService thongBaoService
    ) {
        this.phongRepository = phongRepository;
        this.khoaRepository = khoaRepository;
        this.thongBaoService = thongBaoService;
    }


    // =========================
    // GET ALL
    // =========================

    public List<PhongResponse> getAll() {

        return phongRepository
                .findAllByOrderByMaPhongAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }


    // =========================
    // GET BY ID
    // =========================

    public PhongResponse getById(Integer id) {

        Phong phong = phongRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy phòng có mã: " + id
                        )
                );

        return toResponse(phong);
    }


    // =========================
    // CREATE
    // =========================

    @Transactional
    public PhongResponse create(
            PhongRequest request
    ) {

        validateRequest(request);


        Khoa khoa = khoaRepository
                .findById(request.getMaKhoa())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy khoa có mã: "
                                        + request.getMaKhoa()
                        )
                );


        Phong phong = new Phong();

        phong.setKhoa(khoa);

        phong.setTenPhong(
                request.getTenPhong().trim()
        );

        phong.setLoaiPhong(
                normalize(request.getLoaiPhong())
        );

        phong.setViTri(
                normalize(request.getViTri())
        );

        phong.setTrangThai(
                request.getTrangThai() == null
                        ? true
                        : request.getTrangThai()
        );


        Phong saved =
                phongRepository.save(phong);


        // =========================
        // GỬI THÔNG BÁO
        // =========================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "TIEPNHAN"),
                "Phòng mới được thêm",
                "Phòng \"" + saved.getTenPhong()
                        + "\" đã được thêm vào khoa \""
                        + khoa.getTenKhoa() + "\".",
                "PHONG"
        );


        return toResponse(saved);
    }


    // =========================
    // UPDATE
    // =========================

    @Transactional
    public PhongResponse update(
            Integer id,
            PhongRequest request
    ) {

        validateRequest(request);


        Phong phong =
                phongRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy phòng có mã: "
                                                + id
                                )
                        );


        Khoa khoa =
                khoaRepository.findById(
                        request.getMaKhoa()
                ).orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy khoa có mã: "
                                        + request.getMaKhoa()
                        )
                );


        phong.setKhoa(khoa);

        phong.setTenPhong(
                request.getTenPhong().trim()
        );

        phong.setLoaiPhong(
                normalize(request.getLoaiPhong())
        );

        phong.setViTri(
                normalize(request.getViTri())
        );

        phong.setTrangThai(
                request.getTrangThai() == null
                        ? true
                        : request.getTrangThai()
        );


        Phong updated =
                phongRepository.save(phong);


        // =========================
        // GỬI THÔNG BÁO
        // =========================

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "TIEPNHAN"),
                "Thông tin phòng đã được cập nhật",
                "Thông tin phòng \""
                        + updated.getTenPhong()
                        + "\" đã được cập nhật.",
                "PHONG"
        );


        return toResponse(updated);
    }


    // =========================
    // DELETE
    // =========================

    @Transactional
    public void delete(Integer id) {

        Phong phong =
                phongRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy phòng có mã: "
                                                + id
                                )
                        );


        // Lưu lại thông tin trước khi xóa
        String tenPhong = phong.getTenPhong();

        String tenKhoa = null;

        if (phong.getKhoa() != null) {
            tenKhoa = phong.getKhoa().getTenKhoa();
        }


        phongRepository.delete(phong);


        // =========================
        // GỬI THÔNG BÁO
        // =========================

        String noiDung;

        if (tenKhoa != null) {

            noiDung = "Phòng \"" + tenPhong
                    + "\" thuộc khoa \"" + tenKhoa
                    + "\" đã được xóa khỏi hệ thống.";

        } else {

            noiDung = "Phòng \"" + tenPhong
                    + "\" đã được xóa khỏi hệ thống.";
        }


        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "TIEPNHAN"),
                "Phòng đã bị xóa",
                noiDung,
                "PHONG"
        );
    }


    // =========================
    // VALIDATE
    // =========================

    private void validateRequest(
            PhongRequest request
    ) {

        if (request == null) {

            throw new RuntimeException(
                    "Dữ liệu phòng không hợp lệ."
            );
        }


        if (request.getMaKhoa() == null) {

            throw new RuntimeException(
                    "Vui lòng chọn khoa."
            );
        }


        if (request.getTenPhong() == null ||
                request.getTenPhong().isBlank()) {

            throw new RuntimeException(
                    "Tên phòng không được để trống."
            );
        }


        if (request.getTenPhong().trim().length() > 100) {

            throw new RuntimeException(
                    "Tên phòng không được vượt quá 100 ký tự."
            );
        }


        if (request.getLoaiPhong() != null &&
                request.getLoaiPhong().trim().length() > 100) {

            throw new RuntimeException(
                    "Loại phòng không được vượt quá 100 ký tự."
            );
        }


        if (request.getViTri() != null &&
                request.getViTri().trim().length() > 255) {

            throw new RuntimeException(
                    "Vị trí không được vượt quá 255 ký tự."
            );
        }
    }


    // =========================
    // MAPPING
    // =========================

    private PhongResponse toResponse(
            Phong phong
    ) {

        Integer maKhoa = null;
        String tenKhoa = null;


        if (phong.getKhoa() != null) {

            maKhoa =
                    phong.getKhoa().getMaKhoa();

            tenKhoa =
                    phong.getKhoa().getTenKhoa();
        }


        return new PhongResponse(
                phong.getMaPhong(),
                maKhoa,
                tenKhoa,
                phong.getTenPhong(),
                phong.getLoaiPhong(),
                phong.getViTri(),
                phong.getTrangThai()
        );
    }


    // =========================
    // NORMALIZE
    // =========================

    private String normalize(String value) {

        if (value == null ||
                value.isBlank()) {

            return null;
        }

        return value.trim();
    }
}