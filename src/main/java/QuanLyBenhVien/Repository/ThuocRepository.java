
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.Thuoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ThuocRepository extends JpaRepository<Thuoc, Integer> {

    // Phục vụ chức năng quản lý thuốc của Dược sĩ
    List<Thuoc> findAllByOrderByMaThuocAsc();

    // Phục vụ chức năng kê đơn: chỉ lấy thuốc đang hoạt động
    List<Thuoc> findByTrangThaiTrueOrderByTenThuocAsc();
}
