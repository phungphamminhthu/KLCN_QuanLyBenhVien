package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.*;
import QuanLyBenhVien.Service.BacSiHoSoCaNhanService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bac-si/ho-so-ca-nhan")
public class BacSiHoSoCaNhanController {

    private final BacSiHoSoCaNhanService service;

    public BacSiHoSoCaNhanController(
            BacSiHoSoCaNhanService service
    ) {
        this.service = service;
    }

    @GetMapping
    public BacSiHoSoCaNhanDTO xemHoSo(
            Authentication authentication
    ) {
        return service.xemHoSo(authentication);
    }

    @PutMapping
    public BacSiHoSoCaNhanDTO capNhat(
            Authentication authentication,
            @RequestBody CapNhatHoSoCaNhanRequest request
    ) {
        return service.capNhat(authentication, request);
    }

    @PutMapping("/doi-mat-khau")
    public ResponseEntity<Map<String, String>> doiMatKhau(
            Authentication authentication,
            @RequestBody DoiMatKhauRequest request
    ) {

        service.doiMatKhau(authentication, request);

        return ResponseEntity.ok(
                Map.of("message", "Đổi mật khẩu thành công")
        );
    }
}