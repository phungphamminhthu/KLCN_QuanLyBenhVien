package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BenhNhan;
import QuanLyBenhVien.Repository.BenhNhanRepository;
import QuanLyBenhVien.Service.TiepNhanPhanCongService.CaTrucHienTai;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = TiepNhanDashboardServiceCallPatientTest.TestConfig.class)
class TiepNhanDashboardServiceCallPatientTest {

    private static final ZoneId MUI_GIO = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired
    private TiepNhanDashboardService service;

    @Autowired
    private InMemoryHospitalDb db;

    @Autowired
    private SnapshotTransactionManager txManager;

    @Autowired
    private TiepNhanPhanCongService phanCongService;

    @Autowired
    private ThongBaoService thongBaoService;

    @Autowired
    private BenhNhanRepository benhNhanRepository;

    private LocalDate homNay;
    private CaTrucHienTai caTrucKhoa1;

    @BeforeEach
    void setUp() {
        db.reset();
        txManager.resetCounters();
        Mockito.reset(phanCongService, thongBaoService, benhNhanRepository);

        homNay = LocalDate.now(MUI_GIO);
        caTrucKhoa1 = new CaTrucHienTai(
                10,
                20,
                "tiepnhan1",
                "Nhân viên tiếp nhận 1",
                1,
                "Khoa Nội",
                LocalDateTime.now(MUI_GIO).minusHours(1),
                LocalDateTime.now(MUI_GIO).plusHours(4)
        );

        when(phanCongService.kiemTraQuyenVoiLichKham(any(), anyInt()))
                .thenReturn(caTrucKhoa1);

        BenhNhan bn = new BenhNhan();
        bn.setMaBenhNhan(300);
        bn.setHoTen("Nguyễn Văn A");
        when(benhNhanRepository.findById(300)).thenReturn(Optional.of(bn));
    }

    @Test
    void goiLanDau_dongBoCaLichKhamVaSoThuTu_khongAnhHuongLichKhac_guiThongBao1Lan() {
        db.putLich(101, 1, homNay, 501, "ChoGoi", 300, 900, "Nguyễn Văn A", "Phòng 101");
        db.putSoThuTu(501, 1, 1, homNay, "ChoGoi");
        db.putSoThuTu(502, 2, 1, homNay, "ChoGoi");

        boolean result = service.updateTrangThaiHangDoi("101", "DaGoi");

        assertTrue(result);
        assertEquals("DaGoi", db.lichTable.get(101).trangThai);
        assertEquals("DaGoi", db.soThuTuTable.get(501).trangThai);
        assertEquals("ChoGoi", db.soThuTuTable.get(502).trangThai);
        assertEquals(501, db.lichTable.get(101).maSoThuTu);
        assertEquals(1, db.soThuTuTable.get(501).soThuTu);
        assertEquals(1, txManager.commitCount);
        assertEquals(0, txManager.rollbackCount);

        verify(thongBaoService, times(1)).taoThongBaoVaGuiRealtime(
                eq(900),
                any(BenhNhan.class),
                eq("Đã đến lượt khám"),
                contains("Nguyễn Văn A"),
                eq("DEN_LUOT_KHAM")
        );
    }

    @Test
    void goiLanDau_soThuTuTrangThaiNull_vanCapNhatThanhDaGoi() {
        db.putLich(102, 1, homNay, 503, "ChoGoi", 300, 900, "Nguyễn Văn A", "Phòng 101");
        db.putSoThuTu(503, 3, 1, homNay, null);

        boolean result = service.updateTrangThaiHangDoi("102", "DaGoi");

        assertTrue(result);
        assertEquals("DaGoi", db.lichTable.get(102).trangThai);
        assertEquals("DaGoi", db.soThuTuTable.get(503).trangThai);
        assertEquals(1, txManager.commitCount);
        verify(thongBaoService, times(1)).taoThongBaoVaGuiRealtime(any(), any(), any(), any(), any());
    }

