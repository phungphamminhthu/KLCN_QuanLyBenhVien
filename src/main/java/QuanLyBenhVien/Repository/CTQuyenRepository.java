package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.CTQuyen;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CTQuyenRepository extends JpaRepository<CTQuyen, Integer> {

    List<CTQuyen> findByVaiTro_MaVaiTro(Integer MaVaiTro);

    Optional<CTQuyen> findByVaiTro_MaVaiTroAndQuyen_MaQuyen(
            Integer MaVaiTro,
            Integer MaQuyen
    );

    void deleteByVaiTro_MaVaiTro(Integer MaVaiTro);
}