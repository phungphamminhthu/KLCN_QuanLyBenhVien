package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Entity.LichSuDieuPhoiLichKham;
import QuanLyBenhVien.Entity.ThongBao;
import QuanLyBenhVien.Repository.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.format.DateTimeFormatter;

@Service
public class AdminLichKhamService {

    private static final int SUC_CHUA_MOI_KHUNG = 10;
    private static final int SO_PHUT_MOI_KHUNG = 30;

    private static final List<String> TRANG_THAI_DUOC_DIEU_PHOI =
            List.of("DaDat", "DaXacNhan", "DaTiepNhan", "ChoGoi");

    private static final DateTimeFormatter FORMAT_NGAY_THANG_NAM =
            DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final LichDangKyKhamRepository lichDangKyKhamRepository;
    private final BacSiRepository bacSiRepository;
    private final LichLamViecRepository lichLamViecRepository;
    private final LichSuDieuPhoiLichKhamRepository lichSuRepository;
    private final ThongBaoRepository thongBaoRepository;

    public AdminLichKhamService(
            LichDangKyKhamRepository lichDangKyKhamRepository,
            BacSiRepository bacSiRepository,
            LichLamViecRepository lichLamViecRepository,
            LichSuDieuPhoiLichKhamRepository lichSuRepository,
            ThongBaoRepository thongBaoRepository) {

        this.lichDangKyKhamRepository = lichDangKyKhamRepository;
        this.bacSiRepository = bacSiRepository;
        this.lichLamViecRepository = lichLamViecRepository;
        this.lichSuRepository = lichSuRepository;
        this.thongBaoRepository = thongBaoRepository;
    }

    /**
     * Lấy các lịch khám chưa bắt đầu khám của bác sĩ trong ngày.
     */
    @Transactional(readOnly = true)
    public List<LichDangKyKham> layLichCanDieuPhoi(
            Integer maBacSi,
            LocalDate ngayKham) {

        if (maBacSi == null || ngayKham == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn bác sĩ và ngày khám.");
        }

        return lichDangKyKhamRepository.findLichKhamCanDieuPhoi(
                maBacSi,
                ngayKham,
                TRANG_THAI_DUOC_DIEU_PHOI
        );
    }

    /**
     * Điều phối nhiều lượt khám sang bác sĩ mới.
     *
     * Mỗi bác sĩ tối đa 10 lượt trong một khung 30 phút.
     */
    @Transactional
    public int dieuPhoiLichKham(
            List<Integer> danhSachMaLichKham,
            Integer maBacSiMoi,
            String lyDo,
            Integer maAdmin,
            String tenAdmin) {

        if (danhSachMaLichKham == null
                || danhSachMaLichKham.isEmpty()) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn ít nhất một lượt khám cần điều phối.");
        }

