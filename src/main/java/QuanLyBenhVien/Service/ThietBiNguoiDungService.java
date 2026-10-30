package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.ThietBiNguoiDung;
import QuanLyBenhVien.Repository.NguoiDungRepository;
import QuanLyBenhVien.Repository.ThietBiNguoiDungRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ThietBiNguoiDungService {

    private final ThietBiNguoiDungRepository thietBiRepository;
    private final NguoiDungRepository nguoiDungRepository;

    public ThietBiNguoiDungService(
            ThietBiNguoiDungRepository thietBiRepository,
            NguoiDungRepository nguoiDungRepository
    ) {
        this.thietBiRepository = thietBiRepository;
        this.nguoiDungRepository = nguoiDungRepository;
    }

    @Transactional
    public void dangKyThietBi(
            String tenDangNhap,
            String fcmToken,
            String loaiThietBi
    ) {
        if (fcmToken == null || fcmToken.isBlank()) {
            throw new IllegalArgumentException(
                    "FCM Token không được để trống."
            );
        }

        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhap(tenDangNhap)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy người dùng."
                ));

        if (!Boolean.TRUE.equals(nguoiDung.getTrangThai())) {
            throw new IllegalArgumentException(
                    "Tài khoản hiện không hoạt động."
            );
        }

        ThietBiNguoiDung thietBi = thietBiRepository
                .findByFcmToken(fcmToken)
                .orElseGet(ThietBiNguoiDung::new);

        thietBi.setNguoiDung(nguoiDung);
        thietBi.setFcmToken(fcmToken);
        thietBi.setLoaiThietBi(loaiThietBi);
        thietBi.setTrangThai(true);

        thietBiRepository.save(thietBi);
    }

    @Transactional
    public void huyDangKyThietBi(
            String tenDangNhap,
            String fcmToken
    ) {
        NguoiDung nguoiDung = nguoiDungRepository
                .findByTenDangNhap(tenDangNhap)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy người dùng."
                ));

        thietBiRepository
                .findByFcmTokenAndNguoiDung_MaNguoiDung(
                        fcmToken,
                        nguoiDung.getMaNguoiDung()
                )
                .ifPresent(thietBi -> {
                    thietBi.setTrangThai(false);
                    thietBiRepository.save(thietBi);
                });
    }
}