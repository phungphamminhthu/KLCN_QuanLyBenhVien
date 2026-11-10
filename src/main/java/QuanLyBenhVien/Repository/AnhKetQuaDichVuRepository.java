package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.AnhKetQuaDichVu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnhKetQuaDichVuRepository
        extends JpaRepository<AnhKetQuaDichVu, Integer> {

    List<AnhKetQuaDichVu>
    findByKetQuaDichVu_MaKetQuaOrderByNgayTaoAsc(Integer maKetQua);
}