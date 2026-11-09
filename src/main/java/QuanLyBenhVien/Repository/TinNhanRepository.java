
package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.TinNhan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TinNhanRepository
        extends JpaRepository<TinNhan, Integer> {

    List<TinNhan>
    findByPhienTroChuyen_MaPhienOrderByThoiGianTaoAsc(
            Integer maPhien
    );

    // Lấy tin nhắn đầu tiên của người dùng trong phiên
    Optional<TinNhan>
    findFirstByPhienTroChuyen_MaPhienAndNguoiGuiOrderByThoiGianTaoAsc(
            Integer maPhien,
            String nguoiGui
    );
}
