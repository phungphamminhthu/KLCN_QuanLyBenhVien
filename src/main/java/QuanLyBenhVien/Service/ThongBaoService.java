
package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.ThongBao;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.ThongBaoRepository;
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
                .map(t -> Map.<String, Object>of(
                        "id", t.getMaThongBao(),
                        "title", t.getTieuDe() == null
                                ? "Thông báo bệnh viện" : t.getTieuDe(),
                        "message", t.getNoiDung() == null
                                ? "" : t.getNoiDung(),
                        "type", t.getLoaiThongBao() == null
                                ? "general" : t.getLoaiThongBao(),
                        "createdAt", t.getNgayTao() == null
                                ? "" : t.getNgayTao().toString(),
                        "unread", !Boolean.TRUE.equals(t.getDaDoc()),
                        "status", t.getTrangThai() == null
                                ? "" : t.getTrangThai()
                ))
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

        List<NguoiDung> nguoiNhans =
                nguoiDungRepository.timNguoiDungTheoNhieuVaiTro(
                        tenVaiTro.stream()
                                .map(String::toLowerCase)
                                .toList());

        for (NguoiDung nguoiNhan : nguoiNhans) {
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

            Map<String, Object> payload = Map.of(
                    "id", saved.getMaThongBao(),
                    "title", saved.getTieuDe(),
                    "message", saved.getNoiDung() == null
                            ? "" : saved.getNoiDung(),
                    "type", saved.getLoaiThongBao() == null
                            ? "general" : saved.getLoaiThongBao(),
                    "count", count
            );

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
