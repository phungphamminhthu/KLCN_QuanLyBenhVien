package QuanLyBenhVien.Repository;
import QuanLyBenhVien.Entity.Thuoc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ThuocRepository extends JpaRepository<Thuoc, Integer>{
    List<Thuoc> findAllByOrderByMaThuocAsc();
}
