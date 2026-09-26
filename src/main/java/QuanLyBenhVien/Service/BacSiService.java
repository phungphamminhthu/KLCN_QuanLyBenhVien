package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.BacSi;
import QuanLyBenhVien.Repository.BacSiRepository;
import org.springframework.stereotype.Service;

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
}