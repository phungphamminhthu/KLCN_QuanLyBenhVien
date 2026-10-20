
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.DatLichKhamRequest;
import QuanLyBenhVien.DTO.DatLichKhamResponse;
import QuanLyBenhVien.DTO.LichKhamCuaToiResponse;
import QuanLyBenhVien.Service.LichDangKyKhamService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lich-kham")
public class LichDangKyKhamController {

    private final LichDangKyKhamService lichDangKyKhamService;

    public LichDangKyKhamController(
            LichDangKyKhamService lichDangKyKhamService) {
        this.lichDangKyKhamService = lichDangKyKhamService;
    }

    @PostMapping("/dat-lich")
    public ResponseEntity<?> datLichKham(
            @Valid @RequestBody DatLichKhamRequest request,
            Authentication authentication) {

        try {
            DatLichKhamResponse response =
                    lichDangKyKhamService.datLichKham(
                            request, authentication);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // =============================================
    //
    // =============================================

    @GetMapping("/cua-toi")
    public ResponseEntity<?> layLichKhamCuaToi(
            Authentication authentication) {
        try {
            List<LichKhamCuaToiResponse> danhSach =
                    lichDangKyKhamService.layLichKhamCuaToi(
                            authentication);

            return ResponseEntity.ok(danhSach);

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

}
