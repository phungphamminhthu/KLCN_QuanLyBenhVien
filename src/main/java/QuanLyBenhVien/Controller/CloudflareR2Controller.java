package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.CloudflareR2Service;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/images")
public class CloudflareR2Controller {

    private final CloudflareR2Service r2Service;

    public CloudflareR2Controller(CloudflareR2Service r2Service) {
        this.r2Service = r2Service;
    }


    // =========================
    // UPLOAD
    // =========================
    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file) {

        String objectKey = r2Service.uploadImage(file);

        Map<String, Object> response = new HashMap<>();

        response.put(
                "message",
                "Upload hình ảnh thành công"
        );

        response.put(
                "fileKey",
                objectKey
        );

        return ResponseEntity.ok(response);
    }


    // =========================
    // VIEW IMAGE
    // =========================
    @GetMapping("/view")
    public ResponseEntity<InputStreamResource> viewImage(
            @RequestParam("fileKey") String fileKey) {

        return r2Service.getImage(fileKey);
    }
}