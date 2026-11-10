
package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.ThongBao;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.ThongBaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Map;

@Service
public class ThongBaoService {

    private final ThongBaoRepository thongBaoRepository;
    private final NguoiDungRepository nguoiDungRepository;
    private final ThongBaoWebSocketService thongBaoWebSocketService;
    private final FcmPushService fcmPushService;
    private static final Logger log =
            LoggerFactory.getLogger(ThongBaoService.class);


    public ThongBaoService(
            ThongBaoRepository thongBaoRepository,
            NguoiDungRepository nguoiDungRepository,
            ThongBaoWebSocketService thongBaoWebSocketService,
            FcmPushService fcmPushService
    ) {
        this.thongBaoRepository = thongBaoRepository;
        this.nguoiDungRepository = nguoiDungRepository;
        this.thongBaoWebSocketService = thongBaoWebSocketService;
        this.fcmPushService = fcmPushService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> layThongBao(
            Integer maNguoiDung, int limit) {

        int soLuong = Math.max(1, Math.min(limit, 100));

        return thongBaoRepository
                .findByNguoiDung_MaNguoiDungOrderByNgayTaoDesc(
                        maNguoiDung,
                        PageRequest.of(0, soLuong))
                .stream()
                .map(t -> {
                    Map<String, Object> item = new java.util.HashMap<>();

                    item.put("id", t.getMaThongBao());
                    item.put("title", t.getTieuDe());
                    item.put("message", t.getNoiDung());
                    item.put("type", t.getLoaiThongBao());

                    item.put("createdAt",
                            t.getNgayTao() == null
                                    ? "" : t.getNgayTao().toString());

                    item.put("unread",
                            !Boolean.TRUE.equals(t.getDaDoc()));

                    item.put("status", t.getTrangThai());

                    // Thông tin hồ sơ bệnh nhân liên quan
                    item.put("maBenhNhan",
                            t.getBenhNhan() != null
                                    ? t.getBenhNhan().getMaBenhNhan()
                                    : null);

                    item.put("tenBenhNhan",
                            t.getBenhNhan() != null
                                    ? t.getBenhNhan().getHoTen()
                                    : null);

                    return item;
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public long demChuaDoc(Integer maNguoiDung) {
        return thongBaoRepository
                .countByNguoiDung_MaNguoiDungAndDaDocFalse(maNguoiDung);
    }

    @Transactional
    public boolean danhDauDaDoc(
            Integer maNguoiDung, Integer maThongBao) {

        return thongBaoRepository
                .findByMaThongBaoAndNguoiDung_MaNguoiDung(
                        maThongBao, maNguoiDung)
                .map(t -> {
                    t.setDaDoc(true);
                    thongBaoRepository.save(t);
                    guiCapNhatSauCommit(t.getNguoiDung());
                    return true;
                })
                .orElse(false);
    }

    @Transactional
    public int danhDauTatCaDaDoc(Integer maNguoiDung) {
        NguoiDung nguoiDung = nguoiDungRepository.findById(maNguoiDung)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy người dùng"));

        int updated = thongBaoRepository.danhDauTatCaDaDoc(maNguoiDung);

        if (updated > 0) {
            guiCapNhatSauCommit(nguoiDung);
        }

        return updated;
    }

    private void guiCapNhatSauCommit(NguoiDung nguoiDung) {
        Runnable gui = () ->
                thongBaoWebSocketService.guiSoThongBaoChuaDoc(nguoiDung);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            gui.run();
                        }
                    }
            );
        } else {
            gui.run();
        }
    }

    @Transactional
    public ThongBao taoThongBao(
            Integer maNguoiDung,
            String tieuDe,
            String noiDung,
            String loaiThongBao) {

        NguoiDung nguoiDung = nguoiDungRepository
                .findById(maNguoiDung)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy người nhận thông báo"));

        ThongBao thongBao = new ThongBao();
        thongBao.setNguoiDung(nguoiDung);
        thongBao.setTieuDe(tieuDe);
        thongBao.setNoiDung(noiDung);
        thongBao.setLoaiThongBao(loaiThongBao);
        thongBao.setDaDoc(false);
        thongBao.setTrangThai("MOI");

        ThongBao saved = thongBaoRepository.save(thongBao);

        guiCapNhatSauCommit(nguoiDung);
        guiFcmSauCommit(saved);

        return saved;
    }

