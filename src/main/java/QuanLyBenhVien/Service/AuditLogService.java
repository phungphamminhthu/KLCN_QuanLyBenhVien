package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.AuditLogResponse;
import QuanLyBenhVien.Entity.AuditLog;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.AuditLogRepository;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final NguoiDungRepository nguoiDungRepository;

    public AuditLogService(
            AuditLogRepository auditLogRepository,
            NguoiDungRepository nguoiDungRepository
    ) {
        this.auditLogRepository = auditLogRepository;
        this.nguoiDungRepository = nguoiDungRepository;
    }

    public void log(
            String hanhDong,
            String doiTuong,
            String maDoiTuong,
            String noiDung,
            HttpServletRequest request
    ) {

        AuditLog auditLog = new AuditLog();

        /*
         * Lấy người dùng đang đăng nhập
         */
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getName() != null) {

            String username = authentication.getName();

            nguoiDungRepository
                    .findByTenDangNhap(username)
                    .ifPresent(auditLog::setNguoiDung);
        }

        auditLog.setHanhDong(hanhDong);
        auditLog.setDoiTuong(doiTuong);
        auditLog.setMaDoiTuong(maDoiTuong);
        auditLog.setNoiDung(noiDung);

        /*
         * Lấy IP người thực hiện
         */
        if (request != null) {

            String ip = request.getHeader("X-Forwarded-For");

            if (ip == null || ip.isBlank()) {
                ip = request.getRemoteAddr();
            }

            if (ip != null && ip.contains(",")) {
                ip = ip.split(",")[0].trim();
            }

            auditLog.setDiaChiIP(ip);
        }

        auditLog.setThoiGian(LocalDateTime.now());

        auditLogRepository.save(auditLog);
    }

    // ================================================
    //    GETALL()
    //=================================================
    public List<AuditLogResponse> getAll() {

        return auditLogRepository
                .findAll(
                        org.springframework.data.domain.Sort
                                .by(
                                        org.springframework.data.domain.Sort.Direction.DESC,
                                        "thoiGian"
                                )
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private AuditLogResponse toResponse(AuditLog log) {

        Integer maNguoiDung = null;
        String tenNguoiDung = "-";
        String vaiTro = "-";

        if (log.getNguoiDung() != null) {

            maNguoiDung =
                    log.getNguoiDung().getMaNguoiDung();

            tenNguoiDung =
                    log.getNguoiDung().getTenDangNhap();

            if (log.getNguoiDung().getVaiTro() != null) {

                vaiTro =
                        log.getNguoiDung()
                                .getVaiTro()
                                .getTenVaiTro();
            }
        }

        return new AuditLogResponse(
                log.getMaAuditLog(),
                maNguoiDung,
                tenNguoiDung,
                vaiTro,
                log.getHanhDong(),
                log.getDoiTuong(),
                log.getMaDoiTuong(),
                log.getNoiDung(),
                log.getDiaChiIP(),
                log.getThoiGian()
        );
    }
}
