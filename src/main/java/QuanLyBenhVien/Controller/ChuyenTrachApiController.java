package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.ChiDinhYTe;
import QuanLyBenhVien.Repository.ChiDinhYTeRepository;
import QuanLyBenhVien.Repository.KetQuaDichVuRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chuyen-trach")
public class ChuyenTrachApiController {
    private final ChiDinhYTeRepository chiDinhRepository;
    private final KetQuaDichVuRepository ketQuaRepository;

    public ChuyenTrachApiController(ChiDinhYTeRepository chiDinhRepository,
                                    KetQuaDichVuRepository ketQuaRepository) {
        this.chiDinhRepository = chiDinhRepository;
        this.ketQuaRepository = ketQuaRepository;
    }

    @GetMapping("/chi-dinh")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> danhSach(
            @RequestParam(required = false) LocalDate tuNgay,
            @RequestParam(required = false) LocalDate denNgay,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() ||
                authentication.getAuthorities().stream()
                        .noneMatch(a -> "ROLE_CHUYENTRACH".equals(a.getAuthority()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền truy cập");
        }
        LocalDate from = tuNgay == null ? LocalDate.now() : tuNgay;
        LocalDate to = denNgay == null ? from : denNgay;
        if (to.isBefore(from) || from.plusDays(31).isBefore(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng ngày tối đa 31 ngày");
        }
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();

        return chiDinhRepository
                .findByNgayChiDinhGreaterThanEqualAndNgayChiDinhLessThanOrderByNgayChiDinhDesc(start, end)
                .stream().map(this::toResponse).toList();
    }

    private Map<String, Object> toResponse(ChiDinhYTe c) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", c.getMaChiDinh());
        item.put("maHoSoBenhAn", c.getHoSoBenhAn().getMaHoSoBenhAn());
        item.put("dichVu", c.getDichVuYTe().getTenDichVu());
        item.put("maPhong", c.getMaPhong());
        item.put("ngayChiDinh", c.getNgayChiDinh());
        item.put("trangThai", c.getTrangThai());
        item.put("daCoKetQua", ketQuaRepository.findByChiDinhYTe_MaChiDinh(c.getMaChiDinh()).isPresent());
        return item;
    }
}
