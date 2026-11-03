package QuanLyBenhVien.Service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ThongBaoChuyenTrachWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public ThongBaoChuyenTrachWebSocketService(
            SimpMessagingTemplate messagingTemplate
    ) {
        this.messagingTemplate = messagingTemplate;
    }

    public void guiThongBaoPhieuMoi(
            String usernameChuyenTrach,
            String maPhieuChiDinh,
            Integer maLichKham,
            int soDichVu
    ) {
        Map<String, Object> thongBao = new LinkedHashMap<>();

        thongBao.put("loaiThongBao", "PHIEU_CHI_DINH_MOI");
        thongBao.put("tieuDe", "Có phiếu chỉ định mới");
        thongBao.put(
                "noiDung",
                "Có phiếu chỉ định gồm "
                        + soDichVu
                        + " dịch vụ cần tiếp nhận."
        );

        thongBao.put("maPhieuChiDinh", maPhieuChiDinh);
        thongBao.put("maLichKham", maLichKham);
        thongBao.put("soDichVu", soDichVu);

        messagingTemplate.convertAndSendToUser(
                usernameChuyenTrach,
                "/queue/thong-bao",
                thongBao
        );
    }
}