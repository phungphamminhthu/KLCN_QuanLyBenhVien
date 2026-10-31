package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.Quyen;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuyenRepository extends JpaRepository<Quyen, Integer> {

    List<Quyen> findAllByOrderByTenQuyenAsc();
}