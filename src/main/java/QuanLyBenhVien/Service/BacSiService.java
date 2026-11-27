package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Repository.BacSiRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class BacSiService {

    private final BacSiRepository bacSiRepository;

    public BacSiService(BacSiRepository bacSiRepository) {
        this.bacSiRepository = bacSiRepository;
    }

    // =========================================================
    // TÌM BÁC SĨ THEO MÃ NGƯỜI DÙNG
    // =========================================================
    public Optional<BacSi> timBacSiTheoMaNguoiDung(Integer maNguoiDung) {
        return bacSiRepository.timTheoMaNguoiDung(maNguoiDung);
    }

    // =========================================================
    // LẤY DANH SÁCH BÁC SĨ HOẠT ĐỘNG
    // =========================================================
    @Transactional(readOnly = true)
    public List<BacSi> layDanhSachBacSiHoatDong() {
        return bacSiRepository.findBacSiHoatDong();
    }
}