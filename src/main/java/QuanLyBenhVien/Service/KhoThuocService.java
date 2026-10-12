package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.KhoThuocRequest;
import QuanLyBenhVien.DTO.KhoThuocResponse;
import QuanLyBenhVien.Entity.KhoThuoc;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.Thuoc;
import QuanLyBenhVien.Repository.KhoThuocRepository;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.ThuocRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class KhoThuocService {

    private final KhoThuocRepository khoThuocRepository;
    private final ThuocRepository thuocRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final ThongBaoService thongBaoService;
    private final ThongBaoWebSocketService thongBaoWebSocketService;

    public KhoThuocService(
            KhoThuocRepository khoThuocRepository,
            ThuocRepository thuocRepository,
            NguoiDungRepository nguoiDungRepository,
            ThongBaoService thongBaoService,
            ThongBaoWebSocketService thongBaoWebSocketService) {

        this.khoThuocRepository = khoThuocRepository;
        this.thuocRepository = thuocRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.thongBaoService = thongBaoService;
        this.thongBaoWebSocketService = thongBaoWebSocketService;
    }

    // =====================================================
    // GET ALL
    // =====================================================

    @Transactional(readOnly = true)
    public List<KhoThuocResponse> getAll() {

        return khoThuocRepository
                .findAllByOrderByMaKhoThuocAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =====================================================
    // GET BY ID
    // =====================================================

    @Transactional(readOnly = true)
    public KhoThuocResponse getById(Integer id) {

        KhoThuoc khoThuoc = khoThuocRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy kho thuốc có mã: " + id
                        )
                );

        return toResponse(khoThuoc);
    }

    // =====================================================
    // CREATE - NHẬP KHO
    // =====================================================

    public KhoThuocResponse create(KhoThuocRequest request) {

        validate(request);

        Thuoc thuoc = thuocRepository
                .findById(request.getMaThuoc())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy thuốc có mã: "
                                        + request.getMaThuoc()
                        )
                );

        // -------------------------------------------------
        // Không cho nhập kho thuốc đã ngừng sử dụng
        // -------------------------------------------------

        if (Boolean.FALSE.equals(thuoc.getTrangThai())) {

            throw new RuntimeException(
                    "Thuốc \"" + thuoc.getTenThuoc()
                            + "\" đã ngừng sử dụng, không thể nhập kho."
            );
        }

        String soLo = request.getSoLo().trim();

        // -------------------------------------------------
        // Kiểm tra trùng số lô
        // -------------------------------------------------

        boolean daTonTai =
                khoThuocRepository.existsByThuoc_MaThuocAndSoLo(
                        request.getMaThuoc(),
                        soLo
                );

        if (daTonTai) {

            throw new RuntimeException(
                    "Số lô \"" + soLo
                            + "\" của thuốc \""
                            + thuoc.getTenThuoc()
                            + "\" đã tồn tại trong kho."
            );
        }

        // -------------------------------------------------
        // Tạo kho thuốc
        // -------------------------------------------------

        KhoThuoc khoThuoc = new KhoThuoc();

        khoThuoc.setThuoc(thuoc);
        khoThuoc.setSoLuongTon(request.getSoLuongTon());
        khoThuoc.setSoLo(soLo);
        khoThuoc.setHanSuDung(request.getHanSuDung());
        khoThuoc.setSoLuongToiThieu(
                request.getSoLuongToiThieu()
        );

        KhoThuoc saved =
                khoThuocRepository.save(khoThuoc);

        // -------------------------------------------------
        // Tạo thông báo DB
        // -------------------------------------------------

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Nhập kho thuốc",
                "Thuốc \"" + thuoc.getTenThuoc()
                        + "\" đã được nhập thêm lô "
                        + soLo
                        + " với số lượng "
                        + request.getSoLuongTon()
                        + ".",
                "NHAP_KHO_THUOC"
        );

        // -------------------------------------------------
        // WebSocket cập nhật chuông realtime
        // -------------------------------------------------

        guiCapNhatThongBaoRealtime();

        return toResponse(saved);
    }

    // =====================================================
    // UPDATE
    // =====================================================

    public KhoThuocResponse update(
            Integer id,
            KhoThuocRequest request) {

        validate(request);

        KhoThuoc khoThuoc = khoThuocRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy kho thuốc có mã: " + id
                        )
                );

        Thuoc thuoc = thuocRepository
                .findById(request.getMaThuoc())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy thuốc có mã: "
                                        + request.getMaThuoc()
                        )
                );

        // Không cho cập nhật sang thuốc ngừng sử dụng
        if (Boolean.FALSE.equals(thuoc.getTrangThai())) {

            throw new RuntimeException(
                    "Thuốc \"" + thuoc.getTenThuoc()
                            + "\" đã ngừng sử dụng."
            );
        }

        String soLo = request.getSoLo().trim();

        // -------------------------------------------------
        // Kiểm tra trùng số lô
        // -------------------------------------------------

        KhoThuoc khoTrung =
                khoThuocRepository
                        .findByThuoc_MaThuocAndSoLo(
                                request.getMaThuoc(),
                                soLo
                        )
                        .orElse(null);

        if (khoTrung != null
                && !khoTrung.getMaKhoThuoc()
                .equals(id)) {

            throw new RuntimeException(
                    "Số lô \"" + soLo
                            + "\" của thuốc \""
                            + thuoc.getTenThuoc()
                            + "\" đã tồn tại trong kho."
            );
        }

        // -------------------------------------------------
        // Cập nhật
        // -------------------------------------------------

        khoThuoc.setThuoc(thuoc);

        khoThuoc.setSoLuongTon(
                request.getSoLuongTon()
        );

        khoThuoc.setSoLo(soLo);

        khoThuoc.setHanSuDung(
                request.getHanSuDung()
        );

        khoThuoc.setSoLuongToiThieu(
                request.getSoLuongToiThieu()
        );

        KhoThuoc saved =
                khoThuocRepository.save(khoThuoc);

        // -------------------------------------------------
        // Thông báo
        // -------------------------------------------------

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Thông tin kho thuốc đã thay đổi",
                "Kho thuốc của \""
                        + thuoc.getTenThuoc()
                        + "\" - lô "
                        + soLo
                        + " đã được cập nhật.",
                "KHO_THUOC"
        );

        // -------------------------------------------------
        // WebSocket
        // -------------------------------------------------

        guiCapNhatThongBaoRealtime();

        return toResponse(saved);
    }

    // =====================================================
    // DELETE
    // =====================================================

    public void delete(Integer id) {

        KhoThuoc khoThuoc =
                khoThuocRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy kho thuốc có mã: "
                                                + id
                                )
                        );

        String tenThuoc =
                khoThuoc.getThuoc() != null
                        ? khoThuoc.getThuoc().getTenThuoc()
                        : "Không xác định";

        String soLo = khoThuoc.getSoLo();

        khoThuocRepository.delete(khoThuoc);

        // -------------------------------------------------
        // Thông báo
        // -------------------------------------------------

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("ADMIN", "DUOCSI"),
                "Kho thuốc đã bị xóa",
                "Lô " + soLo
                        + " của thuốc \""
                        + tenThuoc
                        + "\" đã được xóa khỏi hệ thống.",
                "KHO_THUOC"
        );

        // -------------------------------------------------
        // WebSocket
        // -------------------------------------------------

        guiCapNhatThongBaoRealtime();
    }

    // =====================================================
    // VALIDATE
    // =====================================================

    private void validate(KhoThuocRequest request) {

        if (request == null) {

            throw new RuntimeException(
                    "Dữ liệu nhập kho không được để trống."
            );
        }

        if (request.getMaThuoc() == null) {

            throw new RuntimeException(
                    "Vui lòng chọn thuốc."
            );
        }

        // Nhập kho phải > 0
        if (request.getSoLuongTon() == null
                || request.getSoLuongTon() <= 0) {

            throw new RuntimeException(
                    "Số lượng nhập phải lớn hơn 0."
            );
        }

        if (request.getSoLuongToiThieu() == null
                || request.getSoLuongToiThieu() < 0) {

            throw new RuntimeException(
                    "Số lượng tối thiểu phải lớn hơn hoặc bằng 0."
            );
        }

        if (request.getSoLo() == null
                || request.getSoLo().isBlank()) {

            throw new RuntimeException(
                    "Số lô không được để trống."
            );
        }

        if (request.getSoLo().trim().length() > 100) {

            throw new RuntimeException(
                    "Số lô không được vượt quá 100 ký tự."
            );
        }

        if (request.getHanSuDung() == null) {

            throw new RuntimeException(
                    "Hạn sử dụng không được để trống."
            );
        }

        if (!request.getHanSuDung()
                .isAfter(LocalDate.now())) {

            throw new RuntimeException(
                    "Hạn sử dụng phải lớn hơn ngày hiện tại."
            );
        }
    }

    // =====================================================
    // WEBSOCKET - CẬP NHẬT SỐ THÔNG BÁO
    // =====================================================

    private void guiCapNhatThongBaoRealtime() {

        List<NguoiDung> nguoiDungList =
                nguoiDungRepository
                        .findByVaiTro_TenVaiTroInIgnoreCaseAndTrangThaiTrue(
                                List.of("ADMIN", "DUOCSI")
                        );

        Runnable sendRealtime = () -> {

            for (NguoiDung nguoiDung : nguoiDungList) {

                thongBaoWebSocketService
                        .guiSoThongBaoChuaDoc(nguoiDung);
            }
        };

        if (TransactionSynchronizationManager
                .isSynchronizationActive()) {

            TransactionSynchronizationManager
                    .registerSynchronization(
                            new TransactionSynchronization() {

                                @Override
                                public void afterCommit() {
                                    sendRealtime.run();
                                }
                            }
                    );

        } else {

            sendRealtime.run();
        }
    }

    // =====================================================
    // CONVERT ENTITY → RESPONSE
    // =====================================================

    private KhoThuocResponse toResponse(
            KhoThuoc entity) {

        KhoThuocResponse response =
                new KhoThuocResponse();

        response.setMaKhoThuoc(
                entity.getMaKhoThuoc()
        );

        if (entity.getThuoc() != null) {

            response.setMaThuoc(
                    entity.getThuoc().getMaThuoc()
            );

            response.setTenThuoc(
                    entity.getThuoc().getTenThuoc()
            );
        }

        response.setSoLuongTon(
                entity.getSoLuongTon()
        );

        response.setSoLo(
                entity.getSoLo()
        );

        response.setHanSuDung(
                entity.getHanSuDung()
        );

        response.setSoLuongToiThieu(
                entity.getSoLuongToiThieu()
        );

        response.setThoiGianCapNhatCuoi(
                entity.getThoiGianCapNhatCuoi()
        );

        response.setTrangThai(
                getTrangThai(
                        entity.getSoLuongTon(),
                        entity.getSoLuongToiThieu(),
                        entity.getHanSuDung()
                )
        );

        return response;
    }

    // =====================================================
    // XỬ LÝ TRẠNG THÁI
    // =====================================================

    private String getTrangThai(
            Integer soLuongTon,
            Integer soLuongToiThieu,
            LocalDate hanSuDung) {

        if (hanSuDung != null
                && hanSuDung.isBefore(LocalDate.now())) {

            return "Hết hạn";
        }

        if (soLuongTon == null
                || soLuongTon == 0) {

            return "Hết hàng";
        }

        if (soLuongToiThieu != null
                && soLuongTon <= soLuongToiThieu) {

            return "Sắp hết";
        }

        return "Đủ hàng";
    }

    // =====================================================
    // THÔNG BÁO XUẤT FILE TỒN KHO
    // =====================================================

    public void thongBaoXuatFile(
            String tenDangNhap
    ) {

        NguoiDung nguoiDung =
                nguoiDungRepository
                        .findByTenDangNhap(tenDangNhap)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy người dùng: "
                                                + tenDangNhap
                                )
                        );

        thongBaoService.taoThongBao(
                nguoiDung.getMaNguoiDung(),
                "Xuất file tồn kho",
                "Bạn đã xuất file danh sách tồn kho thuốc thành công.",
                "XUAT_FILE_TON_KHO"
        );
    }


    // =====================================================
    // THÔNG BÁO XUẤT FILE SẮP HẾT HẠN
    // =====================================================
    public void thongBaoXuatFileSapHetHan(String tenDangNhap) {

        NguoiDung nguoiDung =
                nguoiDungRepository
                        .findByTenDangNhap(tenDangNhap)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Không tìm thấy người dùng: "
                                                + tenDangNhap
                                )
                        );

        thongBaoService.taoThongBao(
                nguoiDung.getMaNguoiDung(),
                "Xuất file thuốc sắp hết hạn",
                "Bạn đã xuất file danh sách thuốc sắp hết hạn thành công.",
                "XUAT_FILE_THUOC_SAP_HET_HAN"
        );
    }

    // =====================================================
    // THÔNG BÁO XUẤT FILE HẾT HẠN
    // =====================================================

    public void thongBaoXuatFileHetHan(String tenDangNhap) {

        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhap(tenDangNhap)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy người dùng: " + tenDangNhap
                        )
                );

        // 1. Lưu thông báo vào database cho người đang đăng nhập.
        thongBaoService.taoThongBao(
                nguoiDung.getMaNguoiDung(),
                "Xuất file thuốc hết hạn",
                "Bạn đã xuất file danh sách thuốc hết hạn thành công.",
                "XUAT_FILE_THUOC_HET_HAN"
        );

        // 2. Cập nhật số thông báo chưa đọc qua WebSocket.
        guiCapNhatThongBaoRealtime();
    }

}