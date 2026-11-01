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

    // =====================================================
    // THỐNG KÊ
    // =====================================================
    @GetMapping
    public ResponseEntity<ThongKeBaoCaoResponse> getThongKe(

            @RequestParam(defaultValue = "30days")
            String period,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate,

            @RequestParam(required = false)
            Integer maKhoa

    ) {
        return ResponseEntity.ok(
                service.getThongKe(
                        period,
                        date,
                        fromDate,
                        toDate,
                        maKhoa
                )
        );
    }

    // =====================================================
    // EXPORT XLSX
    // =====================================================
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportReport(

            @RequestParam(defaultValue = "30days")
            String period,

            @RequestParam(required = false)
            Integer maKhoa,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate fromDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate toDate

    ) throws Exception {

        byte[] file = service.exportExcel(
                period,
                maKhoa,
                date,
                fromDate,
                toDate
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