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

    @Query("""
        SELECT ct
        FROM CTQuyen ct
        WHERE ct.VaiTro.MaVaiTro = :maVaiTro
    """)
    List<CTQuyen> layTheoVaiTro(
            @Param("maVaiTro") Integer maVaiTro
    );

    @Query("""
        SELECT ct
        FROM CTQuyen ct
        WHERE ct.VaiTro.MaVaiTro = :maVaiTro
          AND ct.Quyen.MaQuyen = :maQuyen
    """)
    Optional<CTQuyen> timTheoVaiTroVaQuyen(
            @Param("maVaiTro") Integer maVaiTro,
            @Param("maQuyen") Integer maQuyen
    );

    @Query("""
        DELETE FROM CTQuyen ct
        WHERE ct.VaiTro.MaVaiTro = :maVaiTro
    """)
    @org.springframework.data.jpa.repository.Modifying
    void xoaTheoVaiTro(
            @Param("maVaiTro") Integer maVaiTro
    );
}