package QuanLyBenhVien.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@Service
public class CloudflareR2Service {

    private final S3Client s3Client;

    @Value("${cloudflare.r2.bucket}")
    private String bucketName;

    public CloudflareR2Service(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    // =========================
    // UPLOAD IMAGE
    // =========================
    public String uploadImage(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File không được để trống");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("Kích thước file không được vượt quá 5MB");
        }

        String contentType = file.getContentType();

        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Chỉ được upload file hình ảnh");
        }

        String originalFilename = file.getOriginalFilename();

        String extension = "";

        if (originalFilename != null && originalFilename.contains(".")) {
            extension =
                    originalFilename.substring(
                            originalFilename.lastIndexOf(".")
                    );
        }

        String fileName = UUID.randomUUID() + extension;

        String objectKey = "images/" + fileName;

        try {

            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(
                    request,
                    RequestBody.fromInputStream(
                            file.getInputStream(),
                            file.getSize()
                    )
            );

            return objectKey;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Upload hình ảnh lên Cloudflare R2 thất bại",
                    e
            );
        }
    }


    // =========================
    // GET IMAGE FROM R2
    // =========================
    public ResponseEntity<InputStreamResource> getImage(String fileKey) {

        try {

            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .build();

            ResponseInputStream<GetObjectResponse> inputStream =
                    s3Client.getObject(request);

            String contentType =
                    inputStream.response().contentType();

            MediaType mediaType;

            if (contentType != null) {
                mediaType = MediaType.parseMediaType(contentType);
            } else {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }

            InputStreamResource resource =
                    new InputStreamResource(inputStream);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .body(resource);

        } catch (Exception e) {

            throw new RuntimeException(
                    "Không thể lấy hình ảnh từ Cloudflare R2",
                    e
            );
        }
    }
}