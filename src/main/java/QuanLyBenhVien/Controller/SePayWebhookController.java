
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.SePayWebhookRequest;
import QuanLyBenhVien.Service.SePayService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sepay")
public class SePayWebhookController {

    private final SePayService sePayService;

    public SePayWebhookController(SePayService sePayService) {
        this.sePayService = sePayService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> webhook(
            @RequestHeader(value = "Authorization", required = false)
            String authorization,
            @RequestBody SePayWebhookRequest request) {

        System.out.println("=== SEPAY WEBHOOK RECEIVED ===");

        if (!sePayService.xacThucApiKey(authorization)) {
            System.out.println("=== SEPAY API KEY INVALID ===");

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "success", false,
                            "message", "API Key không hợp lệ."
                    ));
        }

        try {
            String message = sePayService.xuLyWebhook(request);

            System.out.println("=== SEPAY WEBHOOK SUCCESS: " + message + " ===");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", message
            ));

        } catch (IllegalArgumentException ex) {
            System.out.println("=== SEPAY WEBHOOK REJECTED: "
                    + ex.getMessage() + " ===");

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "success", false,
                            "message", ex.getMessage()
                    ));
        }
    }

}
