package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.PhongChuyenTrach;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PhongChuyenTrachRepository
        extends JpaRepository<PhongChuyenTrach, Integer> {

    List<PhongChuyenTrach>
    findByKhoa_MaKhoaAndTrangThaiTrueOrderByTenPhongAsc(
            Integer maKhoa
    );

    List<PhongChuyenTrach>
    findByKhoa_MaKhoaAndTrangThaiTrue(Integer maKhoa);

    // Tìm phòng đang hoạt động theo loại phòng.
    Optional<PhongChuyenTrach>
    findFirstByLoaiPhongAndTrangThaiTrueOrderByMaPhongAsc(
            String loaiPhong
    );

    // Tìm phòng theo loại phòng và tên phòng.
    Optional<PhongChuyenTrach>
    findFirstByLoaiPhongAndTenPhongContainingIgnoreCaseAndTrangThaiTrueOrderByMaPhongAsc(
            String loaiPhong,
            String tenPhong
    );
}