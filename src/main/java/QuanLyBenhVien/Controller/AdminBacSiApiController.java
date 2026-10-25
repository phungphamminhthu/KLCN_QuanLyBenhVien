
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.Khoa;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.BacSiRepository;
import QuanLyBenhVien.Repository.KhoaRepository;
import QuanLyBenhVien.Repository.NguoiDungRepository;

import QuanLyBenhVien.Service.ThongBaoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import QuanLyBenhVien.Service.ThongBaoWebSocketService;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@RestController
@RequestMapping("/api/admin/bac-si")
public class AdminBacSiApiController {

    private final BacSiRepository bacSiRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final KhoaRepository khoaRepository;
    private final ThongBaoWebSocketService thongBaoWebSocketService;
    private final ThongBaoService thongBaoService;

    public AdminBacSiApiController(
            BacSiRepository bacSiRepository,
            NguoiDungRepository nguoiDungRepository,
            KhoaRepository khoaRepository,
            ThongBaoWebSocketService thongBaoWebSocketService,
            ThongBaoService thongBaoService) {
        this.bacSiRepository = bacSiRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.khoaRepository = khoaRepository;
        this.thongBaoWebSocketService = thongBaoWebSocketService;
        this.thongBaoService = thongBaoService;
    }

    // DTO trả về frontend
    public record BacSiResponse(
            Integer maBacSi,
            Integer maNguoiDung,
            String hoTen,
            String tenDangNhap,
            String email,
            Integer maKhoa,
            String tenKhoa,
            String chuyenMon,
            String trinhDo,
            String soChungChiHanhNghe,
            Boolean trangThai
    ) {}

    public record KhoaResponse(
            Integer maKhoa,
            String tenKhoa
    ) {}

    public record TaiKhoanBacSiResponse(
            Integer maNguoiDung,
            String hoTen,
            String tenDangNhap,
            String email
    ) {}

    public record BacSiRequest(
            Integer maNguoiDung,
            Integer maKhoa,
            String chuyenMon,
            String trinhDo,
            String soChungChiHanhNghe,
            Boolean trangThai
    ) {}

    // ==========================================
    // 1. LẤY DANH SÁCH BÁC SĨ
    // GET /api/admin/bac-si
    // ==========================================
    @GetMapping
    @Transactional(readOnly = true)
    public List<BacSiResponse> layDanhSachBacSi() {
        return bacSiRepository.findAll()
                .stream()
                .map(this::toBacSiResponse)
                .toList();
    }

    // ==========================================
    // 2. LẤY DANH SÁCH KHOA
    // GET /api/admin/bac-si/khoa
    // ==========================================
    @GetMapping("/khoa")
    @Transactional(readOnly = true)
    public List<KhoaResponse> layDanhSachKhoa() {
        return khoaRepository.findAllByOrderByMaKhoaAsc()
                .stream()
                .map(k -> new KhoaResponse(
                        k.getMaKhoa(),
                        k.getTenKhoa()
                ))
                .toList();
    }

    // ==========================================
    // 3. TÀI KHOẢN BÁC SĨ CHƯA CÓ HỒ SƠ
    // GET /api/admin/bac-si/tai-khoan-chua-co-ho-so
    // ==========================================
    @GetMapping("/tai-khoan-chua-co-ho-so")
    @Transactional(readOnly = true)
    public List<TaiKhoanBacSiResponse> layTaiKhoanChuaCoHoSo() {
        return nguoiDungRepository
                .findByVaiTro_TenVaiTroIgnoreCaseAndTrangThaiTrue("BACSI")
                .stream()
                .filter(n -> bacSiRepository
                        .timTheoMaNguoiDung(n.getMaNguoiDung())
                        .isEmpty())
                .map(n -> new TaiKhoanBacSiResponse(
                        n.getMaNguoiDung(),
                        n.getHoTen(),
                        n.getTenDangNhap(),
                        n.getEmail()
                ))
                .toList();
    }

    // ==========================================
    // 4. THÊM HỒ SƠ BÁC SĨ
    // POST /api/admin/bac-si
    // ==========================================
    @PostMapping
    @Transactional
    public ResponseEntity<BacSiResponse> themBacSi(
            @RequestBody BacSiRequest request,Authentication authentication) {

        if (request.maNguoiDung() == null
                || request.maKhoa() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn tài khoản và khoa."
            );
        }

