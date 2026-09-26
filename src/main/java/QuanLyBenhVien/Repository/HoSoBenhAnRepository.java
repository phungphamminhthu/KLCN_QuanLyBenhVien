package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.HoSoBenhAn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HoSoBenhAnRepository
        extends JpaRepository<HoSoBenhAn, Integer> {

    // Tìm hồ sơ bệnh án theo lịch khám
    Optional<HoSoBenhAn> findByLichDangKyKham_MaLichKham(
            Integer maLichKham
    );

    // Kiểm tra lịch khám đã có hồ sơ bệnh án hay chưa
    boolean existsByLichDangKyKham_MaLichKham(
            Integer maLichKham
    );
}