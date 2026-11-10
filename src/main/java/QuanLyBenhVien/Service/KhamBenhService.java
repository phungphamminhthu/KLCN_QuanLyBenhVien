package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.CTDonThuocRequest;
import QuanLyBenhVien.DTO.DonThuocRequest;
import QuanLyBenhVien.DTO.TaoDotChiDinhCLSRequest;
import QuanLyBenhVien.Entity.*;
import QuanLyBenhVien.Repository.*;
import org.hibernate.Hibernate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class KhamBenhService {

    private final LichDangKyKhamRepository lichDangKyKhamRepository;
    private final TiepNhanBenhNhanRepository tiepNhanBenhNhanRepository;
    private final HoSoBenhAnRepository hoSoBenhAnRepository;
    private final PhongChuyenTrachRepository phongChuyenTrachRepository;

    private final DichVuYTeRepository dichVuYTeRepository;
    private final ChiDinhYTeRepository chiDinhYTeRepository;
    private final KetQuaDichVuRepository ketQuaDichVuRepository;
    private final ChiTietKetQuaRepository chiTietKetQuaRepository;
    private final JdbcTemplate jdbcTemplate;


    // Repository đơn thuốc
    private final ThuocRepository thuocRepository;
    private final KhoThuocRepository khoThuocRepository;
    private final DonThuocRepository donThuocRepository;
    private final CTDonThuocRepository ctDonThuocRepository;
    private final BacSiRepository bacSiRepository;

    // Thông báo
    private final LichLamViecRepository lichLamViecRepository;
    private final ThongBaoService thongBaoService;

    private final AnhKetQuaDichVuRepository anhKetQuaDichVuRepository;

    public KhamBenhService(
            LichDangKyKhamRepository lichDangKyKhamRepository,
            TiepNhanBenhNhanRepository tiepNhanBenhNhanRepository,
            HoSoBenhAnRepository hoSoBenhAnRepository,
            DichVuYTeRepository dichVuYTeRepository,
            ChiDinhYTeRepository chiDinhYTeRepository,
            KetQuaDichVuRepository ketQuaDichVuRepository,
            ChiTietKetQuaRepository chiTietKetQuaRepository,
            ThuocRepository thuocRepository,
            KhoThuocRepository khoThuocRepository,
            DonThuocRepository donThuocRepository,
            CTDonThuocRepository ctDonThuocRepository,
            BacSiRepository bacSiRepository,
            LichLamViecRepository lichLamViecRepository,
            ThongBaoService thongBaoService,
            JdbcTemplate jdbcTemplate,
            PhongChuyenTrachRepository phongChuyenTrachRepository,
            AnhKetQuaDichVuRepository anhKetQuaDichVuRepository
    ) {
        this.lichDangKyKhamRepository = lichDangKyKhamRepository;
        this.tiepNhanBenhNhanRepository = tiepNhanBenhNhanRepository;
        this.hoSoBenhAnRepository = hoSoBenhAnRepository;

        this.dichVuYTeRepository = dichVuYTeRepository;
        this.chiDinhYTeRepository = chiDinhYTeRepository;
        this.ketQuaDichVuRepository = ketQuaDichVuRepository;
        this.chiTietKetQuaRepository = chiTietKetQuaRepository;

        this.thuocRepository = thuocRepository;
        this.khoThuocRepository = khoThuocRepository;
        this.donThuocRepository = donThuocRepository;
        this.ctDonThuocRepository = ctDonThuocRepository;
        this.bacSiRepository = bacSiRepository;

        this.lichLamViecRepository = lichLamViecRepository;
        this.thongBaoService = thongBaoService;

        this.jdbcTemplate = jdbcTemplate;
        this.phongChuyenTrachRepository = phongChuyenTrachRepository;
        this.anhKetQuaDichVuRepository = anhKetQuaDichVuRepository;
    }


    // ====================================================
    // xac dinh ma phong
    //  ===================================================
    private Integer xacDinhMaPhong(DichVuYTe dichVu) {

        if (dichVu == null) {
            throw new IllegalArgumentException(
                    "Dịch vụ y tế không hợp lệ."
            );
        }

        String tenDichVu = dichVu.getTenDichVu() == null
                ? ""
                : dichVu.getTenDichVu().trim().toLowerCase();

        String loaiDichVu = dichVu.getLoaiDichVu() == null
                ? ""
                : dichVu.getLoaiDichVu().trim().toLowerCase();

        PhongChuyenTrach phong;

        // X-quang
        if (tenDichVu.contains("x-quang")) {

            phong = phongChuyenTrachRepository
                    .findFirstByLoaiPhongAndTenPhongContainingIgnoreCaseAndTrangThaiTrueOrderByMaPhongAsc(
                            "CHAN_DOAN_HINH_ANH",
                            "X-quang"
                    )
                    .orElseThrow(() -> new IllegalStateException(
                            "Chưa cấu hình phòng X-quang đang hoạt động."
                    ));

            return phong.getMaPhong();
        }

        // Siêu âm
        if (tenDichVu.contains("siêu âm")
                || loaiDichVu.equals("siêu âm")) {

            phong = phongChuyenTrachRepository
                    .findFirstByLoaiPhongAndTenPhongContainingIgnoreCaseAndTrangThaiTrueOrderByMaPhongAsc(
                            "CHAN_DOAN_HINH_ANH",
                            "Siêu Âm"
                    )
                    .orElseThrow(() -> new IllegalStateException(
                            "Chưa cấu hình phòng Siêu âm đang hoạt động."
                    ));

            return phong.getMaPhong();
        }

        // Xét nghiệm
        if (loaiDichVu.equals("xét nghiệm")) {

            phong = phongChuyenTrachRepository
                    .findFirstByLoaiPhongAndTrangThaiTrueOrderByMaPhongAsc(
                            "XET_NGHIEM"
                    )
                    .orElseThrow(() -> new IllegalStateException(
                            "Chưa cấu hình phòng Xét nghiệm đang hoạt động."
                    ));

            return phong.getMaPhong();
        }

        // Thăm dò chức năng
        if (loaiDichVu.equals("thăm dò chức năng")) {

            phong = phongChuyenTrachRepository
                    .findFirstByLoaiPhongAndTrangThaiTrueOrderByMaPhongAsc(
                            "THAM_DO_CHUC_NANG"
                    )
                    .orElseThrow(() -> new IllegalStateException(
                            "Chưa cấu hình phòng Thăm dò chức năng đang hoạt động."
                    ));

            return phong.getMaPhong();
        }

        // Nội soi
        if (loaiDichVu.equals("nội soi")) {

            phong = phongChuyenTrachRepository
                    .findFirstByLoaiPhongAndTrangThaiTrueOrderByMaPhongAsc(
                            "NOI_SOI"
                    )
                    .orElseThrow(() -> new IllegalStateException(
                            "Chưa cấu hình phòng Nội soi đang hoạt động."
                    ));

            return phong.getMaPhong();
        }

        throw new IllegalStateException(
                "Chưa có quy tắc phân phòng cho dịch vụ: "
                        + dichVu.getTenDichVu()
        );
    }

    // =========================================================
    // 1. BẮT ĐẦU KHÁM
    // =========================================================

    @Transactional
    public HoSoBenhAn batDauKham(
            Integer maBacSi,
            Integer maLichKham
    ) {
        // 1. Kiểm tra lịch khám thuộc bác sĩ
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        // 2. Kiểm tra bệnh nhân đã được tiếp nhận
        boolean daTiepNhan = tiepNhanBenhNhanRepository
                .existsByLichDangKyKham_MaLichKhamAndTrangThai(
                        maLichKham,
                        "DaTiepNhan"
                );

        // 3. Tìm hồ sơ bệnh án đã được tạo trước đó
        Optional<HoSoBenhAn> hoSoDaCo =
                hoSoBenhAnRepository
                        .findByLichDangKyKham_MaLichKham(maLichKham);

        // 4. Nếu đang khám thì cho phép tiếp tục
        if ("DangKham".equals(lichKham.getTrangThai())) {

            HoSoBenhAn hoSo = hoSoDaCo.orElseThrow(
                    () -> new IllegalStateException(
                            "Không tìm thấy hồ sơ đang khám."
                    )
            );

            if (!"DangKham".equals(hoSo.getTrangThai())) {
                throw new IllegalStateException(
                        "Trạng thái hồ sơ không hợp lệ."
                );
            }

            // Đồng bộ trạng thái tiếp nhận với lịch khám
            int soDong = tiepNhanBenhNhanRepository
                    .capNhatTrangThaiTheoLich(
                            maLichKham,
                            "DangKham"
                    );

            if (soDong == 0) {
                throw new IllegalStateException(
                        "Không tìm thấy thông tin tiếp nhận."
                );
            }

            return hoSo;
        }

        // 5. Không cho bắt đầu lại lịch đã hoàn tất
        if ("DaKham".equals(lichKham.getTrangThai())
                || "HoanTat".equals(lichKham.getTrangThai())) {
            throw new IllegalStateException(
                    "Lịch khám này đã hoàn tất."
            );
        }

        // 6. Chỉ cho bắt đầu khi lịch đã tiếp nhận
        if (!daTiepNhan
                || !("DaTiepNhan".equals(lichKham.getTrangThai())
                || "ChoKham".equals(lichKham.getTrangThai()))) {
            throw new IllegalStateException(
                    "Bệnh nhân chưa được tiếp nhận hoặc không còn chờ khám."
            );
        }

        // 7. Sử dụng hồ sơ đã có hoặc tạo mới
        HoSoBenhAn hoSo;

        if (hoSoDaCo.isPresent()) {
            hoSo = hoSoDaCo.get();

            if (!"ChoKham".equals(hoSo.getTrangThai())) {
                throw new IllegalStateException(
                        "Hồ sơ bệnh án không ở trạng thái Chờ khám."
                );
            }
        } else {
            hoSo = new HoSoBenhAn();
            hoSo.setLichDangKyKham(lichKham);
        }

        // 8. Chuyển trạng thái sang Đang khám
        hoSo.setTrangThai("DangKham");
        lichKham.setTrangThai("DangKham");

        // 9. Cập nhật trạng thái tiếp nhận
        int soDong = tiepNhanBenhNhanRepository
                .capNhatTrangThaiTheoLich(
                        maLichKham,
                        "DangKham"
                );

        if (soDong == 0) {
            throw new IllegalStateException(
                    "Không tìm thấy thông tin tiếp nhận."
            );
        }

        // 10. Lưu dữ liệu trong cùng transaction
        lichDangKyKhamRepository.save(lichKham);
        HoSoBenhAn hoSoDaLuu = hoSoBenhAnRepository.save(hoSo);

        // 11. Gửi thông báo khi bệnh nhân được chuyển sang Đang khám
        guiThongBaoBacSiGoiKham(lichKham);

        return hoSoDaLuu;
    }

    // =========================================================
    // 2. CẬP NHẬT HỒ SƠ BỆNH ÁN
    // =========================================================

    @Transactional
    public HoSoBenhAn capNhatHoSo(
            Integer maBacSi,
            Integer maLichKham,
            String trieuChung,
            String chanDoan,
            String ketLuan,
            String huongDieuTri,
            LocalDate ngayTaiKham,
            String ghiChuTaiKham
    ) {
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        if (!"DangKham".equals(lichKham.getTrangThai())
                && !"ChoCLS".equals(lichKham.getTrangThai())) {
            throw new IllegalStateException(
                    "Chỉ được cập nhật hồ sơ khi đang khám hoặc chờ CLS."
            );
        }

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        if (!"DangKham".equals(hoSo.getTrangThai())
                && !"ChoCLS".equals(hoSo.getTrangThai())) {
            throw new IllegalStateException(
                    "Hồ sơ không ở trạng thái cho phép cập nhật."
            );
        }

        hoSo.setTrieuChung(trieuChung);
        hoSo.setChanDoan(chanDoan);
        hoSo.setKetLuan(ketLuan);
        hoSo.setHuongDieuTri(huongDieuTri);
        hoSo.setNgayTaiKham(ngayTaiKham);
        hoSo.setGhiChuTaiKham(ghiChuTaiKham);

        return hoSoBenhAnRepository.save(hoSo);
    }

    // =========================================================
    // 3. HOÀN TẤT KHÁM
    // =========================================================

    @Transactional
    public HoSoBenhAn hoanTatKham(
            Integer maBacSi,
            Integer maLichKham
    ) {
        // 1. Lấy lịch khám thuộc bác sĩ
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        // 2. Lấy hồ sơ bệnh án
        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        // 3. Kiểm tra trạng thái lịch khám
        String trangThaiLich = lichKham.getTrangThai();

        if (!"DangKham".equals(trangThaiLich)
                && !"ChoCLS".equals(trangThaiLich)) {
            throw new IllegalStateException(
                    "Lịch khám không ở trạng thái được phép hoàn tất."
            );
        }

        // 4. Kiểm tra trạng thái hồ sơ
        String trangThaiHoSo = hoSo.getTrangThai();

        if (!"DangKham".equals(trangThaiHoSo)
                && !"ChoCLS".equals(trangThaiHoSo)) {
            throw new IllegalStateException(
                    "Hồ sơ bệnh án không ở trạng thái được phép hoàn tất."
            );
        }

        // 5. Chỉ cho hoàn tất khi tất cả CLS đã hoàn thành
        kiemTraCanLamSangDaHoanThanh(hoSo);

        // 6. Cập nhật HoSoBenhAn
        hoSo.setTrangThai("HoanTat");

        // 7. Cập nhật LichDangKyKham
        lichKham.setTrangThai("HoanTat");

        // 8. Cập nhật TiepNhanBenhNhan
        int soDong = tiepNhanBenhNhanRepository
                .capNhatTrangThaiTheoLich(
                        maLichKham,
                        "HoanTat"
                );

        if (soDong == 0) {
            throw new IllegalStateException(
                    "Không tìm thấy thông tin tiếp nhận bệnh nhân."
            );
        }

        // 9. Lưu đồng thời trong transaction
        lichDangKyKhamRepository.save(lichKham);

        return hoSoBenhAnRepository.save(hoSo);
    }

    // =========================================================
    // 4. XEM HỒ SƠ BỆNH ÁN
    // =========================================================

    @Transactional(readOnly = true)
    public HoSoBenhAn xemHoSo(
            Integer maBacSi,
            Integer maLichKham
    ) {
        timLichKhamCuaBacSi(
                maBacSi,
                maLichKham
        );

        return timHoSoTheoLichKham(maLichKham);
    }

    // =========================================================
    // 5. LẤY DANH SÁCH DỊCH VỤ Y TẾ
    // =========================================================

    @Transactional(readOnly = true)
    public List<DichVuYTe> layDanhSachDichVu() {
        return dichVuYTeRepository
                .findAllByOrderByTenDichVuAsc();
    }

    // =======================================================
    // tao dot chi dinh cls
    // =======================================================
    @Transactional
    public List<ChiDinhYTe> taoDotChiDinhCLS(
            Integer maBacSi,
            TaoDotChiDinhCLSRequest request
    ) {
        // 1. Validate request
        if (request == null
                || request.getMaLichKham() == null
                || request.getMaPhong() == null
                || request.getMaDichVuList() == null
                || request.getMaDichVuList().isEmpty()) {
            throw new IllegalArgumentException(
                    "Thông tin đợt chỉ định CLS không hợp lệ."
            );
        }

        Integer maLichKham = request.getMaLichKham();
        //Integer maPhong = request.getMaPhong();
        List<Integer> maDichVuList = request.getMaDichVuList();

        if (maDichVuList.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException(
                    "Danh sách dịch vụ có mã dịch vụ không hợp lệ."
            );
        }

        // Không cho gửi trùng cùng một dịch vụ trong một đợt
        Set<Integer> maDichVuSet = new LinkedHashSet<>(maDichVuList);
        if (maDichVuSet.size() != maDichVuList.size()) {
            throw new IllegalArgumentException(
                    "Danh sách dịch vụ có dịch vụ bị trùng."
            );
        }

        // 2. Kiểm tra lịch khám thuộc bác sĩ
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        String trangThaiLich = lichKham.getTrangThai();

        if (!"DangKham".equals(trangThaiLich)
                && !"ChoCLS".equals(trangThaiLich)
                && !"ChoThanhToan".equals(trangThaiLich)) {
            throw new IllegalStateException(
                    "Chỉ có thể tạo chỉ định khi đang khám, chờ CLS hoặc chờ thanh toán."
            );
        }

        // 3. Lấy hồ sơ bệnh án
        HoSoBenhAn hoSo = timHoSoTheoLichKham(maLichKham);

        String trangThaiHoSo = hoSo.getTrangThai();

        if (!"DangKham".equals(trangThaiHoSo)
                && !"ChoCLS".equals(trangThaiHoSo)) {
            throw new IllegalStateException(
                    "Hồ sơ không ở trạng thái đang khám hoặc chờ CLS."
            );
        }

        // 4. Kiểm tra bệnh nhân
        if (lichKham.getBenhNhan() == null
                || lichKham.getBenhNhan().getMaBenhNhan() == null) {
            throw new IllegalStateException(
                    "Không xác định được bệnh nhân của lịch khám."
            );
        }

        Integer maBenhNhan =
                lichKham.getBenhNhan().getMaBenhNhan();

        // 5. Lấy và kiểm tra toàn bộ dịch vụ trước khi tạo hóa đơn
        List<DichVuYTe> danhSachDichVu = new ArrayList<>();
        BigDecimal tongTien = BigDecimal.ZERO;

        for (Integer maDichVu : maDichVuList) {
            DichVuYTe dichVu = dichVuYTeRepository.findById(maDichVu)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Không tìm thấy dịch vụ y tế: " + maDichVu
                            )
                    );

            BigDecimal donGia = dichVu.getGia();

            if (donGia == null || donGia.compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalStateException(
                        "Dịch vụ CLS chưa được cấu hình đơn giá hợp lệ: "
                                + dichVu.getTenDichVu()
                );
            }

            danhSachDichVu.add(dichVu);
            tongTien = tongTien.add(donGia);
        }

        // 6. Tạo MỘT hóa đơn mới cho đợt chỉ định này
        jdbcTemplate.update(
                """
                INSERT INTO HoaDon
                    (MaBenhNhan, MaLichKham, NgayLapHoaDon,
                     TongTien, TrangThai, LoaiHoaDon)
                VALUES (?, ?, NOW(), ?, 'ChuaThanhToan', 'CanLamSang')
                """,
                maBenhNhan,
                maLichKham,
                tongTien
        );

        Integer maHoaDonCLS = jdbcTemplate.queryForObject(
                "SELECT LAST_INSERT_ID()",
                Integer.class
        );

        if (maHoaDonCLS == null) {
            throw new IllegalStateException(
                    "Không tạo được hóa đơn CLS."
            );
        }

        // 7. Tạo từng chỉ định và thêm chi tiết vào cùng hóa đơn
        List<ChiDinhYTe> danhSachChiDinh = new ArrayList<>();

        for (DichVuYTe dichVu : danhSachDichVu) {
            BigDecimal donGia = dichVu.getGia();

            ChiDinhYTe chiDinh = new ChiDinhYTe();
            chiDinh.setHoSoBenhAn(hoSo);
            chiDinh.setDichVuYTe(dichVu);

            // Tự động xác định phòng theo từng dịch vụ.
            Integer maPhongTuDong = xacDinhMaPhong(dichVu);
            chiDinh.setMaPhong(maPhongTuDong);

            chiDinh.setNgayChiDinh(LocalDateTime.now());
            chiDinh.setLoaiChiDinh(dichVu.getLoaiDichVu());
            chiDinh.setTrangThai("ChoThanhToan");

            ChiDinhYTe chiDinhDaLuu =
                    chiDinhYTeRepository.saveAndFlush(chiDinh);

            jdbcTemplate.update(
                    """
                    INSERT INTO CTHoaDon
                        (MaHoaDon, MaChiDinh, MaCTDonThuoc,
                         NoiDung, SoLuong, DonGia, ThanhTien)
                    VALUES (?, ?, NULL, ?, 1, ?, ?)
                    """,
                    maHoaDonCLS,
                    chiDinhDaLuu.getMaChiDinh(),
                    "Phí CLS - " + dichVu.getTenDichVu(),
                    donGia,
                    donGia
            );

            danhSachChiDinh.add(chiDinhDaLuu);
        }

        // 8. Cập nhật trạng thái hồ sơ bệnh án.
        // Hồ sơ đang chờ CLS, nhưng trạng thái lịch khám
        // không dùng để quyết định hóa đơn CLS nào được thanh toán.
        hoSo.setTrangThai("ChoCLS");
        hoSoBenhAnRepository.save(hoSo);

        // Không cập nhật LichDangKyKham và TiepNhanBenhNhan
        // sang ChoThanhToan ở đây.
        // Mỗi hóa đơn CLS được quản lý độc lập.
        String tenBenhNhan = "Bệnh nhân";

        if (lichKham.getBenhNhan() != null
                && lichKham.getBenhNhan().getHoTen() != null
                && !lichKham.getBenhNhan().getHoTen().isBlank()) {

            tenBenhNhan = lichKham.getBenhNhan().getHoTen();
        }

        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("TIEPNHAN"),
                "Có đợt chỉ định CLS cần thanh toán",
                "Bệnh nhân " + tenBenhNhan
                        + " vừa được bác sĩ chỉ định "
                        + danhSachDichVu.size()
                        + " dịch vụ cận lâm sàng. "
                        + "Vui lòng kiểm tra và thu phí CLS.",
                "CHI_DINH_CLS_CHO_THANH_TOAN"
        );

        return danhSachChiDinh;
    }


    // =========================================================
    // 6. TẠO CHỈ ĐỊNH CẬN LÂM SÀNG
    // =========================================================
    @Transactional
    public ChiDinhYTe taoChiDinh(
            Integer maBacSi,
            Integer maLichKham,
            Integer maDichVu,
            Integer maPhong
    ) {
        // 1. Kiểm tra lịch khám thuộc bác sĩ
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        String trangThaiLich = lichKham.getTrangThai();

        if (!"DangKham".equals(trangThaiLich)
                && !"ChoCLS".equals(trangThaiLich)
                && !"ChoThanhToan".equals(trangThaiLich)) {
            throw new IllegalStateException(
                    "Chỉ có thể tạo chỉ định khi đang khám, chờ CLS hoặc chờ thanh toán."
            );
        }

        // 2. Lấy hồ sơ bệnh án
        HoSoBenhAn hoSo = timHoSoTheoLichKham(maLichKham);

        String trangThaiHoSo = hoSo.getTrangThai();

        if (!"DangKham".equals(trangThaiHoSo)
                && !"ChoCLS".equals(trangThaiHoSo)) {
            throw new IllegalStateException(
                    "Hồ sơ không ở trạng thái đang khám hoặc chờ CLS."
            );
        }

        // 3. Lấy dịch vụ CLS
        DichVuYTe dichVu = dichVuYTeRepository.findById(maDichVu)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy dịch vụ y tế.")
                );

        BigDecimal donGia = dichVu.getGia();

        if (donGia == null) {
            throw new IllegalStateException(
                    "Dịch vụ CLS chưa được cấu hình đơn giá."
            );
        }

        // 4. Tạo chỉ định
        ChiDinhYTe chiDinh = new ChiDinhYTe();
        chiDinh.setHoSoBenhAn(hoSo);
        chiDinh.setDichVuYTe(dichVu);

        // Không sử dụng maPhong từ frontend nữa.
        Integer maPhongTuDong = xacDinhMaPhong(dichVu);
        chiDinh.setMaPhong(maPhongTuDong);

        chiDinh.setNgayChiDinh(LocalDateTime.now());
        chiDinh.setLoaiChiDinh(dichVu.getLoaiDichVu());
        chiDinh.setTrangThai("ChoThanhToan");

        ChiDinhYTe chiDinhDaLuu =
                chiDinhYTeRepository.saveAndFlush(chiDinh);

        // 5. Kiểm tra bệnh nhân của lịch khám
        if (lichKham.getBenhNhan() == null
                || lichKham.getBenhNhan().getMaBenhNhan() == null) {
            throw new IllegalStateException(
                    "Không xác định được bệnh nhân của lịch khám."
            );
        }

        Integer maBenhNhan =
                lichKham.getBenhNhan().getMaBenhNhan();

        // 6. Tạo hóa đơn CLS MỚI cho chỉ định hiện tại
        jdbcTemplate.update(
                """
                INSERT INTO HoaDon
                    (MaBenhNhan, MaLichKham, NgayLapHoaDon,
                     TongTien, TrangThai, LoaiHoaDon)
                VALUES (?, ?, NOW(), ?, 'ChuaThanhToan', 'CanLamSang')
                """,
                maBenhNhan,
                maLichKham,
                donGia
        );

        Integer maHoaDonCLS = jdbcTemplate.queryForObject(
                "SELECT LAST_INSERT_ID()",
                Integer.class
        );

        if (maHoaDonCLS == null) {
            throw new IllegalStateException(
                    "Không tạo được hóa đơn CLS mới."
            );
        }

        // 7. Thêm chi tiết chỉ định vào hóa đơn mới
        jdbcTemplate.update(
                """
                INSERT INTO CTHoaDon
                    (MaHoaDon, MaChiDinh, MaCTDonThuoc,
                     NoiDung, SoLuong, DonGia, ThanhTien)
                VALUES (?, ?, NULL, ?, 1, ?, ?)
                """,
                maHoaDonCLS,
                chiDinhDaLuu.getMaChiDinh(),
                "Phí CLS - " + dichVu.getTenDichVu(),
                donGia,
                donGia
        );

        // 8. Tính lại tổng tiền của hóa đơn CLS בלבד
        BigDecimal tongTienCLS = jdbcTemplate.queryForObject(
                """
                SELECT COALESCE(SUM(ThanhTien), 0)
                FROM CTHoaDon
                WHERE MaHoaDon = ?
                """,
                BigDecimal.class,
                maHoaDonCLS
        );

        if (tongTienCLS == null) {
            tongTienCLS = BigDecimal.ZERO;
        }

        // Chỉ cập nhật hóa đơn CLS, không đụng đến hóa đơn khám
        jdbcTemplate.update(
                """
                UPDATE HoaDon
                SET TongTien = ?,
                    TrangThai = 'ChuaThanhToan'
                WHERE MaHoaDon = ?
                  AND LoaiHoaDon = 'CanLamSang'
                """,
                tongTienCLS,
                maHoaDonCLS
        );

        // 9. Cập nhật trạng thái hồ sơ bệnh án.
        hoSo.setTrangThai("ChoCLS");
        hoSoBenhAnRepository.save(hoSo);

        // Không cập nhật trạng thái chung của lịch khám
        // và thông tin tiếp nhận theo từng hóa đơn CLS.

        // 11. Gửi thông báo
        guiThongBaoChiDinhCLS(lichKham, dichVu);

        String tenBenhNhan = "Bệnh nhân";

        if (lichKham.getBenhNhan() != null
                && lichKham.getBenhNhan().getHoTen() != null
                && !lichKham.getBenhNhan().getHoTen().isBlank()) {

            tenBenhNhan = lichKham.getBenhNhan().getHoTen();
        }
        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("TIEPNHAN"),
                "Có chỉ định CLS cần thanh toán",
                "Bệnh nhân " + tenBenhNhan
                        + " vừa được bác sĩ chỉ định cận lâm sàng. "
                        + "Vui lòng kiểm tra và thu phí CLS.",
                "CHI_DINH_CLS_CHO_THANH_TOAN"
        );

        return chiDinhDaLuu;
    }

    // ===================================================
    // GỬI THÔNG BÁO CHO CHỈ ĐỊNH CLS
    // ===================================================

    private void guiThongBaoChiDinhCLS(
            LichDangKyKham lichKham,
            DichVuYTe dichVu
    ) {
        if (lichKham.getBenhNhan() == null
                || lichKham.getBenhNhan().getNguoiDung() == null) {
            return;
        }

        Integer maNguoiDung = lichKham.getBenhNhan()
                .getNguoiDung()
                .getMaNguoiDung();

        if (maNguoiDung == null) {
            return;
        }

        String tenDichVu = dichVu.getTenDichVu();

        if (tenDichVu == null || tenDichVu.isBlank()) {
            tenDichVu = "dịch vụ cận lâm sàng";
        }

        thongBaoService.taoThongBaoVaGuiRealtime(
                maNguoiDung,
                lichKham.getBenhNhan(),
                "Có chỉ định cận lâm sàng",
                "Bác sĩ đã chỉ định bệnh nhân "
                        + lichKham.getBenhNhan().getHoTen()
                        + " thực hiện: "
                        + tenDichVu
                        + ". Vui lòng kiểm tra thông tin.",
                "CHI_DINH_CLS"
        );
    }

    // =========================================================
    // 7. LẤY CÁC CHỈ ĐỊNH CỦA CA KHÁM
    // =========================================================

    @Transactional(readOnly = true)
    public List<ChiDinhYTe> layDanhSachChiDinh(
            Integer maBacSi,
            Integer maLichKham
    ) {
        timLichKhamCuaBacSi(
                maBacSi,
                maLichKham
        );

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        return chiDinhYTeRepository
                .findByHoSoBenhAn_MaHoSoBenhAnOrderByNgayChiDinhDesc(
                        hoSo.getMaHoSoBenhAn()
                );
    }

    // =========================================================
    // 8. LẤY TẤT CẢ CHỈ ĐỊNH CỦA BÁC SĨ
    // =========================================================

    //        @Transactional(readOnly = true)
    //        public List<ChiDinhYTe> layTatCaChiDinhCuaBacSi(
    //                Integer maBacSi
    //        ) {
    //            if (maBacSi == null) {
    //                throw new IllegalArgumentException(
    //                        "Mã bác sĩ không được để trống."
    //                );
    //            }
    //
    //            return chiDinhYTeRepository
    //                    .findByHoSoBenhAn_LichDangKyKham_BacSi_MaBacSiOrderByNgayChiDinhDesc(
    //                            maBacSi
    //                    );
    //        }

    @Transactional(readOnly = true)
    public List<ChiDinhYTe> layTatCaChiDinhCuaBacSi(
            Integer maBacSi
    ) {
        if (maBacSi == null) {
            throw new IllegalArgumentException(
                    "Mã bác sĩ không được để trống."
            );
        }

        // Lấy danh sách chỉ định của bác sĩ.
        List<ChiDinhYTe> danhSach =
                chiDinhYTeRepository
                        .findByHoSoBenhAn_LichDangKyKham_BacSi_MaBacSiOrderByNgayChiDinhDesc(
                                maBacSi
                        );

        // Khởi tạo các quan hệ LAZY trước khi trả dữ liệu về Controller.
        for (ChiDinhYTe chiDinh : danhSach) {

            // Thông tin dịch vụ y tế.
            if (chiDinh.getDichVuYTe() != null) {
                Hibernate.initialize(chiDinh.getDichVuYTe());
            }

            // Hồ sơ bệnh án.
            HoSoBenhAn hoSo = chiDinh.getHoSoBenhAn();

            if (hoSo != null) {
                Hibernate.initialize(hoSo);

                // Lịch khám.
                LichDangKyKham lichKham =
                        hoSo.getLichDangKyKham();

                if (lichKham != null) {
                    Hibernate.initialize(lichKham);

                    // Thông tin bệnh nhân.
                    if (lichKham.getBenhNhan() != null) {
                        Hibernate.initialize(
                                lichKham.getBenhNhan()
                        );
                    }
                }
            }
        }

        return danhSach;
    }


    // =========================================================
    // TÌM KẾT QUẢ THEO CHỈ ĐỊNH
    // =========================================================

    @Transactional(readOnly = true)
    public Optional<KetQuaDichVu> timKetQuaTheoChiDinh(
            Integer maChiDinh
    ) {
        if (maChiDinh == null) {
            throw new IllegalArgumentException(
                    "Mã chỉ định không được để trống."
            );
        }

        return ketQuaDichVuRepository
                .findByChiDinhYTe_MaChiDinh(maChiDinh);
    }

    // =========================================================
    // 9. XEM MỘT CHỈ ĐỊNH
    // =========================================================

    @Transactional(readOnly = true)
    public ChiDinhYTe xemChiDinh(
            Integer maBacSi,
            Integer maLichKham,
            Integer maChiDinh
    ) {
        timLichKhamCuaBacSi(
                maBacSi,
                maLichKham
        );

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        return chiDinhYTeRepository
                .findByMaChiDinhAndHoSoBenhAn_MaHoSoBenhAn(
                        maChiDinh,
                        hoSo.getMaHoSoBenhAn()
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy chỉ định."
                        )
                );
    }

    // =========================================================
    // 10. LẤY TẤT CẢ KẾT QUẢ CLS CỦA BÁC SĨ
    // =========================================================

    @Transactional(readOnly = true)
    public List<KetQuaDichVu> layTatCaKetQuaCuaBacSi(
            Integer maBacSi
    ) {
        if (maBacSi == null) {
            throw new IllegalArgumentException(
                    "Mã bác sĩ không được để trống."
            );
        }

        return ketQuaDichVuRepository
                .findByChiDinhYTe_HoSoBenhAn_LichDangKyKham_BacSi_MaBacSiOrderByNgayCoKetQuaDesc(
                        maBacSi
                );
    }

    // =========================================================
    // 11. XEM KẾT QUẢ CẬN LÂM SÀNG
    // =========================================================

    @Transactional(readOnly = true)
    public Optional<KetQuaDichVu> xemKetQuaChiDinh(
            Integer maBacSi,
            Integer maLichKham,
            Integer maChiDinh
    ) {
        xemChiDinh(
                maBacSi,
                maLichKham,
                maChiDinh
        );

        return ketQuaDichVuRepository
                .findByChiDinhYTe_MaChiDinh(maChiDinh);
    }

    // =========================================================
    // 12. XEM CHI TIẾT KẾT QUẢ
    // =========================================================

    @Transactional(readOnly = true)
    public List<ChiTietKetQua> xemChiTietKetQua(
            Integer maBacSi,
            Integer maLichKham,
            Integer maChiDinh
    ) {
        KetQuaDichVu ketQua =
                xemKetQuaChiDinh(
                        maBacSi,
                        maLichKham,
                        maChiDinh
                )
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Chỉ định này chưa có kết quả."
                                )
                        );

        return chiTietKetQuaRepository
                .findByKetQuaDichVu_MaKetQuaOrderByMaChiTietKetQuaAsc(
                        ketQua.getMaKetQua()
                );
    }

    // =========================================================
    // 13. LẤY DANH SÁCH THUỐC ĐANG HOẠT ĐỘNG
    // =========================================================

    @Transactional(readOnly = true)
    public List<Thuoc> layDanhSachThuoc() {
        return thuocRepository
                .findByTrangThaiTrueOrderByTenThuocAsc();
    }

    // =========================================================
    // 14. TẠO ĐƠN THUỐC
    // =========================================================

    @Transactional
    public DonThuoc taoDonThuoc(
            Integer maBacSi,
            Integer maLichKham,
            DonThuocRequest request
    ) {
        // 1. Kiểm tra lịch khám thuộc bác sĩ
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(
                        maBacSi,
                        maLichKham
                );

        // 2. Lấy hồ sơ bệnh án
        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        // 3. Kiểm tra trạng thái lịch khám
        String trangThaiLich = lichKham.getTrangThai();

        if (!"DangKham".equals(trangThaiLich)
                && !"ChoCLS".equals(trangThaiLich)) {
            throw new IllegalStateException(
                    "Chỉ có thể kê đơn khi đang khám hoặc chờ kết quả CLS."
            );
        }

        // 4. Kiểm tra trạng thái hồ sơ bệnh án
        String trangThaiHoSo = hoSo.getTrangThai();

        if (!"DangKham".equals(trangThaiHoSo)
                && !"ChoCLS".equals(trangThaiHoSo)) {
            throw new IllegalStateException(
                    "Hồ sơ không ở trạng thái được phép kê đơn."
            );
        }

        // 5. Kiểm tra tất cả cận lâm sàng đã hoàn thành
        kiemTraCanLamSangDaHoanThanh(hoSo);

        // 6. Kiểm tra hồ sơ đã có đơn thuốc chưa
        if (donThuocRepository
                .findByHoSoBenhAn_MaHoSoBenhAn(
                        hoSo.getMaHoSoBenhAn()
                )
                .isPresent()) {
            throw new IllegalStateException(
                    "Hồ sơ bệnh án này đã có đơn thuốc."
            );
        }

        // 7. Kiểm tra dữ liệu đơn thuốc
        kiemTraDuLieuDonThuoc(request);

        // Kiểm tra thuốc còn hoạt động, còn hạn và đủ tồn kho
        kiemTraTonKhoDonThuoc(request);

        // 8. Lấy bác sĩ kê đơn
        BacSi bacSi =
                bacSiRepository
                        .findById(maBacSi)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Không tìm thấy bác sĩ."
                                )
                        );

        // 9. Khi đủ kết quả CLS, đưa ca khám về DangKham
        if ("ChoCLS".equals(trangThaiLich)
                || "ChoCLS".equals(trangThaiHoSo)) {
            lichKham.setTrangThai("DangKham");
            hoSo.setTrangThai("DangKham");

            lichDangKyKhamRepository.save(lichKham);
            hoSoBenhAnRepository.save(hoSo);

            int soDong = tiepNhanBenhNhanRepository
                    .capNhatTrangThaiTheoLich(
                            maLichKham,
                            "DangKham"
                    );

            if (soDong == 0) {
                throw new IllegalStateException(
                        "Không tìm thấy thông tin tiếp nhận bệnh nhân."
                );
            }
        }

        // 10. Tạo đơn thuốc mới
        DonThuoc donThuoc = new DonThuoc();

        donThuoc.setHoSoBenhAn(hoSo);
        donThuoc.setBacSi(bacSi);
        donThuoc.setNgayKeThuoc(LocalDateTime.now());

        // 11. Lấy chẩn đoán
        String chanDoan = hoSo.getChanDoan();

        if (chanDoan == null || chanDoan.isBlank()) {
            chanDoan = request.getChanDoan();
        }

        donThuoc.setChanDoan(chanDoan);
        donThuoc.setGhiChu(request.getGhiChu());

        // 12. Đơn thuốc được chuyển sang chờ lấy thuốc
        donThuoc.setTrangThai("ChoLayThuoc");

        // 13. Lưu đơn thuốc một lần
        DonThuoc donDaLuu =
                donThuocRepository.save(donThuoc);

        // 14. Lưu danh sách thuốc trong đơn
        for (CTDonThuocRequest item :
                request.getDanhSachThuoc()) {
            luuChiTietDonThuoc(
                    donDaLuu,
                    item
            );
        }

        // 15. Gửi thông báo đơn thuốc mới cho tài khoản bệnh nhân
        var benhNhan = lichKham.getBenhNhan();

        Integer maNguoiDung = benhNhan.getNguoiDung()
                .getMaNguoiDung();

        String tenBenhNhan = benhNhan.getHoTen();

        thongBaoService.taoThongBaoVaGuiRealtime(
                maNguoiDung,
                benhNhan,
                "Đơn thuốc đã được kê",
                "Bác sĩ đã hoàn tất kê đơn thuốc cho "
                        + tenBenhNhan
                        + ". Vui lòng đến nhà thuốc để thực hiện thanh toán và nhận thuốc.",
                "DON_THUOC"
        );

