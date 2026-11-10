package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.YeuCauDieuChinhRequest;
import QuanLyBenhVien.Entity.*;
import QuanLyBenhVien.Repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class YeuCauDieuChinhLichService {

    private static final String CHO_XU_LY = "CHO_XU_LY";
    private static final String DA_DUYET = "DA_DUYET";
    private static final String TU_CHOI = "TU_CHOI";

    private final YeuCauDieuChinhLichRepository yeuCauRepository;
    private final LichLamViecRepository lichRepository;
    private final BacSiRepository bacSiRepository;
    private final PhongChuyenTrachRepository phongRepository;
    private final LichLamViecService lichLamViecService;
    private final ThongBaoService thongBaoService;
    private final NguoiDungRepository nguoiDungRepository;

    public YeuCauDieuChinhLichService(
            YeuCauDieuChinhLichRepository yeuCauRepository,
            LichLamViecRepository lichRepository,
            BacSiRepository bacSiRepository,
            PhongChuyenTrachRepository phongRepository,
            LichLamViecService lichLamViecService,
            ThongBaoService thongBaoService,
            NguoiDungRepository nguoiDungRepository) {

        this.yeuCauRepository = yeuCauRepository;
        this.lichRepository = lichRepository;
        this.bacSiRepository = bacSiRepository;
        this.phongRepository = phongRepository;
        this.lichLamViecService = lichLamViecService;
        this.thongBaoService = thongBaoService;
        this.nguoiDungRepository = nguoiDungRepository;
    }

    @Transactional
    public YeuCauDieuChinhLich taoYeuCau(
            Integer maBacSi,
            Integer maLich,
            YeuCauDieuChinhRequest request) {

        if (request == null) {
            throw new IllegalArgumentException("Dữ liệu yêu cầu không hợp lệ.");
        }

        String loai = request.getLoaiYeuCau();
        if (loai == null) {
            throw new IllegalArgumentException("Vui lòng chọn loại yêu cầu.");
        }

        loai = loai.trim().toUpperCase();

        if (!List.of("HUY", "SUA", "DIEU_PHOI").contains(loai)) {
            throw new IllegalArgumentException("Loại yêu cầu không hợp lệ.");
        }

        if (request.getLyDo() == null || request.getLyDo().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập lý do.");
        }

        LichLamViec lich = lichRepository.findById(maLich)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy lịch làm việc."));

        if (lich.getBacSi() == null
                || !maBacSi.equals(lich.getBacSi().getMaBacSi())) {
            throw new IllegalArgumentException(
                    "Bạn không có quyền gửi yêu cầu cho lịch này.");
        }

        // Chặn sửa / hủy / điều phối từ ngày làm việc trở đi
        LocalDate ngayHienTai = LocalDate.now();
        LocalDate ngayLamViec = lich.getNgayLamViec();

        if (ngayLamViec == null || !ngayLamViec.isAfter(ngayHienTai)) {
            throw new IllegalArgumentException(
                    "Chỉ được gửi yêu cầu sửa, hủy hoặc điều phối trước ngày làm việc."
            );
        }

        boolean daCoYeuCauChoXuLy =
                yeuCauRepository
                        .existsByLichLamViec_MaLichLamViecAndTrangThai(
                                maLich, CHO_XU_LY);

        if (daCoYeuCauChoXuLy) {
            throw new IllegalArgumentException(
                    "Lịch này đã có yêu cầu đang chờ Admin xử lý.");
        }

        if ("SUA".equals(loai)) {
            kiemTraDuLieuSua(request);
        }

        if ("DIEU_PHOI".equals(loai)
                && (request.getNoiDungDieuPhoi() == null
                || request.getNoiDungDieuPhoi().isBlank())) {
            throw new IllegalArgumentException(
                    "Vui lòng nhập nội dung điều phối.");
        }

        YeuCauDieuChinhLich yc = new YeuCauDieuChinhLich();
        yc.setLichLamViec(lich);
        yc.setBacSi(lich.getBacSi());
        yc.setLoaiYeuCau(loai);
        yc.setLyDo(request.getLyDo().trim());
        yc.setTrangThai(CHO_XU_LY);

        yc.setNgayLamViecMoi(request.getNgayLamViecMoi());
        yc.setGioBatDauMoi(request.getGioBatDauMoi());
        yc.setGioKetThucMoi(request.getGioKetThucMoi());
        yc.setNoiDungDieuPhoi(request.getNoiDungDieuPhoi());

        if (request.getMaPhongMoi() != null) {
            PhongChuyenTrach phong = phongRepository
                    .findById(request.getMaPhongMoi())
                    .orElseThrow(() ->
                            new IllegalArgumentException("Không tìm thấy phòng mới."));
            yc.setPhongMoi(phong);
        }

        YeuCauDieuChinhLich saved = yeuCauRepository.save(yc);

        // Gửi thông báo cho Admin sau khi tạo yêu cầu thành công
        guiThongBaoAdmin(saved);

        // TODO: gửi thông báo realtime tới tài khoản Admin.
        // Cần lấy danh sách MaNguoiDung có role ADMIN từ repository người dùng.
        return saved;
    }

    private void kiemTraDuLieuSua(YeuCauDieuChinhRequest request) {
        if (request.getNgayLamViecMoi() == null
                || request.getGioBatDauMoi() == null
                || request.getGioKetThucMoi() == null
                || request.getMaPhongMoi() == null) {
            throw new IllegalArgumentException(
                    "Yêu cầu sửa lịch cần ngày, giờ bắt đầu, giờ kết thúc và phòng.");
        }

        if (!request.getGioBatDauMoi().isBefore(request.getGioKetThucMoi())) {
            throw new IllegalArgumentException(
                    "Giờ bắt đầu phải trước giờ kết thúc.");
        }
    }

    @Transactional(readOnly = true)
    public List<YeuCauDieuChinhLich> layYeuCauCuaBacSi(Integer maBacSi) {
        return yeuCauRepository
                .findByBacSi_MaBacSiOrderByNgayTaoDesc(maBacSi);
    }

    @Transactional(readOnly = true)
    public List<YeuCauDieuChinhLich> adminLayYeuCau(String trangThai) {
        if (trangThai == null || trangThai.isBlank()) {
            return yeuCauRepository.findAll()
                    .stream()
                    .sorted((a, b) -> b.getNgayTao().compareTo(a.getNgayTao()))
                    .toList();
        }

        return yeuCauRepository.findByTrangThaiOrderByNgayTaoDesc(
                trangThai.trim().toUpperCase());
    }

    @Transactional
    public YeuCauDieuChinhLich adminDuyet(
            Integer maYeuCau,
            Integer maNguoiXuLy,
            Integer maBacSiMoi,
            String ghiChu) {

        YeuCauDieuChinhLich yc = layYeuCauChoXuLy(maYeuCau);
        LichLamViec lich = yc.getLichLamViec();

        switch (yc.getLoaiYeuCau()) {
            case "HUY" -> {
                // Xóa lịch theo nghiệp vụ Admin hiện có.
                lichLamViecService.adminXoaLichLamViec(
                        lich.getMaLichLamViec());
            }

            case "SUA" -> {
                lichLamViecService.adminCapNhatLichLamViec(
                        lich.getMaLichLamViec(),
                        lich.getBacSi().getMaBacSi(),
                        yc.getPhongMoi() != null
                                ? yc.getPhongMoi().getMaPhong()
                                : null,
                        yc.getNgayLamViecMoi(),
                        yc.getGioBatDauMoi(),
                        yc.getGioKetThucMoi());
            }

            case "DIEU_PHOI" -> {
                if (maBacSiMoi == null) {
                    throw new IllegalArgumentException(
                            "Vui lòng chọn bác sĩ nhận điều phối.");
                }

                if (yc.getPhongMoi() == null
                        || yc.getNgayLamViecMoi() == null
                        || yc.getGioBatDauMoi() == null
                        || yc.getGioKetThucMoi() == null) {
                    throw new IllegalArgumentException(
                            "Yêu cầu điều phối cần ngày, giờ và phòng mới.");
                }

                lichLamViecService.adminCapNhatLichLamViec(
                        lich.getMaLichLamViec(),
                        maBacSiMoi,
                        yc.getPhongMoi().getMaPhong(),
                        yc.getNgayLamViecMoi(),
                        yc.getGioBatDauMoi(),
                        yc.getGioKetThucMoi());
            }
            default -> throw new IllegalArgumentException(
                    "Loại yêu cầu không được hỗ trợ.");
        }

        yc.setTrangThai("DA_DUYET");
        yc.setNgayXuLy(LocalDateTime.now());
        yc.setMaNguoiXuLy(maNguoiXuLy);
        yc.setGhiChuXuLy(ghiChu);

        YeuCauDieuChinhLich saved = yeuCauRepository.save(yc);

        if ("DIEU_PHOI".equals(yc.getLoaiYeuCau())) {
            // 1. Thông báo cho bác sĩ gửi yêu cầu điều phối
            String noiDungBacSiGui =
                    "Yêu cầu điều phối lịch của bạn đã được Admin duyệt. "
                            + "Lịch mới: "
                            + yc.getNgayLamViecMoi()
                            + ", từ "
                            + yc.getGioBatDauMoi()
                            + " đến "
                            + yc.getGioKetThucMoi()
                            + (ghiChu != null && !ghiChu.isBlank()
                            ? ". Ghi chú xử lý: " + ghiChu
                            : "");

            guiThongBaoBacSi(
                    yc,
                    "Yêu cầu điều phối lịch đã được duyệt",
                    noiDungBacSiGui
            );

            // 2. Thông báo cho bác sĩ nhận lịch điều phối
            BacSi bacSiNhan = bacSiRepository.findById(maBacSiMoi)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Không tìm thấy bác sĩ nhận điều phối."));

            if (bacSiNhan.getNguoiDung() != null
                    && bacSiNhan.getNguoiDung().getMaNguoiDung() != null) {

                String tenPhong = yc.getPhongMoi() != null
                        ? yc.getPhongMoi().getTenPhong()
                        : "Chưa xác định";

                String noiDungBacSiNhan =
                        "Bạn được phân công lịch làm việc mới. "
                                + "Ngày làm việc: "
                                + yc.getNgayLamViecMoi()
                                + ", từ "
                                + yc.getGioBatDauMoi()
                                + " đến "
                                + yc.getGioKetThucMoi()
                                + ", phòng: "
                                + tenPhong
                                + ".";

                thongBaoService.taoThongBao(
                        bacSiNhan.getNguoiDung().getMaNguoiDung(),
                        "Bạn được phân công lịch làm việc mới",
                        noiDungBacSiNhan,
                        "LICH_LAM_VIEC"
                );
            }

        } else {
            // Các loại yêu cầu HUY, SUA vẫn thông báo cho bác sĩ gửi yêu cầu
            guiThongBaoBacSi(
                    yc,
                    "Yêu cầu điều chỉnh lịch đã được duyệt",
                    "Admin đã duyệt yêu cầu " + yc.getLoaiYeuCau()
                            + (ghiChu != null && !ghiChu.isBlank()
                            ? ". Ghi chú: " + ghiChu
                            : "")
            );
        }

        return saved;
    }

    @Transactional
    public YeuCauDieuChinhLich adminTuChoi(
            Integer maYeuCau,
            Integer maNguoiXuLy,
            String ghiChu) {

        if (ghiChu == null || ghiChu.isBlank()) {
            throw new IllegalArgumentException(
                    "Vui lòng nhập lý do từ chối.");
        }

        YeuCauDieuChinhLich yc = layYeuCauChoXuLy(maYeuCau);

        yc.setTrangThai(TU_CHOI);
        yc.setNgayXuLy(LocalDateTime.now());
        yc.setMaNguoiXuLy(maNguoiXuLy);
        yc.setGhiChuXuLy(ghiChu.trim());

        YeuCauDieuChinhLich saved = yeuCauRepository.save(yc);

        guiThongBaoBacSi(
                yc,
                "Yêu cầu điều chỉnh lịch bị từ chối",
                "Admin từ chối yêu cầu. Lý do: " + ghiChu.trim()
        );

        return saved;
    }

    private YeuCauDieuChinhLich layYeuCauChoXuLy(Integer maYeuCau) {
        YeuCauDieuChinhLich yc = yeuCauRepository.findById(maYeuCau)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy yêu cầu."));

        if (!CHO_XU_LY.equals(yc.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Yêu cầu này đã được xử lý trước đó.");
        }

        return yc;
    }

    private void guiThongBaoBacSi(
            YeuCauDieuChinhLich yc,
            String tieuDe,
            String noiDung) {

        if (yc.getBacSi() == null
                || yc.getBacSi().getNguoiDung() == null) {
            return;
        }

        Integer maNguoiDung =
                yc.getBacSi().getNguoiDung().getMaNguoiDung();

        if (maNguoiDung == null) {
            return;
        }

        thongBaoService.taoThongBao(
                maNguoiDung,
                tieuDe,
                noiDung,
                "LICH_LAM_VIEC"
        );
    }

    private void guiThongBaoAdmin(YeuCauDieuChinhLich yc) {

        List<NguoiDung> admins =
                nguoiDungRepository
                        .findByVaiTro_TenVaiTroIgnoreCaseAndTrangThaiTrue("ADMIN");

        if (admins == null || admins.isEmpty()) {
            return;
        }

        LichLamViec lich = yc.getLichLamViec();

        String tenBacSi = yc.getBacSi() != null
                && yc.getBacSi().getNguoiDung() != null
                ? yc.getBacSi().getNguoiDung().getHoTen()
                : "Bác sĩ";

        String ngay = lich != null && lich.getNgayLamViec() != null
                ? lich.getNgayLamViec().format(
                DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : "Chưa xác định";

        String gio = lich != null
                && lich.getGioBatDau() != null
                && lich.getGioKetThuc() != null
                ? lich.getGioBatDau().format(
                DateTimeFormatter.ofPattern("HH:mm"))
                + " - "
                + lich.getGioKetThuc().format(
                DateTimeFormatter.ofPattern("HH:mm"))
                : "Chưa xác định";

        // Chuyển mã nghiệp vụ sang nội dung tiếng Việt
        String loaiYeuCauText;

        switch (yc.getLoaiYeuCau() == null
                ? ""
                : yc.getLoaiYeuCau().toUpperCase()) {

            case "SUA" ->
                    loaiYeuCauText = "sửa lịch";

            case "HUY" ->
                    loaiYeuCauText = "hủy lịch";

            case "DIEU_PHOI" ->
                    loaiYeuCauText = "điều phối lịch";

            default ->
                    loaiYeuCauText = "điều chỉnh lịch";
        }

        String tieuDe = "Yêu cầu điều chỉnh lịch mới";

        String lyDo = yc.getLyDo() != null
                && !yc.getLyDo().isBlank()
                ? yc.getLyDo()
                : "Không có lý do";

        String noiDung = String.format(
                "%s gửi yêu cầu %s cho lịch ngày %s (%s). Lý do: %s",
                tenBacSi,
                loaiYeuCauText,
                ngay,
                gio,
                lyDo
        );

        for (NguoiDung admin : admins) {
            if (admin != null && admin.getMaNguoiDung() != null) {
                thongBaoService.taoThongBao(
                        admin.getMaNguoiDung(),
                        tieuDe,
                        noiDung,
                        "LICH_LAM_VIEC"
                );
            }
        }
    }
}