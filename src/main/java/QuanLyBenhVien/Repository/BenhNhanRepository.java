package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.BenhNhan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BenhNhanRepository
        extends JpaRepository<BenhNhan, Integer> {

    // Lấy tất cả hồ sơ thuộc một tài khoản
    List<BenhNhan> findByNguoiDung_MaNguoiDung(Integer maNguoiDung);

    // Lấy một hồ sơ cụ thể, đồng thời xác minh hồ sơ thuộc tài khoản
    Optional<BenhNhan> findByMaBenhNhanAndNguoiDung_MaNguoiDung(
            Integer maBenhNhan,
            Integer maNguoiDung
    );

    // Lấy hồ sơ mặc định của tài khoản
    Optional<BenhNhan> findByNguoiDung_MaNguoiDungAndLaHoSoMacDinhTrue(
            Integer maNguoiDung
    );
}