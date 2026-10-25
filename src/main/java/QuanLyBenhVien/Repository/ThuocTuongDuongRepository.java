package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.ThuocTuongDuong;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ThuocTuongDuongRepository
        extends JpaRepository<ThuocTuongDuong, Integer> {

    // Tìm kiếm theo tên thuốc gốc hoặc tên thuốc thay thế
    Page<ThuocTuongDuong>
    findByThuoc_TenThuocContainingIgnoreCaseOrThuocThayThe_TenThuocContainingIgnoreCase(
            String tenThuoc,
            String tenThuocThayThe,
            Pageable pageable
    );

    // Kiểm tra thuốc có đang được sử dụng
    // trong danh sách thuốc tương đương hay không
    boolean existsByThuoc_MaThuocOrThuocThayThe_MaThuoc(
            Integer maThuoc,
            Integer maThuocThayThe
    );

    List<ThuocTuongDuong>
    findByThuoc_MaThuocAndTrangThai(
            Integer maThuoc,
            String trangThai
    );
}