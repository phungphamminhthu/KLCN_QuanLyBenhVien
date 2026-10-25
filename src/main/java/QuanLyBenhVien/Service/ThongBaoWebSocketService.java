package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.ThongBao;
import QuanLyBenhVien.Repository.ThongBaoRepository;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class ThongBaoWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ThongBaoRepository thongBaoRepository;


    public ThongBaoWebSocketService(
            SimpMessagingTemplate messagingTemplate,
            ThongBaoRepository thongBaoRepository
    ) {

        this.messagingTemplate = messagingTemplate;
        this.thongBaoRepository = thongBaoRepository;
    }

    public void guiThongBaoKemSoLuong(
            String tenDangNhap,
            Map<String, Object> payload
    ) {
        messagingTemplate.convertAndSendToUser(
                tenDangNhap,
                "/queue/thong-bao",
                payload
        );
    }


    // =====================================================
    // 1. TẠO THÔNG BÁO + LƯU DATABASE
    // =====================================================

    @Transactional
    public ThongBao taoThongBao(
            NguoiDung nguoiDung,
            String tieuDe,
            String noiDung,
            String loaiThongBao,
            String trangThai
    ) {

        ThongBao thongBao = new ThongBao();

        thongBao.setNguoiDung(nguoiDung);

        thongBao.setTieuDe(tieuDe);

        thongBao.setNoiDung(noiDung);

        thongBao.setLoaiThongBao(loaiThongBao);

        thongBao.setDaDoc(false);

        thongBao.setTrangThai(trangThai);

        return thongBaoRepository.save(thongBao);
    }


    // =====================================================
    // 2. GỬI SỐ THÔNG BÁO CHƯA ĐỌC
    // =====================================================

    public void guiSoThongBaoChuaDoc(
            NguoiDung nguoiDung
    ) {

        if (nguoiDung == null) {
            return;
        }

        long count =
                thongBaoRepository
                        .countByNguoiDung_MaNguoiDungAndDaDocFalse(
                                nguoiDung.getMaNguoiDung()
                        );


        messagingTemplate.convertAndSendToUser(
                nguoiDung.getTenDangNhap(),
                "/queue/thong-bao",
                Map.of(
                        "count", count
                )
        );
    }


    // =====================================================
    // 3. GỬI THÔNG BÁO REALTIME
    // =====================================================

    public void guiThongBaoRealtime(
            String tenDangNhap,
            String title,
            String message,
            String type
    ) {

        if (
                tenDangNhap == null
                        || tenDangNhap.isBlank()
        ) {
            return;
        }


        Map<String, Object> data =
                new HashMap<>();

        data.put(
                "title",
                title
        );

        data.put(
                "message",
                message
        );

        data.put(
                "type",
                type
        );


        messagingTemplate.convertAndSendToUser(
                tenDangNhap,
                "/queue/thong-bao",
                data
        );
    }


    // =====================================================
    // 4. LƯU DB + GỬI REALTIME + CẬP NHẬT CHUÔNG
    // =====================================================

    @Transactional
    public void taoVaGuiThongBao(
            NguoiDung nguoiDung,
            String tieuDe,
            String noiDung,
            String loaiThongBao,
            String trangThai
    ) {

        if (nguoiDung == null) {
            return;
        }


        // ---------------------------------------------
        // BƯỚC 1: Lưu thông báo vào database
        // ---------------------------------------------

        taoThongBao(
                nguoiDung,
                tieuDe,
                noiDung,
                loaiThongBao,
                trangThai
        );


        // ---------------------------------------------
        // BƯỚC 2: Đếm số thông báo chưa đọc
        // ---------------------------------------------

        long count =
                thongBaoRepository
                        .countByNguoiDung_MaNguoiDungAndDaDocFalse(
                                nguoiDung.getMaNguoiDung()
                        );


        // ---------------------------------------------
        // BƯỚC 3: Gửi realtime cho chuông
        // ---------------------------------------------

        Map<String, Object> data =
                new HashMap<>();


        data.put(
                "count",
                count
        );

        data.put(
                "title",
                tieuDe
        );

        data.put(
                "message",
                noiDung
        );

        data.put(
                "type",
                loaiThongBao
        );


        messagingTemplate.convertAndSendToUser(
                nguoiDung.getTenDangNhap(),
                "/queue/thong-bao",
                data
        );
    }
}