    @Transactional
    public int taoThongBaoTheoVaiTro(
            List<String> tenVaiTro,
            String tieuDe,
            String noiDung,
            String loaiThongBao) {

        List<String> roles = tenVaiTro.stream()
                .map(String::toUpperCase)
                .toList();

        List<NguoiDung> nguoiNhans =
                nguoiDungRepository.timNguoiDungTheoNhieuVaiTro(roles);

        System.out.println("[THONG BAO] Roles: " + roles);
        System.out.println("[THONG BAO] So nguoi nhan: " + nguoiNhans.size());

        for (NguoiDung nguoiNhan : nguoiNhans) {
            System.out.println("[THONG BAO] User ID: "
                    + nguoiNhan.getMaNguoiDung());

            taoThongBao(
                    nguoiNhan.getMaNguoiDung(),
                    tieuDe,
                    noiDung,
                    loaiThongBao);
        }

        return nguoiNhans.size();
    }

    // =================================
    // tạo thông báo realtime
    // =================================
    @Transactional
    public ThongBao taoThongBaoVaGuiRealtime(
            Integer maNguoiDung,
            BenhNhan benhNhan,
            String tieuDe,
            String noiDung,
            String loaiThongBao
    ) {
        NguoiDung nguoiDung = nguoiDungRepository
                .findById(maNguoiDung)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy người nhận thông báo"
                        )
                );

        ThongBao thongBao = new ThongBao();
        thongBao.setNguoiDung(nguoiDung);
        thongBao.setBenhNhan(benhNhan);
        thongBao.setTieuDe(tieuDe);
        thongBao.setNoiDung(noiDung);
        thongBao.setLoaiThongBao(loaiThongBao);
        thongBao.setDaDoc(false);
        thongBao.setTrangThai("MOI");

        ThongBao saved = thongBaoRepository.save(thongBao);

        guiFcmSauCommit(saved);

        Runnable gui = () -> {
            long count = thongBaoRepository
                    .countByNguoiDung_MaNguoiDungAndDaDocFalse(
                            nguoiDung.getMaNguoiDung()
                    );

            Map<String, Object> payload = new java.util.HashMap<>();

            payload.put("id", saved.getMaThongBao());
            payload.put("title", saved.getTieuDe());
            payload.put("message", saved.getNoiDung());
            payload.put("type", saved.getLoaiThongBao());
            payload.put("count", count);

            if (benhNhan != null) {
                payload.put("maBenhNhan", benhNhan.getMaBenhNhan());
                payload.put("tenBenhNhan", benhNhan.getHoTen());
            }

            thongBaoWebSocketService.guiThongBaoKemSoLuong(
                    nguoiDung.getTenDangNhap(),
                    payload
            );
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            gui.run();
                        }
                    }
            );
        } else {
            gui.run();
        }

        return saved;
    }

    // ===============================================
    //  gửi thông báo
    // ===============================================
    private void guiFcmSauCommit(ThongBao thongBao) {

        Integer maNguoiDung = thongBao.getNguoiDung().getMaNguoiDung();
        Integer maThongBao = thongBao.getMaThongBao();
        String tieuDe = thongBao.getTieuDe();
        String noiDung = thongBao.getNoiDung();
        String loaiThongBao = thongBao.getLoaiThongBao();

        Runnable gui = () -> {
            try {
                fcmPushService.guiThongBao(
                        maNguoiDung,
                        maThongBao,
                        tieuDe,
                        noiDung,
                        loaiThongBao
                );
            } catch (Exception e) {
                System.err.println(
                        "Lỗi gửi Push Notification: " + e.getMessage()
                );
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            gui.run();
                        }
                    }
            );
        } else {
            gui.run();
        }
    }


}
