package QuanLyBenhVien.Service;

import QuanLyBenhVien.Controller.KhoThuocController;
import QuanLyBenhVien.Entity.KhoThuoc;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.ThongBao;
import QuanLyBenhVien.Entity.Thuoc;
import QuanLyBenhVien.Entity.VaiTro;
import QuanLyBenhVien.Repository.KhoThuocRepository;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.ThuocRepository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class KhoThuocLowStockNotificationUnitTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void lowStockMedicine_sendsNotificationOnlyToActiveAdminsWithActualData() {
        TestHarness harness = new TestHarness();
        harness.addUser(1, "duocsi1", "Nguyễn Thị Dược", "DUOCSI", true);
        harness.addUser(10, "admin1", "Quản Trị 1", "ADMIN", true);
        harness.addUser(11, "admin2", "Quản Trị 2", "ADMIN", true);
        harness.addUser(20, "bacsi1", "Bác Sĩ 1", "BACSI", true);
        harness.addUser(30, "benhnhan1", "Bệnh Nhân 1", "BENHNHAN", true);

        Thuoc thuoc = harness.addMedicine(5, "Paracetamol 500mg", "Viên");
        harness.addBatch(thuoc, 3, 5, "LO01");
        harness.addBatch(thuoc, 2, 5, "LO02");

        Map<String, Object> result = harness.khoThuocService
                .thongBaoThuocSapHetDenAdmin(5, "duocsi1");

        assertEquals(true, result.get("success"));
        assertEquals("TH005", result.get("maThuocHienThi"));
        assertEquals(5, result.get("soLuongTon"));
        assertEquals(10, result.get("soLuongToiThieu"));
        assertEquals(2, result.get("soAdminNhan"));

        assertEquals(2, harness.sentNotifications.size());
        assertEquals(List.of(10, 11),
                harness.sentNotifications.stream().map(n -> n.maNguoiDung).toList());

        SentNotification first = harness.sentNotifications.get(0);
        assertEquals("Cảnh báo tồn kho thuốc", first.tieuDe);
        assertEquals(KhoThuocService.LOAI_CANH_BAO_TON_KHO_THUOC, first.loaiThongBao);
        assertTrue(first.noiDung.contains("Paracetamol 500mg"));
        assertTrue(first.noiDung.contains("(TH005)"));
        assertTrue(first.noiDung.contains("5 Viên"));
        assertTrue(first.noiDung.contains("10"));
        assertTrue(first.noiDung.contains("Nguyễn Thị Dược"));
    }

    @Test
    void enoughStockMedicine_isRejectedByBackend() {
        TestHarness harness = new TestHarness();
        harness.addUser(1, "duocsi1", "Nguyễn Thị Dược", "DUOCSI", true);
        harness.addUser(10, "admin1", "Quản Trị 1", "ADMIN", true);

        Thuoc thuoc = harness.addMedicine(1, "Amoxicillin 500mg", "Viên");
        harness.addBatch(thuoc, 50, 10, "LO01");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> harness.khoThuocService.thongBaoThuocSapHetDenAdmin(1, "duocsi1")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(harness.sentNotifications.isEmpty());
    }

    @Test
    void outOfStockMedicine_isRejectedByBackend() {
        TestHarness harness = new TestHarness();
        harness.addUser(1, "duocsi1", "Nguyễn Thị Dược", "DUOCSI", true);
        harness.addUser(10, "admin1", "Quản Trị 1", "ADMIN", true);

        Thuoc thuoc = harness.addMedicine(2, "Vitamin C", "Hộp");
        harness.addBatch(thuoc, 0, 10, "LO01");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> harness.khoThuocService.thongBaoThuocSapHetDenAdmin(2, "duocsi1")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(harness.sentNotifications.isEmpty());
    }

    @Test
    void nonPharmacistUser_isForbiddenByBackend() {
        TestHarness harness = new TestHarness();
        harness.addUser(20, "bacsi1", "Bác Sĩ 1", "BACSI", true);
        harness.addUser(10, "admin1", "Quản Trị 1", "ADMIN", true);

        Thuoc thuoc = harness.addMedicine(3, "Efferalgan", "Viên");
        harness.addBatch(thuoc, 4, 10, "LO01");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> harness.khoThuocService.thongBaoThuocSapHetDenAdmin(3, "bacsi1")
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(harness.sentNotifications.isEmpty());
    }

    @Test
    void missingMedicine_returnsNotFound() {
        TestHarness harness = new TestHarness();
        harness.addUser(1, "duocsi1", "Nguyễn Thị Dược", "DUOCSI", true);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> harness.khoThuocService.thongBaoThuocSapHetDenAdmin(999, "duocsi1")
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertTrue(harness.sentNotifications.isEmpty());
    }

    @Test
    void duplicateUnreadAlertForSameMedicine_returnsConflict() {
        TestHarness harness = new TestHarness();
        harness.addUser(1, "duocsi1", "Nguyễn Thị Dược", "DUOCSI", true);
        harness.addUser(10, "admin1", "Quản Trị 1", "ADMIN", true);

        Thuoc thuoc = harness.addMedicine(7, "Oresol", "Gói");
        harness.addBatch(thuoc, 5, 10, "LO01");

        harness.khoThuocService.thongBaoThuocSapHetDenAdmin(7, "duocsi1");
        assertEquals(1, harness.sentNotifications.size());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> harness.khoThuocService.thongBaoThuocSapHetDenAdmin(7, "duocsi1")
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals(1, harness.sentNotifications.size());
    }

    @Test
    void controllerWithoutAuthentication_returns401() {
        TestHarness harness = new TestHarness();
        KhoThuocController controller = new KhoThuocController(harness.khoThuocService);

        ResponseEntity<Map<String, Object>> response = controller.thongBaoThuocSapHet(1);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(false, response.getBody().get("success"));
    }

    private static class SentNotification {
        final Integer maNguoiDung;
        final String tieuDe;
        final String noiDung;
        final String loaiThongBao;
        boolean daDoc = false;

        SentNotification(Integer maNguoiDung, String tieuDe, String noiDung, String loaiThongBao) {
            this.maNguoiDung = maNguoiDung;
            this.tieuDe = tieuDe;
            this.noiDung = noiDung;
            this.loaiThongBao = loaiThongBao;
        }
    }

    private static class TestHarness {
        final Map<Integer, Thuoc> medicines = new HashMap<>();
        final Map<Integer, List<KhoThuoc>> batchesByMedicine = new HashMap<>();
        final Map<String, NguoiDung> usersByUsername = new HashMap<>();
        final List<NguoiDung> allUsers = new ArrayList<>();
        final List<SentNotification> sentNotifications = new ArrayList<>();
        final KhoThuocService khoThuocService;

        TestHarness() {
            KhoThuocRepository khoThuocRepo = (KhoThuocRepository) Proxy.newProxyInstance(
                    KhoThuocRepository.class.getClassLoader(),
                    new Class<?>[]{KhoThuocRepository.class},
                    (proxy, method, args) -> {
                        if ("findByThuoc_MaThuocOrderByHanSuDungAsc".equals(method.getName())) {
                            return batchesByMedicine.getOrDefault((Integer) args[0], List.of());
                        }
                        throw new UnsupportedOperationException(method.getName());
                    }
            );

            ThuocRepository thuocRepo = (ThuocRepository) Proxy.newProxyInstance(
                    ThuocRepository.class.getClassLoader(),
                    new Class<?>[]{ThuocRepository.class},
                    (proxy, method, args) -> {
                        if ("findById".equals(method.getName())) {
                            return Optional.ofNullable(medicines.get((Integer) args[0]));
                        }
                        throw new UnsupportedOperationException(method.getName());
                    }
            );

            NguoiDungRepository nguoiDungRepo = (NguoiDungRepository) Proxy.newProxyInstance(
                    NguoiDungRepository.class.getClassLoader(),
                    new Class<?>[]{NguoiDungRepository.class},
                    (proxy, method, args) -> {
                        if ("findByTenDangNhap".equals(method.getName())) {
                            return Optional.ofNullable(usersByUsername.get((String) args[0]));
                        }
                        if ("timNguoiDungTheoNhieuVaiTro".equals(method.getName())) {
                            @SuppressWarnings("unchecked")
                            List<String> roles = (List<String>) args[0];
                            return allUsers.stream()
                                    .filter(u -> Boolean.TRUE.equals(u.getTrangThai())
                                            && u.getVaiTro() != null
                                            && roles.stream().anyMatch(r ->
                                            r.equalsIgnoreCase(u.getVaiTro().getTenVaiTro())))
                                    .toList();
                        }
                        throw new UnsupportedOperationException(method.getName());
                    }
            );

            ThongBaoService fakeThongBaoService = new ThongBaoService(null, null, null, null) {
                @Override
                public boolean daCoThongBaoChuaDoc(
                        List<Integer> maNguoiDungList,
                        String loaiThongBao,
                        String tuKhoaNoiDung
                ) {
                    return sentNotifications.stream().anyMatch(n ->
                            !n.daDoc
                                    && maNguoiDungList.contains(n.maNguoiDung)
                                    && loaiThongBao.equals(n.loaiThongBao)
                                    && n.noiDung != null
                                    && n.noiDung.contains(tuKhoaNoiDung)
                    );
                }

                @Override
                public ThongBao taoThongBao(
                        Integer maNguoiDung,
                        String tieuDe,
                        String noiDung,
                        String loaiThongBao
                ) {
                    sentNotifications.add(new SentNotification(
                            maNguoiDung, tieuDe, noiDung, loaiThongBao));
                    ThongBao tb = new ThongBao();
                    tb.setTieuDe(tieuDe);
                    tb.setNoiDung(noiDung);
                    tb.setLoaiThongBao(loaiThongBao);
                    tb.setDaDoc(false);
                    return tb;
                }
            };

            this.khoThuocService = new KhoThuocService(
                    khoThuocRepo,
                    thuocRepo,
                    nguoiDungRepo,
                    fakeThongBaoService,
                    null
            );
        }

        void addUser(int id, String username, String hoTen, String roleName, boolean active) {
            VaiTro vaiTro = new VaiTro();
            vaiTro.setTenVaiTro(roleName);

            NguoiDung user = new NguoiDung();
            user.setMaNguoiDung(id);
            user.setTenDangNhap(username);
            user.setHoTen(hoTen);
            user.setVaiTro(vaiTro);
            user.setTrangThai(active);

            usersByUsername.put(username, user);
            allUsers.add(user);
        }

        Thuoc addMedicine(int maThuoc, String tenThuoc, String donViTinh) {
            Thuoc thuoc = new Thuoc();
            thuoc.setMaThuoc(maThuoc);
            thuoc.setTenThuoc(tenThuoc);
            thuoc.setDonViTinh(donViTinh);
            thuoc.setTrangThai(true);
            medicines.put(maThuoc, thuoc);
            return thuoc;
        }

        void addBatch(Thuoc thuoc, int soLuongTon, int soLuongToiThieu, String soLo) {
            KhoThuoc kho = new KhoThuoc();
            kho.setThuoc(thuoc);
            kho.setSoLuongTon(soLuongTon);
            kho.setSoLuongToiThieu(soLuongToiThieu);
            kho.setSoLo(soLo);
            kho.setHanSuDung(LocalDate.now().plusMonths(6));
            batchesByMedicine
                    .computeIfAbsent(thuoc.getMaThuoc(), k -> new ArrayList<>())
                    .add(kho);
        }
    }
}

