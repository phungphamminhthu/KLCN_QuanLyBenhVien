package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.HoSoBenhAn;
import QuanLyBenhVien.Entity.LichDangKyKham;
import QuanLyBenhVien.Repository.HoSoBenhAnRepository;
import QuanLyBenhVien.Repository.LichDangKyKhamRepository;
import QuanLyBenhVien.Repository.TiepNhanBenhNhanRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class KhamBenhService {

    private final LichDangKyKhamRepository lichDangKyKhamRepository;
    private final TiepNhanBenhNhanRepository tiepNhanBenhNhanRepository;
    private final HoSoBenhAnRepository hoSoBenhAnRepository;

    public KhamBenhService(
            LichDangKyKhamRepository lichDangKyKhamRepository,
            TiepNhanBenhNhanRepository tiepNhanBenhNhanRepository,
            HoSoBenhAnRepository hoSoBenhAnRepository
    ) {
        this.lichDangKyKhamRepository = lichDangKyKhamRepository;
        this.tiepNhanBenhNhanRepository = tiepNhanBenhNhanRepository;
        this.hoSoBenhAnRepository = hoSoBenhAnRepository;
    }

    // =========================================================
    // 1. BẮT ĐẦU KHÁM
    // =========================================================
    @Transactional
    public HoSoBenhAn batDauKham(
            Integer maBacSi,
            Integer maLichKham
    ) {

        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        // Chỉ lịch ChoKham mới được bắt đầu khám
        if (!"ChoKham".equals(lichKham.getTrangThai())) {
            throw new IllegalStateException(
                    "Chỉ có thể bắt đầu khám khi lịch đang ở trạng thái ChoKham."
            );
        }

        // Bệnh nhân phải được bộ phận tiếp nhận xác nhận trước
        boolean daTiepNhan =
                tiepNhanBenhNhanRepository
                        .existsByLichDangKyKham_MaLichKhamAndTrangThai(
                                maLichKham,
                                "DaTiepNhan"
                        );

        if (!daTiepNhan) {
            throw new IllegalStateException(
                    "Bệnh nhân chưa được tiếp nhận."
            );
        }

        // Không cho tạo 2 hồ sơ bệnh án cho cùng một lịch khám
        if (hoSoBenhAnRepository
                .existsByLichDangKyKham_MaLichKham(maLichKham)) {

            throw new IllegalStateException(
                    "Lịch khám này đã có hồ sơ bệnh án."
            );
        }

        // Chuyển lịch khám sang Đang khám
        lichKham.setTrangThai("DangKham");
        lichDangKyKhamRepository.save(lichKham);

        // Tạo hồ sơ bệnh án
        HoSoBenhAn hoSo = new HoSoBenhAn();

        hoSo.setLichDangKyKham(lichKham);
        hoSo.setTrangThai("DangKham");

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

        // Kiểm tra lịch này thực sự thuộc bác sĩ
        timLichKhamCuaBacSi(maBacSi, maLichKham);

        HoSoBenhAn hoSo =
                hoSoBenhAnRepository
                        .findByLichDangKyKham_MaLichKham(maLichKham)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Không tìm thấy hồ sơ bệnh án."
                                )
                        );

        // Hồ sơ hoàn tất thì tuyệt đối không cho sửa
        if (!"DangKham".equals(hoSo.getTrangThai())) {
            throw new IllegalStateException(
                    "Hồ sơ bệnh án đã hoàn tất, không thể chỉnh sửa."
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

        LichDangKyKham lichKham =
                timLichKhamCuaBacSi(maBacSi, maLichKham);

        HoSoBenhAn hoSo =
                hoSoBenhAnRepository
                        .findByLichDangKyKham_MaLichKham(maLichKham)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Không tìm thấy hồ sơ bệnh án."
                                )
                        );

        // Chỉ hồ sơ đang khám mới được hoàn tất
        if (!"DangKham".equals(hoSo.getTrangThai())) {
            throw new IllegalStateException(
                    "Hồ sơ bệnh án không ở trạng thái Đang khám."
            );
        }

        // Lịch cũng phải đang khám
        if (!"DangKham".equals(lichKham.getTrangThai())) {
            throw new IllegalStateException(
                    "Lịch khám không ở trạng thái Đang khám."
            );
        }

        // Khóa hồ sơ
        hoSo.setTrangThai("HoanTat");

        // Đánh dấu lịch đã khám
        lichKham.setTrangThai("DaKham");

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

        // Không cho bác sĩ xem hồ sơ thông qua lịch của bác sĩ khác
        timLichKhamCuaBacSi(maBacSi, maLichKham);

        return hoSoBenhAnRepository
                .findByLichDangKyKham_MaLichKham(maLichKham)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Không tìm thấy hồ sơ bệnh án."
                        )
                );
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
}