        if (maBacSiMoi == null) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn bác sĩ tiếp nhận.");
        }

        // Loại bỏ ID null và ID trùng để không xử lý một lịch nhiều lần.
        List<Integer> danhSachId = danhSachMaLichKham.stream()
                .filter(id -> id != null)
                .distinct()
                .toList();

        if (danhSachId.isEmpty()) {
            throw new IllegalArgumentException(
                    "Danh sách lịch khám không hợp lệ.");
        }

        BacSi bacSiMoi = bacSiRepository.findById(maBacSiMoi)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy bác sĩ tiếp nhận."));

        if (!Boolean.TRUE.equals(bacSiMoi.getTrangThai())
                || bacSiMoi.getNguoiDung() == null
                || !Boolean.TRUE.equals(
                bacSiMoi.getNguoiDung().getTrangThai())) {
            throw new IllegalArgumentException(
                    "Bác sĩ tiếp nhận không còn hoạt động.");
        }

        String tenBacSiMoi = bacSiMoi.getNguoiDung().getHoTen();

        /*
         * Gom lịch được chọn theo ngày và khung 30 phút.
         * Cấu trúc:
         * Ngày khám -> Giờ bắt đầu khung -> Danh sách lịch khám
         */
        Map<LocalDate, Map<LocalTime, List<LichDangKyKham>>> lichTheoKhung =
                new LinkedHashMap<>();

        /*
         * Bước 1: Tải và kiểm tra toàn bộ lịch được chọn.
         * Chưa cập nhật dữ liệu ở bước này.
         */
        List<LichDangKyKham> danhSachLich = new ArrayList<>();

        for (Integer maLichKham : danhSachId) {
            LichDangKyKham lich = lichDangKyKhamRepository
                    .findById(maLichKham)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Không tìm thấy lịch khám mã " + maLichKham));

            if (!TRANG_THAI_DUOC_DIEU_PHOI.contains(
                    lich.getTrangThai())) {
                throw new IllegalArgumentException(
                        "Lịch khám mã " + maLichKham
                                + " đã bắt đầu hoặc đã kết thúc, không thể điều phối.");
            }

            if (lich.getNgayKham() == null || lich.getGioKham() == null) {
                throw new IllegalArgumentException(
                        "Lịch khám mã " + maLichKham
                                + " chưa có ngày hoặc giờ khám hợp lệ.");
            }

            if (lich.getNgayKham().isBefore(LocalDate.now())) {
                throw new IllegalArgumentException(
                        "Không thể điều phối lịch khám trong quá khứ.");
            }

            if (lich.getBacSi() == null
                    || lich.getBacSi().getNguoiDung() == null) {
                throw new IllegalArgumentException(
                        "Lịch khám mã " + maLichKham
                                + " chưa có thông tin bác sĩ hiện tại.");
            }

            Integer maBacSiCu = lich.getBacSi().getMaBacSi();

            if (maBacSiMoi.equals(maBacSiCu)) {
                throw new IllegalArgumentException(
                        "Bác sĩ tiếp nhận mới phải khác bác sĩ hiện tại.");
            }

            // Bác sĩ mới phải thuộc cùng khoa.
            if (lich.getKhoa() == null
                    || bacSiMoi.getKhoa() == null
                    || lich.getKhoa().getMaKhoa() == null
                    || bacSiMoi.getKhoa().getMaKhoa() == null
                    || !lich.getKhoa().getMaKhoa()
                    .equals(bacSiMoi.getKhoa().getMaKhoa())) {
                throw new IllegalArgumentException(
                        "Bác sĩ mới phải thuộc cùng khoa với lịch khám.");
            }

            // Bác sĩ mới phải có lịch làm việc tại ngày và giờ khám.
            long coLichLamViec =
                    lichLamViecRepository.countLichLamViecPhuHopGioKham(
                            maBacSiMoi,
                            lich.getNgayKham(),
                            lich.getGioKham()
                    );

            if (coLichLamViec == 0) {
                throw new IllegalArgumentException(
                        "Bác sĩ " + tenBacSiMoi
                                + " không có lịch làm việc phù hợp vào "
                                + lich.getNgayKham() + " "
                                + lich.getGioKham() + ".");
            }

            // Tính khung 30 phút chứa giờ khám.
            LocalTime gioBatDauKhung = lich.getGioKham()
                    .withMinute(
                            (lich.getGioKham().getMinute()
                                    / SO_PHUT_MOI_KHUNG)
                                    * SO_PHUT_MOI_KHUNG)
                    .withSecond(0)
                    .withNano(0);

            lichTheoKhung
                    .computeIfAbsent(
                            lich.getNgayKham(),
                            ngay -> new LinkedHashMap<>())
                    .computeIfAbsent(
                            gioBatDauKhung,
                            gio -> new ArrayList<>())
                    .add(lich);

            danhSachLich.add(lich);
        }

        /*
         * Bước 2: Kiểm tra sức chứa theo từng khung.
         *
         * Sức chứa = số lượt hiện có của bác sĩ mới
         *          + số lượt đang được điều phối vào khung đó.
         *
         * Kiểm tra theo nhóm để tránh chọn nhiều lịch cùng khung
         * làm vượt quá 10 lượt.
         */
        for (Map.Entry<LocalDate, Map<LocalTime, List<LichDangKyKham>>> entryNgay
                : lichTheoKhung.entrySet()) {

            LocalDate ngayKham = entryNgay.getKey();

            for (Map.Entry<LocalTime, List<LichDangKyKham>> entryKhung
                    : entryNgay.getValue().entrySet()) {

                LocalTime gioBatDau = entryKhung.getKey();
                LocalTime gioKetThuc = gioBatDau.plusMinutes(
                        SO_PHUT_MOI_KHUNG);

                int soLichDuocDieuPhoi = entryKhung.getValue().size();

                long soLuotHienTai =
                        lichDangKyKhamRepository.countLuotKhamTrongKhung30Phut(
                                maBacSiMoi,
                                ngayKham,
                                gioBatDau,
                                gioKetThuc
                        );

                long tongSauDieuPhoi =
                        soLuotHienTai + soLichDuocDieuPhoi;

                if (tongSauDieuPhoi > SUC_CHUA_MOI_KHUNG) {
                    throw new IllegalArgumentException(
                            "Bác sĩ " + tenBacSiMoi
                                    + " đã vượt sức chứa khung "
                                    + gioBatDau + " - " + gioKetThuc
                                    + " ngày " + ngayKham
                                    + ". Hiện có " + soLuotHienTai
                                    + " lượt, đang điều phối thêm "
                                    + soLichDuocDieuPhoi
                                    + " lượt. Mỗi khung tối đa "
                                    + SUC_CHUA_MOI_KHUNG + " lượt.");
                }
            }
        }

        /*
         * Bước 3: Tất cả kiểm tra đã hợp lệ.
         * Tiến hành cập nhật lịch, lưu lịch sử và gửi thông báo.
         */
        for (LichDangKyKham lich : danhSachLich) {

            Integer maBacSiCu = lich.getBacSi().getMaBacSi();
            String tenBacSiCu = lich.getBacSi()
                    .getNguoiDung()
                    .getHoTen();

            // Cập nhật bác sĩ tiếp nhận.
            lich.setBacSi(bacSiMoi);
            lichDangKyKhamRepository.save(lich);

            // Lưu lịch sử điều phối.
            LichSuDieuPhoiLichKham lichSu =
                    new LichSuDieuPhoiLichKham();

            lichSu.setMaLichKham(lich.getMaLichKham());
            lichSu.setMaBacSiCu(maBacSiCu);
            lichSu.setMaBacSiMoi(maBacSiMoi);
            lichSu.setMaAdminThucHien(maAdmin);
            lichSu.setTenAdminThucHien(tenAdmin);
            lichSu.setLyDo(
                    lyDo != null && !lyDo.isBlank()
                            ? lyDo.trim()
                            : null);
            lichSu.setNgayDieuPhoi(LocalDateTime.now());

            lichSuRepository.save(lichSu);
            String ngayKhamHienThi =
                    lich.getNgayKham().format(FORMAT_NGAY_THANG_NAM);

            // Gửi thông báo cho bệnh nhân.
            if (lich.getBenhNhan() != null
                    && lich.getBenhNhan().getNguoiDung() != null) {

                ThongBao thongBao = new ThongBao();

                thongBao.setNguoiDung(
                        lich.getBenhNhan().getNguoiDung());

                thongBao.setTieuDe(
                        "Lịch khám đã được điều phối");



                String noiDung =
                        "Lịch khám ngày " + ngayKhamHienThi
                                + " lúc " + lich.getGioKham()
                                + " đã được điều phối từ bác sĩ "
                                + tenBacSiCu
                                + " sang bác sĩ "
                                + tenBacSiMoi
                                + ".";

                if (lyDo != null && !lyDo.isBlank()) {
                    noiDung += " Lý do: " + lyDo.trim() + ".";
                }

                noiDung += " Vui lòng kiểm tra lại lịch khám.";

                thongBao.setNoiDung(noiDung);
                thongBao.setLoaiThongBao("DIEU_PHOI_LICH_KHAM");
                thongBao.setDaDoc(false);

                thongBaoRepository.save(thongBao);
            }

            // Gửi thông báo cho bác sĩ tiếp nhận.
            if (bacSiMoi.getNguoiDung() != null) {
                ThongBao thongBaoBacSi = new ThongBao();

                thongBaoBacSi.setNguoiDung(bacSiMoi.getNguoiDung());
                thongBaoBacSi.setTieuDe(
                        "Bạn được phân công tiếp nhận lịch khám");

                String noiDungBacSi =
                        "Bạn được điều phối tiếp nhận lịch khám ngày "
                                + ngayKhamHienThi
                                + " lúc " + lich.getGioKham()
                                + " từ bác sĩ " + tenBacSiCu + ".";

                if (lyDo != null && !lyDo.isBlank()) {
                    noiDungBacSi += " Lý do: " + lyDo.trim() + ".";
                }

                noiDungBacSi += " Vui lòng kiểm tra lịch khám của bạn.";

                thongBaoBacSi.setNoiDung(noiDungBacSi);
                thongBaoBacSi.setLoaiThongBao("DIEU_PHOI_LICH_KHAM");
                thongBaoBacSi.setDaDoc(false);

                thongBaoRepository.save(thongBaoBacSi);
            }
        }

        return danhSachLich.size();
    }
}