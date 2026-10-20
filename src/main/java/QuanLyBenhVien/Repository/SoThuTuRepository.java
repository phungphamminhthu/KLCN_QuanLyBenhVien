
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.SoThuTu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface SoThuTuRepository
        extends JpaRepository<SoThuTu, Integer> {

    Optional<SoThuTu>
    findTopByKhoa_MaKhoaAndNgayCapSoOrderBySoThuTuDesc(
            Integer maKhoa,
            LocalDate ngayCapSo
    );
}
