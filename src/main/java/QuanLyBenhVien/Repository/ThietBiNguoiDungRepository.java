package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.ThietBiNguoiDung;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ThietBiNguoiDungRepository
        extends JpaRepository<ThietBiNguoiDung, Integer> {

    Optional<ThietBiNguoiDung> findByFcmToken(String fcmToken);

    List<ThietBiNguoiDung>
    findByNguoiDung_MaNguoiDungAndTrangThaiTrue(
            Integer maNguoiDung
    );

    Optional<ThietBiNguoiDung>
    findByFcmTokenAndNguoiDung_MaNguoiDung(
            String fcmToken,
            Integer maNguoiDung
    );
}