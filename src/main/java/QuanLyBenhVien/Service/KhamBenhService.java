package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.CTDonThuocRequest;
import QuanLyBenhVien.DTO.DonThuocRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Entity.CTDonThuoc;
import QuanLyBenhVien.Entity.ChiDinhYTe;
import QuanLyBenhVien.Entity.ChiTietKetQua;
import QuanLyBenhVien.Entity.DichVuYTe;
import QuanLyBenhVien.Entity.DonThuoc;
import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Entity.KetQuaDichVu;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Entity.Thuoc;

import QuanLyBenhVien.Repository.BacSiRepository;
import QuanLyBenhVien.Repository.CTDonThuocRepository;
import QuanLyBenhVien.Repository.ChiDinhYTeRepository;
import QuanLyBenhVien.Repository.ChiTietKetQuaRepository;
import QuanLyBenhVien.Repository.DichVuYTeRepository;
import QuanLyBenhVien.Repository.DonThuocRepository;
import QuanLyBenhVien.Repository.HoSoBenhAnRepository;
import QuanLyBenhVien.Repository.KetQuaDichVuRepository;
import QuanLyBenhVien.Repository.LichDangKyKhamRepository;
import QuanLyBenhVien.Repository.ThuocRepository;
import QuanLyBenhVien.Repository.TiepNhanBenhNhanRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class KhamBenhService {

    private final LichDangKyKhamRepository lichDangKyKhamRepository;
    private final TiepNhanBenhNhanRepository tiepNhanBenhNhanRepository;
    private final HoSoBenhAnRepository hoSoBenhAnRepository;

    private final DichVuYTeRepository dichVuYTeRepository;
    private final ChiDinhYTeRepository chiDinhYTeRepository;
    private final KetQuaDichVuRepository ketQuaDichVuRepository;
    private final ChiTietKetQuaRepository chiTietKetQuaRepository;

    // Repository đơn thuốc
    private final ThuocRepository thuocRepository;
    private final DonThuocRepository donThuocRepository;
    private final CTDonThuocRepository ctDonThuocRepository;
    private final BacSiRepository bacSiRepository;


    public KhamBenhService(
            LichDangKyKhamRepository lichDangKyKhamRepository,
            TiepNhanBenhNhanRepository tiepNhanBenhNhanRepository,
            HoSoBenhAnRepository hoSoBenhAnRepository,
            DichVuYTeRepository dichVuYTeRepository,
            ChiDinhYTeRepository chiDinhYTeRepository,
            KetQuaDichVuRepository ketQuaDichVuRepository,
            ChiTietKetQuaRepository chiTietKetQuaRepository,
            ThuocRepository thuocRepository,
            DonThuocRepository donThuocRepository,
            CTDonThuocRepository ctDonThuocRepository,
            BacSiRepository bacSiRepository
    ) {
        this.lichDangKyKhamRepository = lichDangKyKhamRepository;
        this.tiepNhanBenhNhanRepository = tiepNhanBenhNhanRepository;
        this.hoSoBenhAnRepository = hoSoBenhAnRepository;

        this.dichVuYTeRepository = dichVuYTeRepository;
        this.chiDinhYTeRepository = chiDinhYTeRepository;
        this.ketQuaDichVuRepository = ketQuaDichVuRepository;
        this.chiTietKetQuaRepository = chiTietKetQuaRepository;

        this.thuocRepository = thuocRepository;
        this.donThuocRepository = donThuocRepository;
        this.ctDonThuocRepository = ctDonThuocRepository;
        this.bacSiRepository = bacSiRepository;
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

        return hoSoBenhAnRepository.save(hoSo);
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

        if (!"DangKham".equals(lichKham.getTrangThai())) {
            throw new IllegalStateException(
                    "Lịch khám không ở trạng thái Đang khám."
            );
        }

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        kiemTraHoSoDangKham(hoSo);



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
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        // Kiểm tra hồ sơ đang khám
        kiemTraHoSoDangKham(hoSo);

        // Kiểm tra cận lâm sàng
        kiemTraCanLamSangDaHoanThanh(hoSo);

        if (!"DangKham".equals(lichKham.getTrangThai())) {
            throw new IllegalStateException(
                    "Lịch khám không ở trạng thái Đang khám."
            );
        }

        // Khóa đơn thuốc nếu có
        Optional<DonThuoc> optionalDonThuoc =
                donThuocRepository
                        .findByHoSoBenhAn_MaHoSoBenhAn(
                                hoSo.getMaHoSoBenhAn()
                        );

        if (optionalDonThuoc.isPresent()) {
            DonThuoc donThuoc = optionalDonThuoc.get();

            donThuoc.setTrangThai("HoanTat");
            donThuocRepository.save(donThuoc);
        }

        // Hoàn tất hồ sơ bệnh án
        hoSo.setTrangThai("HoanTat");

        // Cập nhật trạng thái bảng LichDangKyKham
        lichKham.setTrangThai("DaKham");
        lichDangKyKhamRepository.save(lichKham);

        // Cập nhật trạng thái bảng TiepNhanBenhNhan
        int soDong = tiepNhanBenhNhanRepository
                .capNhatTrangThaiTheoLich(
                        maLichKham,
                        "DaKham"
                );

        if (soDong == 0) {
            throw new IllegalStateException(
                    "Không tìm thấy thông tin tiếp nhận."
            );
        }

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
        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        // Cho phép tạo thêm chỉ định khi đang chờ CLS
        String trangThai = lichKham.getTrangThai();

        if (!"DangKham".equals(trangThai)
                && !"ChoCLS".equals(trangThai)) {
            throw new IllegalStateException(
                    "Chỉ có thể tạo chỉ định khi đang khám hoặc chờ CLS."
            );
        }

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        kiemTraHoSoDangKham(hoSo);

        DichVuYTe dichVu = dichVuYTeRepository
                .findById(maDichVu)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy dịch vụ y tế."
                        )
                );

        // Tạo chỉ định cận lâm sàng
        ChiDinhYTe chiDinh = new ChiDinhYTe();

        chiDinh.setHoSoBenhAn(hoSo);
        chiDinh.setDichVuYTe(dichVu);
        chiDinh.setMaPhong(maPhong);
        chiDinh.setNgayChiDinh(LocalDateTime.now());
        chiDinh.setLoaiChiDinh(dichVu.getLoaiDichVu());
        chiDinh.setTrangThai("ChoThucHien");

        ChiDinhYTe daLuu =
                chiDinhYTeRepository.save(chiDinh);

        // Cập nhật trạng thái lịch khám
        lichKham.setTrangThai("ChoCLS");
        lichDangKyKhamRepository.save(lichKham);

        // Cập nhật trạng thái tiếp nhận
        int soDong = tiepNhanBenhNhanRepository
                .capNhatTrangThaiTheoLich(
                        maLichKham,
                        "ChoCLS"
                );

        if (soDong == 0) {
            throw new IllegalStateException(
                    "Không tìm thấy thông tin tiếp nhận."
            );
        }

        return daLuu;
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
    @Transactional(readOnly = true)
    public List<ChiDinhYTe> layTatCaChiDinhCuaBacSi(
            Integer maBacSi
    ) {

        if (maBacSi == null) {
            throw new IllegalArgumentException(
                    "Mã bác sĩ không được để trống."
            );
        }

        return chiDinhYTeRepository
                .findByHoSoBenhAn_LichDangKyKham_BacSi_MaBacSiOrderByNgayChiDinhDesc(
                        maBacSi
                );
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
                .findByChiDinhYTe_MaChiDinh(
                        maChiDinh
                );
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

        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(
                        maBacSi,
                        maLichKham
                );

        if (!"DangKham".equals(lichKham.getTrangThai())) {
            throw new IllegalStateException(
                    "Chỉ có thể kê đơn khi bệnh nhân đang được khám."
            );
        }

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(maLichKham);

        kiemTraHoSoDangKham(hoSo);
        // Kiểm tra CLS trước khi tạo đơn thuốc.
        kiemTraCanLamSangDaHoanThanh(hoSo);

        if (donThuocRepository
                .findByHoSoBenhAn_MaHoSoBenhAn(
                        hoSo.getMaHoSoBenhAn()
                )
                .isPresent()) {

            throw new IllegalStateException(
                    "Hồ sơ bệnh án này đã có đơn thuốc."
            );
        }

        kiemTraDuLieuDonThuoc(request);

        BacSi bacSi =
                bacSiRepository
                        .findById(maBacSi)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Không tìm thấy bác sĩ."
                                )
                        );

        DonThuoc donThuoc = new DonThuoc();

        donThuoc.setHoSoBenhAn(hoSo);
        donThuoc.setBacSi(bacSi);
        donThuoc.setNgayKeThuoc(
                LocalDateTime.now()
        );

        String chanDoan =
                hoSo.getChanDoan();

        if (chanDoan == null ||
                chanDoan.isBlank()) {

            chanDoan =
                    request.getChanDoan();
        }

        donThuoc.setChanDoan(chanDoan);
        donThuoc.setGhiChu(
                request.getGhiChu()
        );

        // Đơn còn được sửa trong thời gian khám
        donThuoc.setTrangThai("DangKe");

        DonThuoc donDaLuu =
                donThuocRepository.save(
                        donThuoc
                );

        for (CTDonThuocRequest item :
                request.getDanhSachThuoc()) {

            luuChiTietDonThuoc(
                    donDaLuu,
                    item
            );
        }

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
                timHoSoTheoLichKham(
                        maLichKham
                );

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

        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(
                        maBacSi,
                        maLichKham
                );

        if (!"DangKham".equals(
                lichKham.getTrangThai())) {

            throw new IllegalStateException(
                    "Chỉ có thể sửa đơn thuốc khi bệnh nhân đang được khám."
            );
        }

        HoSoBenhAn hoSo =
                timHoSoTheoLichKham(
                        maLichKham
                );

        kiemTraHoSoDangKham(hoSo);
        kiemTraCanLamSangDaHoanThanh(hoSo);

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

        if (donThuoc.getBacSi() == null ||
                !maBacSi.equals(
                        donThuoc
                                .getBacSi()
                                .getMaBacSi()
                )) {

            throw new IllegalStateException(
                    "Bác sĩ không có quyền sửa đơn thuốc này."
            );
        }

        kiemTraDuLieuDonThuoc(request);

        String chanDoan =
                hoSo.getChanDoan();

        if (chanDoan == null ||
                chanDoan.isBlank()) {

            chanDoan =
                    request.getChanDoan();
        }

        donThuoc.setChanDoan(chanDoan);
        donThuoc.setGhiChu(
                request.getGhiChu()
        );

        donThuocRepository.save(
                donThuoc
        );

        // Xóa danh sách thuốc cũ
        ctDonThuocRepository
                .deleteByDonThuoc_MaDonThuoc(
                        donThuoc.getMaDonThuoc()
                );

        // Lưu danh sách mới
        for (CTDonThuocRequest item :
                request.getDanhSachThuoc()) {

            luuChiTietDonThuoc(
                    donThuoc,
                    item
            );
        }

        return donThuoc;
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

        // Sắp xếp:
        // - Ngày khám mới nhất trước
        // - Nếu cùng ngày thì giờ khám mới nhất trước
        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Order.desc("lichDangKyKham.ngayKham"),
                        Sort.Order.desc("lichDangKyKham.gioKham")
                )
        );

        // Chỉ lấy:
        // - Hồ sơ của đúng bệnh nhân
        // - Hồ sơ đã hoàn tất
        // - Không lấy lịch khám hiện tại
        // - Theo trang được yêu cầu
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
                        .findById(
                                request.getMaThuoc()
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Không tìm thấy thuốc có mã "
                                                + request.getMaThuoc()
                                                + "."
                                )
                        );

        if (!Boolean.TRUE.equals(
                thuoc.getTrangThai())) {

            throw new IllegalStateException(
                    "Thuốc "
                            + thuoc.getTenThuoc()
                            + " hiện không hoạt động."
            );
        }

        CTDonThuoc chiTiet =
                new CTDonThuoc();

        chiTiet.setDonThuoc(
                donThuoc
        );

        chiTiet.setThuoc(
                thuoc
        );

        // Lưu giá thuốc tại thời điểm kê
        chiTiet.setDonGiaBan(
                thuoc.getGia()
        );

        chiTiet.setSoLuong(
                request.getSoLuong()
        );

        chiTiet.setLieuDung(
                request.getLieuDung()
        );

        chiTiet.setThoiGianDung(
                request.getThoiGianDung()
        );

        chiTiet.setHuongDanSuDung(
                request.getHuongDanSuDung()
        );

        ctDonThuocRepository.save(
                chiTiet
        );
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
                .findByLichDangKyKham_MaLichKham(
                        maLichKham
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy hồ sơ bệnh án."
                        )
                );
    }


    private void kiemTraHoSoDangKham(
            HoSoBenhAn hoSo
    ) {

        if (!"DangKham".equals(
                hoSo.getTrangThai())) {

            throw new IllegalStateException(
                    "Hồ sơ bệnh án đã hoàn tất, không thể chỉnh sửa."
            );
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
            if (!"DaHoanThanh".equals(
                    chiDinh.getTrangThai()
            )) {
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
            if (!"DaHoanThanh".equals(
                    ketQua.getTrangThai()
            )) {
                throw new IllegalStateException(
                        "Kết quả cận lâm sàng của chỉ định "
                                + chiDinh.getMaChiDinh()
                                + " chưa được hoàn tất."
                );
            }
        }
    }
}