        NguoiDung nguoiDung = nguoiDungRepository
                .findById(request.maNguoiDung())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy tài khoản."
                ));

        if (bacSiRepository
                .timTheoMaNguoiDung(nguoiDung.getMaNguoiDung())
                .isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Tài khoản này đã có hồ sơ bác sĩ."
            );
        }

        // Chỉ cho phép tạo hồ sơ cho tài khoản có vai trò BACSI.
        if (nguoiDung.getVaiTro() == null
                || nguoiDung.getVaiTro().getTenVaiTro() == null
                || !nguoiDung.getVaiTro().getTenVaiTro()
                .equalsIgnoreCase("BACSI")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tài khoản được chọn không có vai trò bác sĩ."
            );
        }

        Khoa khoa = khoaRepository.findById(request.maKhoa())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy khoa."
                ));

        BacSi bacSi = new BacSi();
        bacSi.setNguoiDung(nguoiDung);
        bacSi.setKhoa(khoa);
        bacSi.setChuyenMon(request.chuyenMon());
        bacSi.setTrinhDo(request.trinhDo());
        bacSi.setSoChungChiHanhNghe(
                request.soChungChiHanhNghe()
        );
        bacSi.setTrangThai(
                request.trangThai() == null
                        || request.trangThai()
        );

        BacSi bacSiDaLuu = bacSiRepository.save(bacSi);

        // 1. Thông báo cho bác sĩ được bổ sung hồ sơ
        thongBaoService.taoThongBaoVaGuiRealtime(
                nguoiDung.getMaNguoiDung(),
                "Hồ sơ chuyên môn đã được tạo",
                "Hồ sơ bác sĩ của bạn đã được bổ sung thành công."
                        + " Vui lòng kiểm tra thông tin chuyên môn và khoa công tác.",
                "HO_SO_BAC_SI"
        );

        // 2. Thông báo cho Admin đang thực hiện thao tác
        if (authentication != null && authentication.isAuthenticated()) {
            nguoiDungRepository.findByTenDangNhap(authentication.getName())
                    .filter(admin -> admin.getVaiTro() != null
                            && "ADMIN".equalsIgnoreCase(
                            admin.getVaiTro().getTenVaiTro()))
                    .ifPresent(admin ->
                            thongBaoService.taoThongBaoVaGuiRealtime(
                                    admin.getMaNguoiDung(),
                                    "Bổ sung hồ sơ bác sĩ thành công",
                                    "Bạn đã bổ sung hồ sơ chuyên môn cho bác sĩ "
                                            + nguoiDung.getHoTen() + ".",
                                    "HO_SO_BAC_SI"
                            )
                    );
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toBacSiResponse(bacSiDaLuu));
    }

    // ==========================================
    // 5. CẬP NHẬT HỒ SƠ BÁC SĨ
    // PUT /api/admin/bac-si/{maBacSi}
    // ==========================================

    @PutMapping("/{maBacSi}")
    @Transactional
    public BacSiResponse capNhatBacSi(
            @PathVariable Integer maBacSi,
            @RequestBody BacSiRequest request,Authentication authentication) {

        BacSi bacSi = bacSiRepository.findById(maBacSi)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hồ sơ bác sĩ."
                ));

        if (request.maKhoa() != null) {
            Khoa khoa = khoaRepository.findById(request.maKhoa())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy khoa."
                    ));
            bacSi.setKhoa(khoa);
        }

        if (request.chuyenMon() != null) {
            bacSi.setChuyenMon(request.chuyenMon());
        }

        if (request.trinhDo() != null) {
            bacSi.setTrinhDo(request.trinhDo());
        }

        if (request.soChungChiHanhNghe() != null) {
            bacSi.setSoChungChiHanhNghe(
                    request.soChungChiHanhNghe()
            );
        }

        if (request.trangThai() != null) {
            bacSi.setTrangThai(request.trangThai());
        }

        // Lưu thông tin hồ sơ bác sĩ đã cập nhật
        BacSi bacSiDaLuu = bacSiRepository.save(bacSi);

        // Tạo thông báo cho tài khoản bác sĩ
        NguoiDung nguoiDung = bacSiDaLuu.getNguoiDung();

        if (nguoiDung != null) {
            // Thông báo cho bác sĩ được chỉnh sửa
            thongBaoService.taoThongBaoVaGuiRealtime(
                    nguoiDung.getMaNguoiDung(),
                    "Hồ sơ bác sĩ đã được cập nhật",
                    "Hồ sơ chuyên môn của bạn đã được cập nhật."
                            + " Vui lòng kiểm tra lại thông tin hồ sơ.",
                    "HO_SO_BAC_SI"
            );
        }

// Thông báo cho Admin đang thực hiện thao tác
        if (authentication != null && authentication.isAuthenticated()) {
            nguoiDungRepository.findByTenDangNhap(authentication.getName())
                    .filter(admin -> admin.getVaiTro() != null
                            && "ADMIN".equalsIgnoreCase(
                            admin.getVaiTro().getTenVaiTro()))
                    .ifPresent(admin ->
                            thongBaoService.taoThongBaoVaGuiRealtime(
                                    admin.getMaNguoiDung(),
                                    "Cập nhật hồ sơ bác sĩ thành công",
                                    "Bạn đã cập nhật hồ sơ chuyên môn cho bác sĩ "
                                            + (nguoiDung != null
                                            ? nguoiDung.getHoTen()
                                            : "được chọn") + ".",
                                    "HO_SO_BAC_SI"
                            )
                    );
        }

        return toBacSiResponse(bacSiDaLuu);
    }


    // ==========================================
    // CHUYỂN ENTITY SANG DTO
    // ==========================================
    private BacSiResponse toBacSiResponse(BacSi b) {
        NguoiDung n = b.getNguoiDung();
        Khoa k = b.getKhoa();

        return new BacSiResponse(
                b.getMaBacSi(),
                n != null ? n.getMaNguoiDung() : null,
                n != null ? n.getHoTen() : null,
                n != null ? n.getTenDangNhap() : null,
                n != null ? n.getEmail() : null,
                k != null ? k.getMaKhoa() : null,
                k != null ? k.getTenKhoa() : null,
                b.getChuyenMon(),
                b.getTrinhDo(),
                b.getSoChungChiHanhNghe(),
                b.getTrangThai()
        );
    }
}

