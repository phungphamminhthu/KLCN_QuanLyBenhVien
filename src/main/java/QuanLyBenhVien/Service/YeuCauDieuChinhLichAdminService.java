package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.XuLyYeuCauLichDTO;
import QuanLyBenhVien.Entity.YeuCauDieuChinhLich;
import QuanLyBenhVien.Entity.LichLamViec;
import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Repository.YeuCauDieuChinhLichRepository;
import QuanLyBenhVien.Repository.LichLamViecRepository;
import QuanLyBenhVien.Entity.PhongChuyenTrach;
import QuanLyBenhVien.Repository.BacSiRepository;
import QuanLyBenhVien.Repository.PhongChuyenTrachRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Transactional
public class YeuCauDieuChinhLichAdminService {

    private final YeuCauDieuChinhLichRepository yeuCauRepository;
    private final LichLamViecRepository lichRepository;
    private final LichLamViecService lichLamViecService;
    private final ThongBaoService thongBaoService;
    private final BacSiRepository bacSiRepository;
    private final PhongChuyenTrachRepository phongRepository;

    public YeuCauDieuChinhLichAdminService(
            YeuCauDieuChinhLichRepository yeuCauRepository,
            LichLamViecRepository lichRepository,
            LichLamViecService lichLamViecService,
            ThongBaoService thongBaoService,
            BacSiRepository bacSiRepository,
            PhongChuyenTrachRepository phongRepository) {

        this.yeuCauRepository = yeuCauRepository;
        this.lichRepository = lichRepository;
        this.lichLamViecService = lichLamViecService;
        this.thongBaoService = thongBaoService;
        this.bacSiRepository = bacSiRepository;
        this.phongRepository = phongRepository;
    }

    @Transactional(readOnly = true)
    public List<YeuCauDieuChinhLich> layDanhSach(String trangThai) {
        if (trangThai == null || trangThai.isBlank()) {
            return yeuCauRepository.findAll();
        }

        return yeuCauRepository.findByTrangThaiOrderByNgayTaoDesc(trangThai);
    }

    @Transactional(readOnly = true)
    public YeuCauDieuChinhLich layChiTiet(Integer maYeuCau) {
        return yeuCauRepository.findById(maYeuCau)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy yêu cầu."));
    }

    public YeuCauDieuChinhLich xuLy(
            Integer maYeuCau,
            XuLyYeuCauLichDTO request) {

        if (request == null || request.getThaoTac() == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn thao tác xử lý.");
        }

        YeuCauDieuChinhLich yeuCau = yeuCauRepository.findById(maYeuCau)
                .orElseThrow(() ->
                        new IllegalArgumentException("Không tìm thấy yêu cầu."));

        if (!"CHO_XU_LY".equals(yeuCau.getTrangThai())) {
            throw new IllegalStateException(
                    "Yêu cầu này đã được xử lý trước đó.");
        }

        String thaoTac = request.getThaoTac()
                .trim()
                .toUpperCase();

        String ghiChu = request.getGhiChuXuLy() == null
                ? null
                : request.getGhiChuXuLy().trim();

        boolean duyet;

        if ("TU_CHOI".equals(thaoTac)) {
            if (ghiChu == null || ghiChu.isBlank()) {
                throw new IllegalArgumentException(
                        "Vui lòng nhập lý do từ chối.");
            }

            yeuCau.setTrangThai("DA_TU_CHOI");
            yeuCau.setGhiChuXuLy(ghiChu);
            duyet = false;

        } else if ("DUYET".equals(thaoTac)) {
            duyetYeuCau(yeuCau, request);

            yeuCau.setTrangThai("DA_DUYET");
            yeuCau.setGhiChuXuLy(ghiChu);
            duyet = true;

        } else {
            throw new IllegalArgumentException(
                    "Thao tác không hợp lệ. Chỉ chấp nhận DUYET hoặc TU_CHOI.");
        }

        yeuCau.setNgayXuLy(LocalDateTime.now());
        yeuCau.setMaNguoiXuLy(request.getMaNguoiXuLy());

        YeuCauDieuChinhLich saved = yeuCauRepository.save(yeuCau);

        // Gửi thông báo cho bác sĩ sau khi xử lý yêu cầu
        guiThongBaoBacSi(saved, duyet, ghiChu);

        return saved;
    }

