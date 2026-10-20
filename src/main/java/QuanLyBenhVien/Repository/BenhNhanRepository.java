
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.BenhNhan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BenhNhanRepository
        extends JpaRepository<BenhNhan, Integer> {

    Optional<BenhNhan> findByNguoiDung_MaNguoiDung(Integer maNguoiDung);
}
