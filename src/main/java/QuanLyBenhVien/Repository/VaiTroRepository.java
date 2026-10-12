package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.VaiTro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VaiTroRepository extends JpaRepository<VaiTro, Integer> {

    @Query("SELECT v FROM VaiTro v WHERE UPPER(v.TenVaiTro) = UPPER(:tenVaiTro)")
    Optional<VaiTro> findByTenVaiTroIgnoreCase(
            @Param("tenVaiTro") String tenVaiTro);
}