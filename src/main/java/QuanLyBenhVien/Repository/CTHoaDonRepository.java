
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.CTHoaDon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CTHoaDonRepository
        extends JpaRepository<CTHoaDon, Integer> {

    // Tìm các chi tiết hóa đơn theo mã hóa đơn
    List<CTHoaDon> findByHoaDon_MaHoaDon(Integer maHoaDon);
}
