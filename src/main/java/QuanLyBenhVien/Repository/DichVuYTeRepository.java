package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.DichVuYTe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DichVuYTeRepository
        extends JpaRepository<DichVuYTe, Integer> {

    List<DichVuYTe> findAllByOrderByTenDichVuAsc();
}