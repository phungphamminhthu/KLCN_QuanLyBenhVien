package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.Phong;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
public interface PhongRepository  extends JpaRepository<Phong, Integer>{

    List<Phong> findAllByOrderByMaPhongAsc();
}
