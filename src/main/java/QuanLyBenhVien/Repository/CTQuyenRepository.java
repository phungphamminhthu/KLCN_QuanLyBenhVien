package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.CTQuyen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CTQuyenRepository extends JpaRepository<CTQuyen, Integer> {

    @Query("SELECT ct FROM CTQuyen ct WHERE ct.VaiTro.MaVaiTro = :maVaiTro")
    List<CTQuyen> layTheoVaiTro(@Param("maVaiTro") Integer maVaiTro);

    Optional<CTQuyen> findByVaiTro_MaVaiTroAndQuyen_MaQuyen(
            Integer MaVaiTro,
            Integer MaQuyen
    );

    void deleteByVaiTro_MaVaiTro(Integer MaVaiTro);
}