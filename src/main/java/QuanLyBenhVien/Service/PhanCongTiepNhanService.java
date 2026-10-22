
package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.PhanCongTiepNhanRequest;
import QuanLyBenhVien.DTO.PhanCongTiepNhanResponse;
import QuanLyBenhVien.Entity.Khoa;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.PhanCongTiepNhan;
import QuanLyBenhVien.Repository.KhoaRepository;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.PhanCongTiepNhanRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
public class PhanCongTiepNhanService {

    private final PhanCongTiepNhanRepository phanCongRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final KhoaRepository khoaRepository;

    public PhanCongTiepNhanService(
            PhanCongTiepNhanRepository phanCongRepository,
            NguoiDungRepository nguoiDungRepository,
            KhoaRepository khoaRepository) {

        this.phanCongRepository = phanCongRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.khoaRepository = khoaRepository;
    }

    // Lấy danh sách phân công
    @Transactional(readOnly = true)
    public List<PhanCongTiepNhanResponse> getAll() {
        return phanCongRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Lấy danh sách nhân viên tiếp nhận đang hoạt động
    @Transactional(readOnly = true)
    public List<NguoiDung> getNhanVienTiepNhan() {
        return nguoiDungRepository.findAll()
                .stream()
                .filter(nd -> Boolean.TRUE.equals(nd.getTrangThai()))
                .filter(nd -> nd.getVaiTro() != null
                        && "TIEPNHAN".equalsIgnoreCase(
                        nd.getVaiTro().getTenVaiTro()))
                .toList();
    }

    // Lấy danh sách khoa
    @Transactional(readOnly = true)
    public List<Khoa> getDanhSachKhoa() {
        return khoaRepository.findAll()
                .stream()
                .sorted(
                        Comparator.comparing(
                                Khoa::getTenKhoa,
                                Comparator.nullsLast(
                                        String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    // Tạo phân công tiếp nhận
    @Transactional
    public PhanCongTiepNhanResponse create(
            PhanCongTiepNhanRequest request,
            Integer maAdmin) {

        // Kiểm tra Admin đã được xác định chưa
        if (maAdmin == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Không xác định được tài khoản Admin.");
        }

        // Kiểm tra dữ liệu đầu vào
        if (request == null
                || request.getMaNhanVienTiepNhan() == null
                || request.getMaKhoa() == null
                || request.getThoiGianBatDau() == null
                || request.getThoiGianKetThuc() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng nhập đầy đủ thông tin phân công.");
        }

        LocalDateTime batDau = request.getThoiGianBatDau();
        LocalDateTime ketThuc = request.getThoiGianKetThuc();

        // Thời gian kết thúc phải sau thời gian bắt đầu
        if (!ketThuc.isAfter(batDau)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Thời gian kết thúc phải sau thời gian bắt đầu.");
        }

        // Tìm nhân viên tiếp nhận
        NguoiDung nhanVien = nguoiDungRepository
                .findById(request.getMaNhanVienTiepNhan())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy nhân viên tiếp nhận."));

        // Kiểm tra nhân viên còn hoạt động và đúng vai trò
        if (!Boolean.TRUE.equals(nhanVien.getTrangThai())
                || nhanVien.getVaiTro() == null
                || !"TIEPNHAN".equalsIgnoreCase(
                nhanVien.getVaiTro().getTenVaiTro())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tài khoản được chọn không phải nhân viên tiếp nhận đang hoạt động.");
        }

        // Tìm khoa
        Khoa khoa = khoaRepository
                .findById(request.getMaKhoa())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy khoa được chọn."));

        // Tìm người phân công
        NguoiDung admin = nguoiDungRepository
                .findById(maAdmin)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Không xác định được tài khoản Admin."));

        // Kiểm tra quyền và trạng thái Admin
        if (!Boolean.TRUE.equals(admin.getTrangThai())
                || admin.getVaiTro() == null
                || !"ADMIN".equalsIgnoreCase(
                admin.getVaiTro().getTenVaiTro())) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Chỉ Admin đang hoạt động mới được phân công.");
        }

        // Kiểm tra nhân viên đã có ca bị trùng hay chưa
        boolean trungCa = phanCongRepository.existsCaTrung(
                nhanVien.getMaNguoiDung(),
                batDau,
                ketThuc);

        if (trungCa) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Nhân viên đã có phân công trùng thời gian này.");
        }

        // Tạo bản ghi phân công
        PhanCongTiepNhan phanCong = new PhanCongTiepNhan();

        phanCong.setMaNhanVienTiepNhan(
                nhanVien.getMaNguoiDung());

        phanCong.setMaKhoa(
                khoa.getMaKhoa());

        phanCong.setMaNguoiPhanCong(
                admin.getMaNguoiDung());

        phanCong.setThoiGianBatDau(batDau);
        phanCong.setThoiGianKetThuc(ketThuc);
        phanCong.setTrangThai((byte) 1);

        // Lưu xuống cơ sở dữ liệu
        PhanCongTiepNhan saved =
                phanCongRepository.save(phanCong);

        return toResponse(saved);
    }

    // Chuyển Entity sang Response DTO
    private PhanCongTiepNhanResponse toResponse(
            PhanCongTiepNhan p) {

        NguoiDung nhanVien = nguoiDungRepository
                .findById(p.getMaNhanVienTiepNhan())
                .orElse(null);

        Khoa khoa = khoaRepository
                .findById(p.getMaKhoa())
                .orElse(null);

        NguoiDung admin = nguoiDungRepository
                .findById(p.getMaNguoiPhanCong())
                .orElse(null);

        return new PhanCongTiepNhanResponse(
                p.getMaPhanCong(),

                p.getMaNhanVienTiepNhan(),
                nhanVien != null
                        ? nhanVien.getHoTen()
                        : "Không xác định",

                p.getMaKhoa(),
                khoa != null
                        ? khoa.getTenKhoa()
                        : "Không xác định",

                p.getMaNguoiPhanCong(),
                admin != null
                        ? admin.getHoTen()
                        : "Không xác định",

                p.getThoiGianBatDau(),
                p.getThoiGianKetThuc(),
                p.getTrangThai(),
                p.getNgayTao()
        );
    }
}