    @Test
    void goiLaiKhiDaGoi_khongGuiThongBaoTrung_khongUpdateDuThua() {
        db.putLich(101, 1, homNay, 501, "DaGoi", 300, 900, "Nguyễn Văn A", "Phòng 101");
        db.putSoThuTu(501, 1, 1, homNay, "DaGoi");

        boolean result = service.updateTrangThaiHangDoi("101", "DaGoi");

        assertTrue(result);
        assertEquals("DaGoi", db.lichTable.get(101).trangThai);
        assertEquals("DaGoi", db.soThuTuTable.get(501).trangThai);
        assertEquals(0, db.soThuTuUpdateCount);
        assertEquals(1, txManager.commitCount);
        verify(thongBaoService, never()).taoThongBaoVaGuiRealtime(any(), any(), any(), any(), any());
    }

    @Test
    void goiLaiKhiLichDaGoiNhungSoThuTuBiLech_tuDongBoVaKhongGuiThongBaoMoi() {
        db.putLich(103, 1, homNay, 504, "DaGoi", 300, 900, "Nguyễn Văn A", "Phòng 101");
        db.putSoThuTu(504, 4, 1, homNay, "ChoGoi");

        boolean result = service.updateTrangThaiHangDoi("103", "DaGoi");

        assertTrue(result);
        assertEquals("DaGoi", db.lichTable.get(103).trangThai);
        assertEquals("DaGoi", db.soThuTuTable.get(504).trangThai);
        assertEquals(1, db.soThuTuUpdateCount);
        assertEquals(1, txManager.commitCount);
        verify(thongBaoService, never()).taoThongBaoVaGuiRealtime(any(), any(), any(), any(), any());
    }

    @Test
    void nhanVienKhongCoQuyenHoacKhacKhoa_biChanVaKhongCapNhat() {
        db.putLich(101, 2, homNay, 501, "ChoGoi", 300, 900, "Nguyễn Văn A", "Phòng 201");
        db.putSoThuTu(501, 1, 2, homNay, "ChoGoi");

        when(phanCongService.kiemTraQuyenVoiLichKham(any(), eq(101)))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Lịch khám không thuộc khoa."));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.updateTrangThaiHangDoi("101", "DaGoi")
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals("ChoGoi", db.lichTable.get(101).trangThai);
        assertEquals("ChoGoi", db.soThuTuTable.get(501).trangThai);
        assertEquals(1, txManager.rollbackCount);
        assertEquals(0, txManager.commitCount);
    }

    @Test
    void thieuLienKetMaSoThuTu_nemLoiVaRollbackLichKham() {
        db.putLich(104, 1, homNay, null, "ChoGoi", 300, 900, "Nguyễn Văn A", "Phòng 101");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.updateTrangThaiHangDoi("104", "DaGoi")
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("ChoGoi", db.lichTable.get(104).trangThai);
        assertEquals(1, txManager.rollbackCount);
        assertEquals(0, txManager.commitCount);
        verify(thongBaoService, never()).taoThongBaoVaGuiRealtime(any(), any(), any(), any(), any());
    }

