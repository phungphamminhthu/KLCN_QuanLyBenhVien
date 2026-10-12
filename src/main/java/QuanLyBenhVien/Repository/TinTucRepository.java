package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.TinTuc;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TinTucRepository extends JpaRepository<TinTuc, Integer> {
    List<TinTuc> findAllByOrderByNgayDangDesc();
}
