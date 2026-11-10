
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.PhanCongChuyenTrachRequest;
import QuanLyBenhVien.DTO.PhanCongChuyenTrachResponse;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.PhanCongChuyenTrach;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.PhanCongChuyenTrachRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PhanCongChuyenTrachService {

    private static final String VAI_TRO_CHUYEN_TRACH = "CHUYENTRACH";

    private final PhanCongChuyenTrachRepository repository;
    private final NguoiDungRepository nguoiDungRepository;
    private final ThongBaoService thongBaoService;

    public PhanCongChuyenTrachService(
            PhanCongChuyenTrachRepository repository,
            NguoiDungRepository nguoiDungRepository,
            ThongBaoService thongBaoService
    ) {
        this.repository = repository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.thongBaoService = thongBaoService;
    }

    // =========================================
    // LẤY DANH SÁCH PHÂN CÔNG
    // =========================================
    @Transactional(readOnly = true)
    public List<PhanCongChuyenTrachResponse> getAll() {

        return repository
                .findAllByOrderByNgayLamViecDescGioBatDauDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================
    // LẤY TÀI KHOẢN CHUYÊN TRÁCH
    // =========================================
    @Transactional(readOnly = true)
    public List<NguoiDung> getTaiKhoanChuyenTrach() {

        return nguoiDungRepository.findAll()
                .stream()
                .filter(nd -> Boolean.TRUE.equals(nd.getTrangThai()))
                .filter(nd -> nd.getVaiTro() != null
                        && VAI_TRO_CHUYEN_TRACH.equalsIgnoreCase(
                        nd.getVaiTro().getTenVaiTro()))
                .toList();
    }

    // =========================================
    // LỊCH CỦA TÀI KHOẢN CHUYÊN TRÁCH
    // =========================================
    @Transactional(readOnly = true)
    public List<PhanCongChuyenTrachResponse> getLichCuaToi(
            Integer maNguoiDung
    ) {

        if (maNguoiDung == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Không xác định được tài khoản."
            );
        }

        return repository
                .findByMaNguoiDungOrderByNgayLamViecDescGioBatDauDesc(
                        maNguoiDung
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================================
    // ENTITY -> RESPONSE
    // =========================================
    private PhanCongChuyenTrachResponse toResponse(
            PhanCongChuyenTrach p
    ) {

        NguoiDung nhanVien = nguoiDungRepository
                .findById(p.getMaNguoiDung())
                .orElse(null);

        NguoiDung admin = nguoiDungRepository
                .findById(p.getMaNguoiPhanCong())
                .orElse(null);

        return new PhanCongChuyenTrachResponse(
                p.getMaPhanCongChuyenTrach(),
                p.getMaNguoiDung(),
                nhanVien != null
                        ? nhanVien.getHoTen()
                        : "Không xác định",
                p.getNgayLamViec(),
                p.getGioBatDau(),
                p.getGioKetThuc(),
                p.getGhiChu(),
                admin != null
                        ? admin.getHoTen()
                        : "Không xác định",
                p.getTrangThai(),
                p.getNgayTao()
        );
    }

    // =========================
    //
    // =========================

    @Transactional
    public List<PhanCongChuyenTrachResponse> create(
            PhanCongChuyenTrachRequest request,
            Integer maAdmin
    ) {
        if (maAdmin == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Không xác định được tài khoản Admin."
            );
        }

        if (request == null
                || request.getMaNguoiDungs() == null
                || request.getMaNguoiDungs().isEmpty()
                || request.getNgayLamViec() == null
                || request.getGioBatDau() == null
                || request.getGioKetThuc() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn nhân viên và nhập đầy đủ ngày, giờ làm việc."
            );
        }

        if (!request.getGioKetThuc().isAfter(request.getGioBatDau())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Giờ kết thúc phải sau giờ bắt đầu."
            );
        }

        // Kiểm tra Admin
        NguoiDung admin = nguoiDungRepository.findById(maAdmin)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Không tìm thấy tài khoản Admin."
                ));

        if (!Boolean.TRUE.equals(admin.getTrangThai())
                || admin.getVaiTro() == null
                || !"ADMIN".equalsIgnoreCase(
                admin.getVaiTro().getTenVaiTro())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ Admin đang hoạt động mới được phân công."
            );
        }

        // Không cho gửi trùng mã nhân viên trong cùng yêu cầu
        List<Integer> maNguoiDungs = request.getMaNguoiDungs()
                .stream()
                .distinct()
                .toList();

        if (maNguoiDungs.size() != request.getMaNguoiDungs().size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Danh sách nhân viên có mã bị trùng."
            );
        }

        List<PhanCongChuyenTrachResponse> ketQua = new java.util.ArrayList<>();

        DateTimeFormatter ngayFormatter =
                DateTimeFormatter.ofPattern("dd/MM/yyyy");

        DateTimeFormatter gioFormatter =
                DateTimeFormatter.ofPattern("HH:mm");

        // Kiểm tra toàn bộ nhân viên trước khi lưu
        List<NguoiDung> nhanViens = maNguoiDungs.stream()
                .map(id -> nguoiDungRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Không tìm thấy nhân viên có mã: " + id
                        )))
                .toList();

        for (NguoiDung nhanVien : nhanViens) {
            if (!Boolean.TRUE.equals(nhanVien.getTrangThai())
                    || nhanVien.getVaiTro() == null
                    || !VAI_TRO_CHUYEN_TRACH.equalsIgnoreCase(
                    nhanVien.getVaiTro().getTenVaiTro())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Tài khoản mã " + nhanVien.getMaNguoiDung()
                                + " không phải nhân viên chuyên trách đang hoạt động."
                );
            }

            boolean trungCa = repository.existsCaTrung(
                    nhanVien.getMaNguoiDung(),
                    request.getNgayLamViec(),
                    request.getGioBatDau(),
                    request.getGioKetThuc()
            );

            if (trungCa) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Nhân viên " + nhanVien.getHoTen()
                                + " đã có lịch bị trùng giờ."
                );
            }
        }

        // Lưu lịch và gửi thông báo riêng cho từng nhân viên
        for (NguoiDung nhanVien : nhanViens) {
            PhanCongChuyenTrach phanCong = new PhanCongChuyenTrach();

            phanCong.setMaNguoiDung(nhanVien.getMaNguoiDung());
            phanCong.setMaNguoiPhanCong(admin.getMaNguoiDung());
            phanCong.setNgayLamViec(request.getNgayLamViec());
            phanCong.setGioBatDau(request.getGioBatDau());
            phanCong.setGioKetThuc(request.getGioKetThuc());
            phanCong.setGhiChu(request.getGhiChu());
            phanCong.setTrangThai((byte) 1);

            PhanCongChuyenTrach saved =
                    repository.saveAndFlush(phanCong);

            String noiDung = "Admin " + admin.getHoTen()
                    + " đã phân công lịch làm việc cho bạn vào ngày "
                    + saved.getNgayLamViec().format(ngayFormatter)
                    + ", từ "
                    + saved.getGioBatDau().format(gioFormatter)
                    + " đến "
                    + saved.getGioKetThuc().format(gioFormatter)
                    + ". Vui lòng kiểm tra lịch làm việc.";

            if (saved.getGhiChu() != null
                    && !saved.getGhiChu().isBlank()) {
                noiDung += " Ghi chú: " + saved.getGhiChu();
            }

            thongBaoService.taoThongBao(
                    nhanVien.getMaNguoiDung(),
                    "Bạn vừa được phân công lịch làm việc",
                    noiDung,
                    "LICH_LAM_VIEC_CHUYEN_TRACH"
            );

            ketQua.add(toResponse(saved));
        }

        // Gửi thông báo xác nhận cho chính Admin đang phân công
        thongBaoService.taoThongBao(
                admin.getMaNguoiDung(),
                "Phân công lịch làm việc thành công",
                "Bạn đã phân công lịch làm việc ngày "
                        + request.getNgayLamViec().format(ngayFormatter)
                        + " từ "
                        + request.getGioBatDau().format(gioFormatter)
                        + " đến "
                        + request.getGioKetThuc().format(gioFormatter)
                        + " cho " + nhanViens.size()
                        + " nhân viên chuyên trách.",
                "PHAN_CONG_CHUYEN_TRACH"
        );

        return ketQua;
    }

}
