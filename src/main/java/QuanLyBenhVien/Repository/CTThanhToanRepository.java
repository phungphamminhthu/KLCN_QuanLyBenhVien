package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.CTThanhToan;
import QuanLyBenhVien.Entity.CTThanhToanId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CTThanhToanRepository
        extends JpaRepository<CTThanhToan, CTThanhToanId> {

    List<CTThanhToan> findByMaThanhToan(Integer maThanhToan);
}