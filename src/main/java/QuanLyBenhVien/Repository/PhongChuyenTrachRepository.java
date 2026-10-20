package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.PhongChuyenTrach;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PhongChuyenTrachRepository
        extends JpaRepository<PhongChuyenTrach, Integer> {

    List<PhongChuyenTrach>
    findByKhoa_MaKhoaAndTrangThaiTrueOrderByTenPhongAsc(
            Integer maKhoa
    );

    List<PhongChuyenTrach>
    findByKhoa_MaKhoaAndTrangThaiTrue(Integer maKhoa);
}