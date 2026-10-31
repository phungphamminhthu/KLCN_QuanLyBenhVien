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

    private final VaiTroRepository VaiTroRepository;
    private final QuyenRepository QuyenRepository;
    private final CTQuyenRepository CTQuyenRepository;

    public PhanQuyenService(
            VaiTroRepository VaiTroRepository,
            QuyenRepository QuyenRepository,
            CTQuyenRepository CTQuyenRepository
    ) {
        this.VaiTroRepository = VaiTroRepository;
        this.QuyenRepository = QuyenRepository;
        this.CTQuyenRepository = CTQuyenRepository;
    }

    public List<VaiTro> layDanhSachVaiTro() {
        return VaiTroRepository.findAll();
    }

    public List<QuyenItemDTO> layQuyenTheoVaiTro(Integer MaVaiTro) {
        VaiTro VaiTro = VaiTroRepository.findById(MaVaiTro)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò"));

        List<Quyen> DanhSachQuyen =
                QuyenRepository.findAllByOrderByTenQuyenAsc();

        List<CTQuyen> DanhSachCTQuyen =
                CTQuyenRepository.findByVaiTro_MaVaiTro(MaVaiTro);

        Map<Integer, CTQuyen> MapQuyen = new HashMap<>();

        for (CTQuyen CT : DanhSachCTQuyen) {
            MapQuyen.put(CT.getQuyen().getMaQuyen(), CT);
        }

        List<QuyenItemDTO> KetQua = new ArrayList<>();

        for (Quyen Quyen : DanhSachQuyen) {
            QuyenItemDTO DTO = new QuyenItemDTO();

            DTO.setMaQuyen(Quyen.getMaQuyen());
            DTO.setTenQuyen(Quyen.getTenQuyen());
            DTO.setNhomQuyen("Chức năng");
            DTO.setMoTa(Quyen.getMoTa());

            CTQuyen CT = MapQuyen.get(Quyen.getMaQuyen());

            if (CT != null) {
                DTO.setQuyenXem(Boolean.TRUE.equals(CT.getQuyenXem()));
                DTO.setQuyenThem(Boolean.TRUE.equals(CT.getQuyenThem()));
                DTO.setQuyenSua(Boolean.TRUE.equals(CT.getQuyenSua()));
                DTO.setQuyenXoa(Boolean.TRUE.equals(CT.getQuyenXoa()));
            }

            KetQua.add(DTO);
        }

        return KetQua;
    }

    @Transactional
    public void capNhatPhanQuyen(
            Integer MaVaiTro,
            List<QuyenItemDTO> DanhSachQuyen
    ) {
        VaiTro VaiTro = VaiTroRepository.findById(MaVaiTro)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò"));

        for (QuyenItemDTO DTO : DanhSachQuyen) {
            Quyen Quyen = QuyenRepository.findById(DTO.getMaQuyen())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy chức năng"));

            CTQuyen CT = CTQuyenRepository
                    .findByVaiTro_MaVaiTroAndQuyen_MaQuyen(
                            MaVaiTro,
                            DTO.getMaQuyen()
                    )
                    .orElseGet(CTQuyen::new);

            CT.setVaiTro(VaiTro);
            CT.setQuyen(Quyen);
            CT.setQuyenXem(DTO.isQuyenXem());
            CT.setQuyenThem(DTO.isQuyenThem());
            CT.setQuyenSua(DTO.isQuyenSua());
            CT.setQuyenXoa(DTO.isQuyenXoa());

            CTQuyenRepository.save(CT);
        }
    }
}