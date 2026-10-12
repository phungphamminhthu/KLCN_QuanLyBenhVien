package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.Khoa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KhoaRepository extends JpaRepository<Khoa, Integer> {

    List<Khoa> findAllByOrderByMaKhoaAsc();

    boolean existsByTenKhoaIgnoreCase(String tenKhoa);
}
