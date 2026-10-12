package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.ThongKeBaoCaoResponse;
import QuanLyBenhVien.Service.ThongKeBaoCaoService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/thong-ke-bao-cao")
public class ThongKeBaoCaoController {

    private final ThongKeBaoCaoService service;


    public ThongKeBaoCaoController(
            ThongKeBaoCaoService service
    ) {
        this.service = service;
    }


    @GetMapping
    public ResponseEntity<ThongKeBaoCaoResponse> getThongKe(

            @RequestParam(
                    defaultValue = "30days"
            )
            String period,

            @RequestParam(
                    required = false
            )
            LocalDate date,

            @RequestParam(
                    required = false
            )
            Integer maKhoa

    ) {

        return ResponseEntity.ok(
                service.getThongKe(
                        period,
                        date,
                        maKhoa
                )
        );
    }

    // ============================================
    // EXPORT XLSX
    // ============================================
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportReport(

            @RequestParam(defaultValue = "30days")
            String period,

            @RequestParam(required = false)
            Integer maKhoa,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date

    ) throws Exception {

        byte[] file = service.exportExcel(
                period,
                maKhoa,
                date
        );

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=BaoCao_ThongKe.xlsx"
                )
                .contentType(
                        MediaType.parseMediaType(
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                )
                .body(file);
    }

}
