package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.AuditLogResponse;
import QuanLyBenhVien.Service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;


    public AuditLogController(
            AuditLogService auditLogService
    ) {
        this.auditLogService = auditLogService;
    }


    // =====================================================
    // GET ALL AUDIT LOG
    // =====================================================

    @GetMapping
    public ResponseEntity<List<AuditLogResponse>> getAll() {

        return ResponseEntity.ok(
                auditLogService.getAll()
        );
    }
}
