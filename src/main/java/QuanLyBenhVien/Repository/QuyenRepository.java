package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.Quyen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface QuyenRepository extends JpaRepository<Quyen, Integer> {

    @Query("SELECT q FROM Quyen q ORDER BY q.TenQuyen ASC")
    List<Quyen> findAllByOrderByTenQuyenAsc();
}