    @Test
    void soThuTuKhacKhoaHoacKhacNgayCapSo_nemLoiVaRollbackLichKham() {
        db.putLich(105, 1, homNay, 505, "ChoGoi", 300, 900, "Nguyễn Văn A", "Phòng 101");
        db.putSoThuTu(505, 5, 2, homNay, "ChoGoi");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.updateTrangThaiHangDoi("105", "DaGoi")
        );

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertEquals("ChoGoi", db.lichTable.get(105).trangThai);
        assertEquals("ChoGoi", db.soThuTuTable.get(505).trangThai);
        assertEquals(1, txManager.rollbackCount);
        assertEquals(0, txManager.commitCount);
        verify(thongBaoService, never()).taoThongBaoVaGuiRealtime(any(), any(), any(), any(), any());
    }

    @Test
    void capNhatSoThuTuThatBaiDoLoiDB_rollbackLichKham() {
        db.putLich(106, 1, homNay, 506, "ChoGoi", 300, 900, "Nguyễn Văn A", "Phòng 101");
        db.putSoThuTu(506, 6, 1, homNay, "ChoGoi");
        db.failOnSoThuTuUpdate = true;

        assertThrows(
                DataAccessException.class,
                () -> service.updateTrangThaiHangDoi("106", "DaGoi")
        );

        assertEquals("ChoGoi", db.lichTable.get(106).trangThai);
        assertEquals("ChoGoi", db.soThuTuTable.get(506).trangThai);
        assertEquals(1, txManager.rollbackCount);
        assertEquals(0, txManager.commitCount);
        verify(thongBaoService, never()).taoThongBaoVaGuiRealtime(any(), any(), any(), any(), any());
    }

    @Test
    void thaoTacSauKhiCapNhatSoThuTuThatBai_rollbackCaHaiBang() {
        db.putLich(107, 1, homNay, 507, "ChoGoi", 300, 900, "Nguyễn Văn A", "Phòng 101");
        db.putSoThuTu(507, 7, 1, homNay, "ChoGoi");

        doThrow(new RuntimeException("Simulated notification DB failure"))
                .when(thongBaoService)
                .taoThongBaoVaGuiRealtime(any(), any(), any(), any(), any());

        assertThrows(
                RuntimeException.class,
                () -> service.updateTrangThaiHangDoi("107", "DaGoi")
        );

        assertEquals("ChoGoi", db.lichTable.get(107).trangThai);
        assertEquals("ChoGoi", db.soThuTuTable.get(507).trangThai);
        assertEquals(1, txManager.rollbackCount);
        assertEquals(0, txManager.commitCount);
    }

    @Configuration
    @EnableTransactionManagement
    static class TestConfig {

        @Bean
        InMemoryHospitalDb inMemoryHospitalDb() {
            return new InMemoryHospitalDb();
        }

        @Bean
        SnapshotTransactionManager transactionManager(InMemoryHospitalDb db) {
            return new SnapshotTransactionManager(db);
        }

        @Bean
        JdbcTemplate jdbcTemplate(InMemoryHospitalDb db) {
            return new InMemoryJdbcTemplate(db);
        }

        @Bean
        TiepNhanPhanCongService phanCongService() {
            return Mockito.mock(TiepNhanPhanCongService.class);
        }

        @Bean
        ThongBaoService thongBaoService() {
            return Mockito.mock(ThongBaoService.class);
        }

        @Bean
        BenhNhanRepository benhNhanRepository() {
            return Mockito.mock(BenhNhanRepository.class);
        }

        @Bean
        TiepNhanDashboardService tiepNhanDashboardService(
                JdbcTemplate jdbcTemplate,
                TiepNhanPhanCongService phanCongService,
                ThongBaoService thongBaoService,
                BenhNhanRepository benhNhanRepository
        ) {
            return new TiepNhanDashboardService(
                    jdbcTemplate,
                    phanCongService,
                    thongBaoService,
                    benhNhanRepository
            );
        }
    }

    static class LichRow {
        int maLichKham;
        int maKhoa;
        LocalDate ngayKham;
        Integer maSoThuTu;
        String trangThai;
        int maBenhNhan;
        int maNguoiDung;
        String hoTen;
        String tenPhong;

        LichRow copy() {
            LichRow c = new LichRow();
            c.maLichKham = maLichKham;
            c.maKhoa = maKhoa;
            c.ngayKham = ngayKham;
            c.maSoThuTu = maSoThuTu;
            c.trangThai = trangThai;
            c.maBenhNhan = maBenhNhan;
            c.maNguoiDung = maNguoiDung;
            c.hoTen = hoTen;
            c.tenPhong = tenPhong;
            return c;
        }
    }

    static class SoThuTuRow {
        int maSoThuTu;
        int soThuTu;
        int maKhoa;
        LocalDate ngayCapSo;
        String trangThai;

        SoThuTuRow copy() {
            SoThuTuRow c = new SoThuTuRow();
            c.maSoThuTu = maSoThuTu;
            c.soThuTu = soThuTu;
            c.maKhoa = maKhoa;
            c.ngayCapSo = ngayCapSo;
            c.trangThai = trangThai;
            return c;
        }
    }

    static class InMemoryHospitalDb {
        Map<Integer, LichRow> lichTable = new HashMap<>();
        Map<Integer, SoThuTuRow> soThuTuTable = new HashMap<>();
        boolean failOnSoThuTuUpdate = false;
        int soThuTuUpdateCount = 0;

        void reset() {
            lichTable.clear();
            soThuTuTable.clear();
            failOnSoThuTuUpdate = false;
            soThuTuUpdateCount = 0;
        }

        void putLich(
                int maLichKham,
                int maKhoa,
                LocalDate ngayKham,
                Integer maSoThuTu,
                String trangThai,
                int maBenhNhan,
                int maNguoiDung,
                String hoTen,
                String tenPhong
        ) {
            LichRow r = new LichRow();
            r.maLichKham = maLichKham;
            r.maKhoa = maKhoa;
            r.ngayKham = ngayKham;
            r.maSoThuTu = maSoThuTu;
            r.trangThai = trangThai;
            r.maBenhNhan = maBenhNhan;
            r.maNguoiDung = maNguoiDung;
            r.hoTen = hoTen;
            r.tenPhong = tenPhong;
            lichTable.put(maLichKham, r);
        }

        void putSoThuTu(
                int maSoThuTu,
                int soThuTu,
                int maKhoa,
                LocalDate ngayCapSo,
                String trangThai
        ) {
            SoThuTuRow r = new SoThuTuRow();
            r.maSoThuTu = maSoThuTu;
            r.soThuTu = soThuTu;
            r.maKhoa = maKhoa;
            r.ngayCapSo = ngayCapSo;
            r.trangThai = trangThai;
            soThuTuTable.put(maSoThuTu, r);
        }
    }

    static class SnapshotTransactionManager extends AbstractPlatformTransactionManager {
        private final InMemoryHospitalDb db;
        int commitCount = 0;
        int rollbackCount = 0;

        SnapshotTransactionManager(InMemoryHospitalDb db) {
            this.db = db;
        }

        void resetCounters() {
            commitCount = 0;
            rollbackCount = 0;
        }

        static class TxObject {
            Map<Integer, LichRow> lichSnapshot = new HashMap<>();
            Map<Integer, SoThuTuRow> soThuTuSnapshot = new HashMap<>();
        }

        @Override
        protected Object doGetTransaction() {
            return new TxObject();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            TxObject tx = (TxObject) transaction;
            db.lichTable.forEach((k, v) -> tx.lichSnapshot.put(k, v.copy()));
            db.soThuTuTable.forEach((k, v) -> tx.soThuTuSnapshot.put(k, v.copy()));
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            commitCount++;
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            TxObject tx = (TxObject) status.getTransaction();
            db.lichTable.clear();
            db.lichTable.putAll(tx.lichSnapshot);
            db.soThuTuTable.clear();
            db.soThuTuTable.putAll(tx.soThuTuSnapshot);
            rollbackCount++;
        }
    }

    static class InMemoryJdbcTemplate extends JdbcTemplate {
        private final InMemoryHospitalDb db;

        InMemoryJdbcTemplate(InMemoryHospitalDb db) {
            this.db = db;
        }

        @Override
        public void afterPropertiesSet() {
            // Không cần DataSource thật trong test in-memory.
        }

        @Override
        public int update(String sql, Object... args) throws DataAccessException {
            String normalized = sql.replaceAll("\\s+", " ").trim();

            if (normalized.startsWith("UPDATE lichdangkykham SET TrangThai = 'DaGoi'")) {
                int maLichKham = (Integer) args[0];
                LocalDate ngayKham = (LocalDate) args[1];
                int maKhoa = (Integer) args[2];

                LichRow row = db.lichTable.get(maLichKham);
                if (row != null
                        && Objects.equals(row.ngayKham, ngayKham)
                        && row.maKhoa == maKhoa
                        && "ChoGoi".equals(row.trangThai)) {
                    row.trangThai = "DaGoi";
                    return 1;
                }
                return 0;
            }

            if (normalized.startsWith("UPDATE sothutu SET TrangThai = 'DaGoi'")) {
                if (db.failOnSoThuTuUpdate) {
                    throw new DataAccessResourceFailureException("Simulated sothutu update error");
                }
                int maSoThuTu = (Integer) args[0];
                int maKhoa = (Integer) args[1];
                LocalDate ngayCapSo = (LocalDate) args[2];

                SoThuTuRow row = db.soThuTuTable.get(maSoThuTu);
                boolean trangThaiHopLe = row != null && (
                        row.trangThai == null
                                || row.trangThai.trim().isEmpty()
                                || "ChoGoi".equals(row.trangThai)
                                || "DangCho".equals(row.trangThai)
                                || "ChoKham".equals(row.trangThai)
                );
                if (trangThaiHopLe
                        && row.maKhoa == maKhoa
                        && Objects.equals(row.ngayCapSo, ngayCapSo)) {
                    row.trangThai = "DaGoi";
                    db.soThuTuUpdateCount++;
                    return 1;
                }
                return 0;
            }

            throw new UnsupportedOperationException("Unexpected UPDATE SQL: " + normalized);
        }

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) throws DataAccessException {
            String normalized = sql.replaceAll("\\s+", " ").trim();
            List<T> results = new ArrayList<>();

            try {
                if (normalized.startsWith("SELECT MaLichKham FROM lichdangkykham")
                        && normalized.contains("TrangThai = 'DaGoi'")) {
                    int maLichKham = (Integer) args[0];
                    LocalDate ngayKham = (LocalDate) args[1];
                    int maKhoa = (Integer) args[2];

                    LichRow row = db.lichTable.get(maLichKham);
                    if (row != null
                            && Objects.equals(row.ngayKham, ngayKham)
                            && row.maKhoa == maKhoa
                            && "DaGoi".equals(row.trangThai)) {
                        ResultSet rs = Mockito.mock(ResultSet.class);
                        when(rs.getInt("MaLichKham")).thenReturn(row.maLichKham);
                        results.add(rowMapper.mapRow(rs, 0));
                    }
                    return results;
                }

                if (normalized.startsWith("SELECT MaSoThuTu FROM lichdangkykham")) {
                    int maLichKham = (Integer) args[0];
                    int maKhoa = (Integer) args[1];
                    LocalDate ngayKham = (LocalDate) args[2];

                    LichRow row = db.lichTable.get(maLichKham);
                    if (row != null
                            && row.maKhoa == maKhoa
                            && Objects.equals(row.ngayKham, ngayKham)) {
                        ResultSet rs = Mockito.mock(ResultSet.class);
                        if (row.maSoThuTu == null) {
                            when(rs.getInt("MaSoThuTu")).thenReturn(0);
                            when(rs.wasNull()).thenReturn(true);
                        } else {
                            when(rs.getInt("MaSoThuTu")).thenReturn(row.maSoThuTu);
                            when(rs.wasNull()).thenReturn(false);
                        }
                        results.add(rowMapper.mapRow(rs, 0));
                    }
                    return results;
                }

                if (normalized.startsWith("SELECT TrangThai FROM sothutu")) {
                    int maSoThuTu = (Integer) args[0];
                    int maKhoa = (Integer) args[1];
                    LocalDate ngayCapSo = (LocalDate) args[2];

                    SoThuTuRow row = db.soThuTuTable.get(maSoThuTu);
                    if (row != null
                            && row.maKhoa == maKhoa
                            && Objects.equals(row.ngayCapSo, ngayCapSo)) {
                        ResultSet rs = Mockito.mock(ResultSet.class);
                        when(rs.getString("TrangThai")).thenReturn(row.trangThai);
                        results.add(rowMapper.mapRow(rs, 0));
                    }
                    return results;
                }
            } catch (SQLException e) {
                throw new RuntimeException(e);
            }

            throw new UnsupportedOperationException("Unexpected SELECT SQL: " + normalized);
        }

        @Override
        public List<Map<String, Object>> queryForList(String sql, Object... args) throws DataAccessException {
            String normalized = sql.replaceAll("\\s+", " ").trim();
            if (normalized.contains("FROM LichDangKyKham lk")) {
                int maLichKham = (Integer) args[0];
                LichRow row = db.lichTable.get(maLichKham);
                if (row == null) {
                    return List.of();
                }
                Map<String, Object> map = new HashMap<>();
                map.put("MaNguoiDung", row.maNguoiDung);
                map.put("MaBenhNhan", row.maBenhNhan);
                map.put("HoTen", row.hoTen);
                map.put("TenPhong", row.tenPhong);
                return List.of(map);
            }
            throw new UnsupportedOperationException("Unexpected queryForList SQL: " + normalized);
        }
    }
}
