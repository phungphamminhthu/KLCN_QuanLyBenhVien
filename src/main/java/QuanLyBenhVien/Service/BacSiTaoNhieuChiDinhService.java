package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.TaoDotChiDinhCLSRequest;
import QuanLyBenhVien.Entity.ChiDinhYTe;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BacSiTaoNhieuChiDinhService {

    private final KhamBenhService khamBenhService;

    public BacSiTaoNhieuChiDinhService(
            KhamBenhService khamBenhService
    ) {
        this.khamBenhService = khamBenhService;
    }

    @Transactional
    public List<ChiDinhYTe> taoNhieu(
            Integer maBacSi,
            Integer maLichKham,
            Integer maPhong,
            List<Integer> danhSachMaDichVu
    ) {
        if (danhSachMaDichVu == null
                || danhSachMaDichVu.isEmpty()) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn ít nhất một dịch vụ."
            );
        }

        TaoDotChiDinhCLSRequest request =
                new TaoDotChiDinhCLSRequest();

        request.setMaLichKham(maLichKham);
        request.setMaPhong(maPhong);
        request.setMaDichVuList(danhSachMaDichVu);

        return khamBenhService.taoDotChiDinhCLS(
                maBacSi,
                request
        );
    }
}