    // ============================================
    // duyet yeu cau
    // ============================================
    private void duyetYeuCau(
            YeuCauDieuChinhLich yeuCau,
            XuLyYeuCauLichDTO request) {

        LichLamViec lich = yeuCau.getLichLamViec();

        if (lich == null) {
            throw new IllegalStateException(
                    "Yêu cầu không còn lịch làm việc liên quan.");
        }

        String loaiYeuCau = yeuCau.getLoaiYeuCau() == null
                ? ""
                : yeuCau.getLoaiYeuCau().trim().toUpperCase();

        // HỦY LỊCH
        if (loaiYeuCau.contains("HUY")) {
            lich.setTrangThai("NgungLamViec");
            lichRepository.save(lich);
            return;
        }

        // SỬA LỊCH: dùng thông tin mới đã lưu trong yêu cầu
        if (loaiYeuCau.contains("SUA")
                || loaiYeuCau.contains("DIEU_CHINH")
                || loaiYeuCau.contains("ĐIỀU CHỈNH")) {

            if (yeuCau.getNgayLamViecMoi() == null
                    || yeuCau.getGioBatDauMoi() == null
                    || yeuCau.getGioKetThucMoi() == null
                    || yeuCau.getPhongMoi() == null) {

                throw new IllegalArgumentException(
                        "Yêu cầu sửa lịch chưa có đủ ngày, giờ và phòng mới.");
            }

            lichLamViecService.adminCapNhatLichLamViec(
                    lich.getMaLichLamViec(),
                    lich.getBacSi().getMaBacSi(),
                    yeuCau.getPhongMoi().getMaPhong(),
                    yeuCau.getNgayLamViecMoi(),
                    yeuCau.getGioBatDauMoi(),
                    yeuCau.getGioKetThucMoi()
            );
            return;
        }

        // ĐIỀU PHỐI BÁC SĨ + NGÀY + GIỜ + PHÒNG
        if ("DIEU_PHOI".equals(loaiYeuCau)) {

            Integer maBacSiMoi = request.getMaBacSiMoi();

            if (maBacSiMoi == null) {
                throw new IllegalArgumentException(
                        "Vui lòng chọn bác sĩ nhận điều phối.");
            }

            if (request.getNgayLamViecMoi() == null
                    || request.getGioBatDauMoi() == null
                    || request.getGioKetThucMoi() == null
                    || request.getMaPhongMoi() == null) {

                throw new IllegalArgumentException(
                        "Vui lòng nhập ngày, giờ và phòng mới.");
            }

            if (!request.getGioBatDauMoi()
                    .isBefore(request.getGioKetThucMoi())) {
                throw new IllegalArgumentException(
                        "Giờ bắt đầu phải trước giờ kết thúc.");
            }

            if (lich.getBacSi() != null
                    && maBacSiMoi.equals(lich.getBacSi().getMaBacSi())) {
                throw new IllegalArgumentException(
                        "Bác sĩ nhận điều phối phải khác bác sĩ hiện tại.");
            }

            BacSi bacSiMoi = bacSiRepository.findById(maBacSiMoi)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Không tìm thấy bác sĩ nhận điều phối."));

            PhongChuyenTrach phongMoi = phongRepository
                    .findById(request.getMaPhongMoi())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Không tìm thấy phòng mới."));

            lichLamViecService.adminCapNhatLichLamViec(
                    lich.getMaLichLamViec(),
                    bacSiMoi.getMaBacSi(),
                    phongMoi.getMaPhong(),
                    request.getNgayLamViecMoi(),
                    request.getGioBatDauMoi(),
                    request.getGioKetThucMoi()
            );

            return;
        }

        throw new IllegalArgumentException(
                "Loại yêu cầu không được hỗ trợ: "
                        + yeuCau.getLoaiYeuCau());
    }

    private void guiThongBaoBacSi(
            YeuCauDieuChinhLich yeuCau,
            boolean duyet,
            String ghiChu) {

        LichLamViec lich = yeuCau.getLichLamViec();

        if (lich == null || lich.getBacSi() == null) {
            return;
        }

        BacSi bacSi = lich.getBacSi();
        NguoiDung nguoiDung = bacSi.getNguoiDung();

        if (nguoiDung == null || nguoiDung.getMaNguoiDung() == null) {
            return;
        }

        String loaiYeuCau = yeuCau.getLoaiYeuCau() == null
                ? ""
                : yeuCau.getLoaiYeuCau().trim().toUpperCase();

        String loai;

        if (loaiYeuCau.contains("HUY")) {
            loai = "hủy lịch làm việc";
        } else if (loaiYeuCau.contains("SUA")
                || loaiYeuCau.contains("DIEU_CHINH")
                || loaiYeuCau.contains("ĐIỀU CHỈNH")) {
            loai = "điều chỉnh lịch làm việc";
        } else {
            loai = "lịch làm việc";
        }

        String ketQua = duyet ? "đã được duyệt" : "đã bị từ chối";

        String tieuDe;

        if (duyet) {
            tieuDe = loaiYeuCau.contains("HUY")
                    ? "Yêu cầu hủy lịch đã được duyệt"
                    : "Yêu cầu điều chỉnh lịch đã được duyệt";
        } else {
            tieuDe = loaiYeuCau.contains("HUY")
                    ? "Yêu cầu hủy lịch bị từ chối"
                    : "Yêu cầu điều chỉnh lịch bị từ chối";
        }
        StringBuilder noiDung = new StringBuilder();

        noiDung.append("Yêu cầu ")
                .append(loai)
                .append(" của bạn ")
                .append(ketQua)
                .append(".");

        if (lich.getNgayLamViec() != null) {
            noiDung.append(" Ngày làm việc: ")
                    .append(lich.getNgayLamViec().format(
                            DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        }

        if (lich.getGioBatDau() != null
                && lich.getGioKetThuc() != null) {
            noiDung.append(", từ ")
                    .append(lich.getGioBatDau())
                    .append(" đến ")
                    .append(lich.getGioKetThuc());
        }

        if (ghiChu != null && !ghiChu.isBlank()) {
            noiDung.append(". Ghi chú xử lý: ")
                    .append(ghiChu);
        }

        thongBaoService.taoThongBao(
                nguoiDung.getMaNguoiDung(),
                tieuDe,
                noiDung.toString(),
                "LICH_LAM_VIEC"
        );
    }
}