// 16. Gửi thông báo cho tất cả Dược sĩ
        thongBaoService.taoThongBaoTheoVaiTro(
                List.of("DUOCSI"),
                "Có đơn thuốc mới cần xử lý",
                "Bác sĩ vừa hoàn tất kê đơn thuốc mới. Mã đơn thuốc: "
                        + donDaLuu.getMaDonThuoc()
                        + ". Vui lòng kiểm tra danh sách đơn thuốc chờ cấp và thực hiện quy trình cấp thuốc.",
                "DON_THUOC"
        );

        return donDaLuu;
    }

    // =========================================================
    // 15. XEM ĐƠN THUỐC CỦA CA KHÁM
    // =========================================================

    @Transactional(readOnly = true)
    public Optional<DonThuoc> xemDonThuoc(
            Integer maBacSi,
            Integer maLichKham
    ) {
        timLichKhamCuaBacSi(
                maBacSi,
                maLichKham
        );

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        return donThuocRepository
                .findByHoSoBenhAn_MaHoSoBenhAn(
                        hoSo.getMaHoSoBenhAn()
                );
    }

    // =========================================================
    // 16. XEM CHI TIẾT THUỐC TRONG ĐƠN
    // =========================================================

    @Transactional(readOnly = true)
    public List<CTDonThuoc> xemChiTietDonThuoc(
            Integer maBacSi,
            Integer maLichKham
    ) {
        DonThuoc donThuoc =
                xemDonThuoc(
                        maBacSi,
                        maLichKham
                )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Ca khám này chưa có đơn thuốc."
                                )
                        );

        return ctDonThuocRepository
                .findByDonThuoc_MaDonThuocOrderByMaCTDonThuocAsc(
                        donThuoc.getMaDonThuoc()
                );
    }

    // =========================================================
    // 17. CẬP NHẬT ĐƠN THUỐC
    // =========================================================

    @Transactional
    public DonThuoc capNhatDonThuoc(
            Integer maBacSi,
            Integer maLichKham,
            DonThuocRequest request
    ) {
        // 1. Kiểm tra lịch khám thuộc bác sĩ
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        // 2. Kiểm tra trạng thái lịch khám
        if (!"DangKham".equals(lichKham.getTrangThai())) {
            throw new IllegalStateException(
                    "Chỉ có thể sửa đơn thuốc khi bệnh nhân đang khám."
            );
        }

        // 3. Lấy hồ sơ bệnh án
        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        kiemTraHoSoDangKham(hoSo);

        // 4. Kiểm tra kết quả CLS
        kiemTraCanLamSangDaHoanThanh(hoSo);

        // 5. Lấy đơn thuốc đã lưu
        DonThuoc donThuoc =
                donThuocRepository
                        .findByHoSoBenhAn_MaHoSoBenhAn(
                                hoSo.getMaHoSoBenhAn()
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Không tìm thấy đơn thuốc."
                                )
                        );

        // 6. Kiểm tra bác sĩ kê đơn
        if (donThuoc.getBacSi() == null ||
                !maBacSi.equals(
                        donThuoc.getBacSi().getMaBacSi()
                )) {
            throw new IllegalStateException(
                    "Bác sĩ không có quyền sửa đơn thuốc này."
            );
        }

        // 7. Chỉ cho sửa đơn đang chờ lấy thuốc
        if (!"ChoLayThuoc".equals(donThuoc.getTrangThai())) {
            throw new IllegalStateException(
                    "Đơn thuốc đã được xử lý, không thể chỉnh sửa."
            );
        }

        // 8. Kiểm tra dữ liệu mới
        kiemTraDuLieuDonThuoc(request);

        // Kiểm tra thuốc còn hoạt động, còn hạn và đủ tồn kho
        kiemTraTonKhoDonThuoc(request);

        // 9. Cập nhật chẩn đoán và ghi chú
        String chanDoan = hoSo.getChanDoan();

        if (chanDoan == null || chanDoan.isBlank()) {
            chanDoan = request.getChanDoan();
        }

        donThuoc.setChanDoan(chanDoan);
        donThuoc.setGhiChu(request.getGhiChu());

        // 10. Giữ trạng thái chờ lấy thuốc
        donThuoc.setTrangThai("ChoLayThuoc");

        // 11. Xóa các thuốc cũ
        ctDonThuocRepository.deleteByDonThuoc_MaDonThuoc(
                donThuoc.getMaDonThuoc()
        );

        // 12. Lưu danh sách thuốc mới
        for (CTDonThuocRequest item :
                request.getDanhSachThuoc()) {
            luuChiTietDonThuoc(donThuoc, item);
        }

        // 13. Lưu đơn thuốc
        return donThuocRepository.save(donThuoc);
    }

    // =========================================================
    // 18. LẤY TẤT CẢ ĐƠN THUỐC CỦA BÁC SĨ
    // =========================================================

    @Transactional(readOnly = true)
    public List<DonThuoc> layTatCaDonThuocCuaBacSi(
            Integer maBacSi
    ) {
        if (maBacSi == null) {
            throw new IllegalArgumentException(
                    "Mã bác sĩ không được để trống."
            );
        }

        return donThuocRepository
                .findByBacSi_MaBacSiOrderByNgayKeThuocDesc(
                        maBacSi
                );
    }

    // =========================================================
    // 19. LẤY LỊCH SỬ KHÁM CỦA BỆNH NHÂN - CÓ PHÂN TRANG
    // =========================================================

    @Transactional(readOnly = true)
    public Page<HoSoBenhAn> layLichSuKham(
            Integer maBacSi,
            Integer maLichKham,
            int page,
            int size
    ) {
        // Lịch khám hiện tại phải thuộc bác sĩ đang đăng nhập.
        LichDangKyKham lichKhamHienTai =
                timLichKhamCuaBacSi(
                        maBacSi,
                        maLichKham
                );

        if (lichKhamHienTai.getBenhNhan() == null) {
            throw new IllegalStateException(
                    "Lịch khám không có thông tin bệnh nhân."
            );
        }

        Integer maBenhNhan =
                lichKhamHienTai
                        .getBenhNhan()
                        .getMaBenhNhan();

        // Kiểm tra page và size để tránh giá trị không hợp lệ.
        if (page < 0) {
            page = 0;
        }

        if (size <= 0) {
            size = 5;
        }

        // Giới hạn tối đa để tránh client yêu cầu quá nhiều dữ liệu.
        if (size > 20) {
            size = 20;
        }

        // Sắp xếp ngày khám mới nhất trước.
        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Order.desc("lichDangKyKham.ngayKham"),
                        Sort.Order.desc("lichDangKyKham.gioKham")
                )
        );

        // Chỉ lấy hồ sơ đúng bệnh nhân, đã hoàn tất,
        // không lấy lịch khám hiện tại.
        return hoSoBenhAnRepository
                .findByLichDangKyKham_BenhNhan_MaBenhNhanAndTrangThaiAndLichDangKyKham_MaLichKhamNot(
                        maBenhNhan,
                        "HoanTat",
                        maLichKham,
                        pageable
                );
    }

    // =========================================================
    // 20. XEM CHI TIẾT MỘT LẦN KHÁM TRONG LỊCH SỬ
    // =========================================================

    @Transactional(readOnly = true)
    public HoSoBenhAn xemChiTietLichSuKham(
            Integer maBacSi,
            Integer maLichKham,
            Integer maHoSoBenhAn
    ) {
        // Xác định bệnh nhân của ca khám hiện tại.
        LichDangKyKham lichKhamHienTai =
                timLichKhamCuaBacSi(
                        maBacSi,
                        maLichKham
                );

        if (lichKhamHienTai.getBenhNhan() == null) {
            throw new IllegalStateException(
                    "Lịch khám không có thông tin bệnh nhân."
            );
        }

        Integer maBenhNhan =
                lichKhamHienTai
                        .getBenhNhan()
                        .getMaBenhNhan();

        // Chỉ được xem hồ sơ thuộc đúng bệnh nhân hiện tại.
        HoSoBenhAn hoSo =
                hoSoBenhAnRepository
                        .findByMaHoSoBenhAnAndLichDangKyKham_BenhNhan_MaBenhNhan(
                                maHoSoBenhAn,
                                maBenhNhan
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Không tìm thấy lịch sử khám của bệnh nhân."
                                )
                        );

        // Lịch sử chỉ bao gồm hồ sơ đã hoàn tất.
        if (!"HoanTat".equals(hoSo.getTrangThai())) {
            throw new IllegalStateException(
                    "Hồ sơ này chưa hoàn tất nên chưa thuộc lịch sử khám."
            );
        }

        return hoSo;
    }

    // =========================================================
    // 21. LẤY CHỈ ĐỊNH CLS TRONG LỊCH SỬ KHÁM
    // =========================================================

    @Transactional(readOnly = true)
    public List<ChiDinhYTe> layChiDinhLichSuKham(
            Integer maBacSi,
            Integer maLichKhamHienTai,
            Integer maHoSoBenhAn
    ) {
        HoSoBenhAn hoSo = xemChiTietLichSuKham(
                maBacSi,
                maLichKhamHienTai,
                maHoSoBenhAn
        );

        return chiDinhYTeRepository
                .findByHoSoBenhAn_MaHoSoBenhAnOrderByNgayChiDinhDesc(
                        hoSo.getMaHoSoBenhAn()
                );
    }

    // =========================================================
    // 22. LẤY KẾT QUẢ CLS TRONG LỊCH SỬ KHÁM
    // =========================================================

    @Transactional(readOnly = true)
    public Optional<KetQuaDichVu> layKetQuaLichSuKham(
            Integer maBacSi,
            Integer maLichKhamHienTai,
            Integer maHoSoBenhAn,
            Integer maChiDinh
    ) {
        HoSoBenhAn hoSo = xemChiTietLichSuKham(
                maBacSi,
                maLichKhamHienTai,
                maHoSoBenhAn
        );

        chiDinhYTeRepository
                .findByMaChiDinhAndHoSoBenhAn_MaHoSoBenhAn(
                        maChiDinh,
                        hoSo.getMaHoSoBenhAn()
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Chỉ định không thuộc hồ sơ khám này."
                        )
                );

        return ketQuaDichVuRepository
                .findByChiDinhYTe_MaChiDinh(maChiDinh);
    }

    // =========================================================
    // 23. LẤY CHI TIẾT KẾT QUẢ CLS TRONG LỊCH SỬ
    // =========================================================

    @Transactional(readOnly = true)
    public List<ChiTietKetQua> layChiTietKetQuaLichSu(
            Integer maKetQua
    ) {
        return chiTietKetQuaRepository
                .findByKetQuaDichVu_MaKetQuaOrderByMaChiTietKetQuaAsc(
                        maKetQua
                );
    }

    // =========================================================
    // 24. LẤY ĐƠN THUỐC TRONG LỊCH SỬ KHÁM
    // =========================================================

    @Transactional(readOnly = true)
    public Optional<DonThuoc> layDonThuocLichSuKham(
            Integer maBacSi,
            Integer maLichKhamHienTai,
            Integer maHoSoBenhAn
    ) {
        HoSoBenhAn hoSo = xemChiTietLichSuKham(
                maBacSi,
                maLichKhamHienTai,
                maHoSoBenhAn
        );

        return donThuocRepository
                .findByHoSoBenhAn_MaHoSoBenhAn(
                        hoSo.getMaHoSoBenhAn()
                );
    }

    // =========================================================
    // 25. LẤY CHI TIẾT THUỐC TRONG ĐƠN LỊCH SỬ
    // =========================================================

    @Transactional(readOnly = true)
    public List<CTDonThuoc> layChiTietDonThuocLichSu(
            Integer maDonThuoc
    ) {
        return ctDonThuocRepository
                .findByDonThuoc_MaDonThuocOrderByMaCTDonThuocAsc(
                        maDonThuoc
                );
    }

    // =========================================================
    // HÀM LƯU MỘT THUỐC VÀO ĐƠN
    // =========================================================

    private void luuChiTietDonThuoc(
            DonThuoc donThuoc,
            CTDonThuocRequest request
    ) {
        if (request == null ||
                request.getMaThuoc() == null) {
            throw new IllegalArgumentException(
                    "Thuốc không hợp lệ."
            );
        }

        if (request.getSoLuong() == null ||
                request.getSoLuong() <= 0) {
            throw new IllegalArgumentException(
                    "Số lượng thuốc phải lớn hơn 0."
            );
        }

        if (request.getThoiGianDung() != null &&
                request.getThoiGianDung() <= 0) {
            throw new IllegalArgumentException(
                    "Thời gian dùng thuốc phải lớn hơn 0."
            );
        }

        Thuoc thuoc =
                thuocRepository
                        .findById(request.getMaThuoc())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Không tìm thấy thuốc có mã "
                                                + request.getMaThuoc()
                                                + "."
                                )
                        );

        if (!Boolean.TRUE.equals(thuoc.getTrangThai())) {
            throw new IllegalStateException(
                    "Thuốc "
                            + thuoc.getTenThuoc()
                            + " hiện không hoạt động."
            );
        }

        CTDonThuoc chiTiet = new CTDonThuoc();

        chiTiet.setDonThuoc(donThuoc);
        chiTiet.setThuoc(thuoc);

        // Lưu giá thuốc tại thời điểm kê
        chiTiet.setDonGiaBan(thuoc.getGia());
        chiTiet.setSoLuong(request.getSoLuong());
        chiTiet.setLieuDung(request.getLieuDung());
        chiTiet.setThoiGianDung(request.getThoiGianDung());
        chiTiet.setHuongDanSuDung(request.getHuongDanSuDung());

        ctDonThuocRepository.save(chiTiet);
    }

    // =========================================================
    // KIỂM TRA REQUEST ĐƠN THUỐC
    // =========================================================

    private void kiemTraDuLieuDonThuoc(
            DonThuocRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Dữ liệu đơn thuốc không hợp lệ."
            );
        }

        if (request.getDanhSachThuoc() == null ||
                request.getDanhSachThuoc().isEmpty()) {
            throw new IllegalArgumentException(
                    "Đơn thuốc phải có ít nhất một thuốc."
            );
        }
    }

    // =========================================================
    // HÀM DÙNG CHUNG
    // =========================================================

    private LichDangKyKham timLichKhamCuaBacSi(
            Integer maBacSi,
            Integer maLichKham
    ) {
        return lichDangKyKhamRepository
                .findByMaLichKhamAndBacSi_MaBacSi(
                        maLichKham,
                        maBacSi
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy lịch khám hoặc lịch khám không thuộc bác sĩ."
                        )
                );
    }

    private HoSoBenhAn timHoSoTheoLichKham(
            Integer maLichKham
    ) {
        return hoSoBenhAnRepository
                .findByLichDangKyKham_MaLichKham(maLichKham)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy hồ sơ bệnh án."
                        )
                );
    }

    private void kiemTraHoSoDangKham(
            HoSoBenhAn hoSo
    ) {
        if (!"DangKham".equals(hoSo.getTrangThai())) {
            throw new IllegalStateException(
                    "Hồ sơ bệnh án đã hoàn tất, không thể chỉnh sửa."
            );
        }
    }

    // =========================================================
    // KIỂM TRA THUỐC KHI BÁC SĨ KÊ ĐƠN
    // =========================================================

    @Transactional(readOnly = true)
    public Map<String, Object> kiemTraThuoc(
            Integer maThuoc,
            Integer soLuong
    ) {
        if (maThuoc == null || maThuoc <= 0) {
            throw new IllegalArgumentException(
                    "Mã thuốc không hợp lệ."
            );
        }

        Thuoc thuoc = thuocRepository.findById(maThuoc)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy thuốc có mã " + maThuoc
                        )
                );

        long soLuongKhaDung =
                khoThuocRepository.tongSoLuongConHan(
                        maThuoc,
                        LocalDate.now()
                );

        boolean dangHoatDong =
                Boolean.TRUE.equals(thuoc.getTrangThai());

        boolean hopLeSoLuong =
                soLuong != null && soLuong > 0;

        boolean duSoLuong =
                hopLeSoLuong && soLuongKhaDung >= soLuong;

        boolean duocPhep =
                dangHoatDong && duSoLuong;

        long soLuongThieu = hopLeSoLuong
                ? Math.max(0L, (long) soLuong - soLuongKhaDung)
                : 0L;

        String thongBao;

        if (!dangHoatDong) {
            thongBao = "Thuốc " + thuoc.getTenThuoc()
                    + " đã ngừng hoạt động.";
        } else if (!hopLeSoLuong) {
            thongBao = "Số lượng kê phải lớn hơn 0.";
        } else if (soLuongKhaDung == 0) {
            thongBao = "Thuốc " + thuoc.getTenThuoc()
                    + " không có lô còn hạn và còn tồn kho.";
        } else if (!duSoLuong) {
            thongBao = "Thuốc " + thuoc.getTenThuoc()
                    + " chỉ còn " + soLuongKhaDung
                    + ", thiếu " + soLuongThieu + ".";
        } else {
            thongBao = "Thuốc hợp lệ, có thể kê đơn.";
        }

        Map<String, Object> result = new HashMap<>();

        result.put("maThuoc", maThuoc);
        result.put("tenThuoc", thuoc.getTenThuoc());
        result.put("duocPhep", duocPhep);
        result.put("dangHoatDong", dangHoatDong);
        result.put("soLuongKhaDung", soLuongKhaDung);
        result.put("soLuongYeuCau", soLuong);
        result.put("soLuongThieu", soLuongThieu);
        result.put("thongBao", thongBao);

        return result;
    }

    // =========================================================
    // KIỂM TRA TOÀN BỘ ĐƠN THUỐC TRƯỚC KHI LƯU
    // =========================================================

    private void kiemTraTonKhoDonThuoc(
            DonThuocRequest request
    ) {
        Map<Integer, Long> tongTheoThuoc = new HashMap<>();

        for (CTDonThuocRequest item : request.getDanhSachThuoc()) {
            if (item == null
                    || item.getMaThuoc() == null
                    || item.getSoLuong() == null
                    || item.getSoLuong() <= 0) {
                throw new IllegalArgumentException(
                        "Thuốc hoặc số lượng kê không hợp lệ."
                );
            }

            tongTheoThuoc.merge(
                    item.getMaThuoc(),
                    item.getSoLuong().longValue(),
                    Long::sum
            );
        }

        for (Map.Entry<Integer, Long> entry : tongTheoThuoc.entrySet()) {
            if (entry.getValue() > Integer.MAX_VALUE) {
                throw new IllegalArgumentException(
                        "Số lượng thuốc vượt giới hạn cho phép."
                );
            }

            Map<String, Object> ketQua = kiemTraThuoc(
                    entry.getKey(),
                    entry.getValue().intValue()
            );

            if (!Boolean.TRUE.equals(ketQua.get("duocPhep"))) {
                throw new IllegalStateException(
                        String.valueOf(ketQua.get("thongBao"))
                );
            }
        }
    }

    // =========================================================
    // KIỂM TRA ĐIỀU KIỆN CẬN LÂM SÀNG
    // TRƯỚC KHI KÊ ĐƠN HOẶC HOÀN TẤT KHÁM
    // =========================================================

    private void kiemTraCanLamSangDaHoanThanh(
            HoSoBenhAn hoSo
    ) {
        List<ChiDinhYTe> danhSachChiDinh =
                chiDinhYTeRepository
                        .findByHoSoBenhAn_MaHoSoBenhAnOrderByNgayChiDinhDesc(
                                hoSo.getMaHoSoBenhAn()
                        );

        // Không có chỉ định CLS thì cho phép tiếp tục.
        if (danhSachChiDinh.isEmpty()) {
            return;
        }

        for (ChiDinhYTe chiDinh : danhSachChiDinh) {
            // Chỉ định phải hoàn thành.
            if (!"DaHoanThanh".equals(chiDinh.getTrangThai())) {
                throw new IllegalStateException(
                        "Chưa thể kê đơn hoặc hoàn tất khám. "
                                + "Vẫn còn chỉ định cận lâm sàng "
                                + "chưa hoàn thành."
                );
            }

            // Phải tồn tại kết quả tương ứng.
            KetQuaDichVu ketQua =
                    ketQuaDichVuRepository
                            .findByChiDinhYTe_MaChiDinh(
                                    chiDinh.getMaChiDinh()
                            )
                            .orElseThrow(() ->
                                    new IllegalStateException(
                                            "Chỉ định "
                                                    + chiDinh.getMaChiDinh()
                                                    + " chưa có kết quả cận lâm sàng."
                                    )
                            );

            // Kết quả phải được hoàn tất.
            if (!"DaHoanThanh".equals(ketQua.getTrangThai())) {
                throw new IllegalStateException(
                        "Kết quả cận lâm sàng của chỉ định "
                                + chiDinh.getMaChiDinh()
                                + " chưa được hoàn tất."
                );
            }
        }
    }

    // =================================================
    // THÔNG BÁO BÁC SĨ GỌI KHÁM
    // =================================================

    private void guiThongBaoBacSiGoiKham(
            LichDangKyKham lichKham
    ) {
        if (lichKham.getBenhNhan() == null
                || lichKham.getBenhNhan().getNguoiDung() == null) {
            return;
        }

        Integer maNguoiDung = lichKham.getBenhNhan()
                .getNguoiDung()
                .getMaNguoiDung();

        if (maNguoiDung == null) {
            return;
        }

        LichLamViec lichLamViec = lichLamViecRepository
                .timLichLamViecTheoCaKham(
                        lichKham.getBacSi().getMaBacSi(),
                        lichKham.getNgayKham(),
                        lichKham.getGioKham()
                )
                .orElse(null);

        String tenPhong = lichLamViec != null
                && lichLamViec.getPhong() != null
                ? lichLamViec.getPhong().getTenPhong()
                : "phòng khám theo hướng dẫn của nhân viên bệnh viện";

        String tenBenhNhan = lichKham.getBenhNhan().getHoTen();

        thongBaoService.taoThongBaoVaGuiRealtime(
                maNguoiDung,
                lichKham.getBenhNhan(),
                "Bác sĩ đang mời bạn vào khám",
                "Bệnh nhân " + tenBenhNhan
                        + ", bác sĩ đang mời bạn vào " + tenPhong + ".",
                "BAC_SI_GOI_KHAM"
        );
    }

    // ===================================
    // xem danh sach anh ket qua
    // ===================================
    @Transactional(readOnly = true)
    public List<AnhKetQuaDichVu> xemDanhSachAnhKetQua(
            Integer maBacSi,
            Integer maLichKham,
            Integer maChiDinh
    ) {
        KetQuaDichVu ketQua = xemKetQuaChiDinh(
                maBacSi,
                maLichKham,
                maChiDinh
        ).orElseThrow(() ->
                new IllegalStateException(
                        "Chỉ định này chưa có kết quả."
                )
        );

        return anhKetQuaDichVuRepository
                .findByKetQuaDichVu_MaKetQuaOrderByNgayTaoAsc(
                        ketQua.getMaKetQua()
                );
    }
}