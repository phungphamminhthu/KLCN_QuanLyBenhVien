
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.CloudflareR2Service;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Map;

@RestController
public class ImageController {

    private final CloudflareR2Service cloudflareR2Service;

    public ImageController(CloudflareR2Service cloudflareR2Service) {
        this.cloudflareR2Service = cloudflareR2Service;
    }

    @GetMapping("/Images/{fileName:.+}")
    public ResponseEntity<?> getImage(
            @PathVariable String fileName
    ) {
        // Chỉ nhận tên file, không cho phép đường dẫn tùy ý
        if (fileName.contains("/") || fileName.contains("\\")
                || fileName.equals(".") || fileName.equals("..")) {
            return ResponseEntity.badRequest().build();
        }

        // 1. Ưu tiên ảnh có sẵn trong static/Images
        ClassPathResource localImage =
                new ClassPathResource("static/Images/" + fileName);

        try {
            if (localImage.exists() && localImage.isReadable()) {
                String contentType = Files.probeContentType(
                        java.nio.file.Path.of(fileName)
                );

                MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
                if (contentType != null) {
                    try {
                        mediaType = MediaType.parseMediaType(contentType);
                    } catch (Exception ignored) {
                        // Giữ content type mặc định nếu không hợp lệ
                    }
                }

                return ResponseEntity.ok()
                        .contentType(mediaType)
                        .body(new InputStreamResource(
                                localImage.getInputStream()
                        ));
            }
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }

        // 2. Nếu không có ảnh local thì lấy từ Cloudflare R2
        return cloudflareR2Service.getImage("images/" + fileName);
    }
}
