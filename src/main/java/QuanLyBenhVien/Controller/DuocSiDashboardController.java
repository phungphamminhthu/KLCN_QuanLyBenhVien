package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.DuocSiDashboardResponse;
import QuanLyBenhVien.Service.DuocSiDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/duocsi/dashboard")
public class DuocSiDashboardController {

    private final DuocSiDashboardService dashboardService;


    public DuocSiDashboardController(
            DuocSiDashboardService dashboardService
    ) {
        this.dashboardService =
                dashboardService;
    }


    @GetMapping
    public ResponseEntity<DuocSiDashboardResponse>
    getDashboard() {

        return ResponseEntity.ok(
                dashboardService.getDashboard()
        );
    }
}