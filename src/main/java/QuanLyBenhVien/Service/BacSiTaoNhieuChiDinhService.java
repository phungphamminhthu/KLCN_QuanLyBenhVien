
package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.ChiDinhYTe;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class BacSiTaoNhieuChiDinhService {

    private final KhamBenhService khamBenhService;

    public BacSiTaoNhieuChiDinhService(
            KhamBenhService khamBenhService
    ) {
        this.khamBenhService = khamBenhService;
    }

    // ============================================
    // TẠO NHIỀU CHỈ ĐỊNH CẬN LÂM SÀNG
    // ============================================

    @Transactional
    public List<ChiDinhYTe> taoNhieu(
            Integer maBacSi,
            Integer maLichKham,
            List<Integer> danhSachMaDichVu
    ) {

        if (
                danhSachMaDichVu == null ||
                        danhSachMaDichVu.isEmpty()
        ) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn ít nhất một dịch vụ."
            );
        }

        List<ChiDinhYTe> ketQua = new ArrayList<>();

        for (Integer maDichVu : danhSachMaDichVu) {

            // Tận dụng chức năng tạo chỉ định đã có.
            // Không cần viết lại logic nghiệp vụ.
            ChiDinhYTe chiDinh =
                    khamBenhService.taoChiDinh(
                            maBacSi,
                            maLichKham,
                            maDichVu,
                            null
                    );

            ketQua.add(chiDinh);
        }

        return ketQua;
    }
}
