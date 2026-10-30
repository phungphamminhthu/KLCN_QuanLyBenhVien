package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.ThietBiNguoiDung;
import QuanLyBenhVien.Repository.ThietBiNguoiDungRepository;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.MessagingErrorCode;
import org.springframework.transaction.annotation.Propagation;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FcmPushService {

    private final ThietBiNguoiDungRepository thietBiRepository;
    private final FirebaseMessaging firebaseMessaging;

    public FcmPushService(
            ThietBiNguoiDungRepository thietBiRepository,
            FirebaseApp firebaseApp
    ) {
        this.thietBiRepository = thietBiRepository;
        this.firebaseMessaging = FirebaseMessaging.getInstance(firebaseApp);
    }

    /**
     * Gửi Push Notification đến tất cả thiết bị đang hoạt động
     * của một người dùng.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void guiThongBao(
            Integer maNguoiDung,
            Integer maThongBao,
            String tieuDe,
            String noiDung,
            String loaiThongBao
    ) {
        List<ThietBiNguoiDung> thietBis =
                thietBiRepository
                        .findByNguoiDung_MaNguoiDungAndTrangThaiTrue(maNguoiDung);

        if (thietBis.isEmpty()) {
            return;
        }

        String title = (tieuDe == null || tieuDe.isBlank())
                ? "Thông báo bệnh viện"
                : tieuDe;

        String body = noiDung == null ? "" : noiDung;

        String type = (loaiThongBao == null || loaiThongBao.isBlank())
                ? "general"
                : loaiThongBao;

        Map<String, String> data = new HashMap<>();
        data.put("notificationId", String.valueOf(maThongBao));
        data.put("type", type);

        for (ThietBiNguoiDung thietBi : thietBis) {
            String token = thietBi.getFcmToken();

            if (token == null || token.isBlank()) {
                continue;
            }

            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(
                            Notification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .build()
                    )
                    .putAllData(data)
                    .build();

            try {
                firebaseMessaging.send(message);

            } catch (FirebaseMessagingException e) {

                // Chỉ vô hiệu hóa token nếu Firebase xác nhận token
                // không còn được đăng ký.
                if (e.getMessagingErrorCode()
                        == MessagingErrorCode.UNREGISTERED) {
                    thietBi.setTrangThai(false);
                    thietBiRepository.save(thietBi);
                }

                // Không để lỗi gửi FCM làm ảnh hưởng việc lưu thông báo.
                System.err.println(
                        "Không gửi được FCM đến thiết bị "
                                + thietBi.getMaThietBi()
                                + ": " + e.getMessage()
                );
            }
        }
    }
}