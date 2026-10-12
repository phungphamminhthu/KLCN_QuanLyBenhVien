package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.DanhMucTinTuc;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DanhMucTinTucRepository
        extends JpaRepository<DanhMucTinTuc, Integer> {

    boolean existsByTenDanhMucIgnoreCase(String tenDanhMuc);
}
