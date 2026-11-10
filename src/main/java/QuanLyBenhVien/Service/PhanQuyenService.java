package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.QuyenItemDTO;
import QuanLyBenhVien.Entity.CTQuyen;
import QuanLyBenhVien.Entity.Quyen;
import QuanLyBenhVien.Entity.VaiTro;
import QuanLyBenhVien.Repository.CTQuyenRepository;
import QuanLyBenhVien.Repository.QuyenRepository;
import QuanLyBenhVien.Repository.VaiTroRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class PhanQuyenService {

    private final VaiTroRepository vaiTroRepository;
    private final QuyenRepository quyenRepository;
    private final CTQuyenRepository ctQuyenRepository;

    public PhanQuyenService(
            VaiTroRepository vaiTroRepository,
            QuyenRepository quyenRepository,
            CTQuyenRepository ctQuyenRepository
    ) {
        this.vaiTroRepository = vaiTroRepository;
        this.quyenRepository = quyenRepository;
        this.ctQuyenRepository = ctQuyenRepository;
    }

    // Lấy danh sách vai trò
    public List<VaiTro> layDanhSachVaiTro() {
        return vaiTroRepository.findAll();
    }

    // Lấy danh sách tất cả quyền
    public List<Quyen> layDanhSachQuyen() {
        return quyenRepository.findAllByOrderByTenQuyenAsc();
    }

    // Lấy danh sách quyền kèm trạng thái phân quyền của vai trò
    public List<QuyenItemDTO> layQuyenTheoVaiTro(Integer maVaiTro) {

        VaiTro vaiTro = vaiTroRepository.findById(maVaiTro)
                .orElseThrow(() ->
                        new RuntimeException("Không tìm thấy vai trò"));

        List<Quyen> danhSachQuyen =
                quyenRepository.findAllByOrderByTenQuyenAsc();

        List<CTQuyen> danhSachCTQuyen =
                ctQuyenRepository.layTheoVaiTro(maVaiTro);

        Map<Integer, CTQuyen> mapQuyen = new HashMap<>();

        for (CTQuyen ct : danhSachCTQuyen) {
            mapQuyen.put(ct.getQuyen().getMaQuyen(), ct);
        }

        List<QuyenItemDTO> ketQua = new ArrayList<>();

        for (Quyen quyen : danhSachQuyen) {
            QuyenItemDTO dto = new QuyenItemDTO();

            dto.setMaQuyen(quyen.getMaQuyen());
            dto.setTenQuyen(quyen.getTenQuyen());
            dto.setNhomQuyen("Chức năng");
            dto.setMoTa(quyen.getMoTa());

            CTQuyen ct = mapQuyen.get(quyen.getMaQuyen());

            if (ct != null) {
                dto.setQuyenXem(Boolean.TRUE.equals(ct.getQuyenXem()));
                dto.setQuyenThem(Boolean.TRUE.equals(ct.getQuyenThem()));
                dto.setQuyenSua(Boolean.TRUE.equals(ct.getQuyenSua()));
                dto.setQuyenXoa(Boolean.TRUE.equals(ct.getQuyenXoa()));
            } else {
                dto.setQuyenXem(false);
                dto.setQuyenThem(false);
                dto.setQuyenSua(false);
                dto.setQuyenXoa(false);
            }

            ketQua.add(dto);
        }

        return ketQua;
    }

    // ======================================
    // Lưu phân quyền
    // =======================================

    @Transactional
    public void capNhatPhanQuyen(
            Integer maVaiTro,
            List<QuyenItemDTO> danhSachQuyen
    ) {
        if (maVaiTro == null) {
            throw new IllegalArgumentException(
                    "Mã vai trò không được để trống"
            );
        }

        VaiTro vaiTro = vaiTroRepository.findById(maVaiTro)
                .orElseThrow(() ->
                        new RuntimeException("Không tìm thấy vai trò: " + maVaiTro)
                );

        // Không cho chỉnh sửa quyền bệnh nhân trên màn hình phân quyền nhân viên.
        if ("BENHNHAN".equalsIgnoreCase(vaiTro.getTenVaiTro())) {
            throw new IllegalArgumentException(
                    "Không thể phân quyền bệnh nhân tại màn hình này"
            );
        }

        if (danhSachQuyen == null || danhSachQuyen.isEmpty()) {
            throw new IllegalArgumentException(
                    "Danh sách quyền không được để trống"
            );
        }

        // Lấy toàn bộ quyền hiện có trong hệ thống.
        List<Quyen> tatCaQuyen =
                quyenRepository.findAllByOrderByTenQuyenAsc();

        // Kiểm tra danh sách gửi lên có đầy đủ quyền không.
        if (danhSachQuyen.size() != tatCaQuyen.size()) {
            throw new IllegalArgumentException(
                    "Danh sách quyền không đầy đủ. Vui lòng tải lại trang."
            );
        }

        Set<Integer> maQuyenDaGui = new HashSet<>();

        for (QuyenItemDTO dto : danhSachQuyen) {
            if (dto == null || dto.getMaQuyen() == null) {
                throw new IllegalArgumentException(
                        "Thông tin quyền không hợp lệ"
                );
            }

            Integer maQuyen = dto.getMaQuyen();

            // Không cho gửi trùng mã quyền.
            if (!maQuyenDaGui.add(maQuyen)) {
                throw new IllegalArgumentException(
                        "Mã quyền bị trùng: " + maQuyen
                );
            }

            // Kiểm tra mã quyền có tồn tại.
            Quyen quyen = quyenRepository.findById(maQuyen)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Không tìm thấy quyền: " + maQuyen
                            )
                    );

            // Bảo vệ quyền truy cập màn hình phân quyền của Admin.
            if ("ADMIN".equalsIgnoreCase(vaiTro.getTenVaiTro())
                    && maQuyen == 43
                    && (!dto.isQuyenXem() || !dto.isQuyenSua())) {
                throw new IllegalArgumentException(
                        "Không thể bỏ quyền xem hoặc sửa chức năng Phân quyền của Admin"
                );
            }

            CTQuyen ct = ctQuyenRepository.timTheoVaiTroVaQuyen(
                    maVaiTro,
                    maQuyen
            ).orElseGet(CTQuyen::new);

            ct.setVaiTro(vaiTro);
            ct.setQuyen(quyen);
            ct.setQuyenXem(dto.isQuyenXem());
            ct.setQuyenThem(dto.isQuyenThem());
            ct.setQuyenSua(dto.isQuyenSua());
            ct.setQuyenXoa(dto.isQuyenXoa());

            ctQuyenRepository.save(ct);
        }
    }

}