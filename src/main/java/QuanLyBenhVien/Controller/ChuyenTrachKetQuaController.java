
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Entity.*;
import QuanLyBenhVien.Security.CustomUserDetails;

import QuanLyBenhVien.Service.CloudflareR2Service;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import QuanLyBenhVien.Repository.TiepNhanBenhNhanRepository;
import QuanLyBenhVien.Repository.HoSoBenhAnRepository;
import QuanLyBenhVien.Service.ThongBaoService;
import QuanLyBenhVien.Service.ThongBaoService;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chuyen-trach/ket-qua")
public class ChuyenTrachKetQuaController {

    @PersistenceContext
    private EntityManager em;
    @Autowired
    private ThongBaoService thongBaoService;

    private final TiepNhanBenhNhanRepository tiepNhanBenhNhanRepository;
    private final HoSoBenhAnRepository hoSoBenhAnRepository;
    //private final ThongBaoService thongBaoService;
    private final CloudflareR2Service cloudflareR2Service;

    public ChuyenTrachKetQuaController(
            TiepNhanBenhNhanRepository tiepNhanBenhNhanRepository,
            HoSoBenhAnRepository hoSoBenhAnRepository,
            ThongBaoService thongBaoService,
            CloudflareR2Service cloudflareR2Service
    ) {
        this.tiepNhanBenhNhanRepository = tiepNhanBenhNhanRepository;
        this.hoSoBenhAnRepository = hoSoBenhAnRepository;
        this.thongBaoService = thongBaoService;
        this.cloudflareR2Service = cloudflareR2Service;
    }

    private void checkRole(CustomUserDetails user) {
        if (user == null || user.getAuthorities().stream()
                .noneMatch(a -> "ROLE_CHUYENTRACH".equals(a.getAuthority()))) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Không có quyền truy cập");
        }
    }

    private LichDangKyKham getLich(Integer id) {
        LichDangKyKham lich = em.find(
                LichDangKyKham.class,
                id
        );

        if (lich == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lượt khám"
            );
        }

        return lich;
    }

    private List<ChiDinhYTe> getChiDinh(Integer maLich) {
        return em.createQuery("""
                SELECT c
                FROM ChiDinhYTe c
                JOIN FETCH c.dichVuYTe
                WHERE c.hoSoBenhAn.lichDangKyKham.maLichKham = :id
                ORDER BY c.ngayChiDinh ASC
                """, ChiDinhYTe.class)
                .setParameter("id", maLich)
                .getResultList();
    }

    private KetQuaDichVu getKetQua(Integer maChiDinh) {
        return em.createQuery("""
                SELECT k
                FROM KetQuaDichVu k
                WHERE k.chiDinhYTe.maChiDinh = :id
                """, KetQuaDichVu.class)
                .setParameter("id", maChiDinh)
                .getResultStream()
                .findFirst()
                .orElse(null);
    }

    @GetMapping("/{maLich}")
    @Transactional(readOnly = true)
    public Map<String, Object> thongTin(
            @PathVariable Integer maLich,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        checkRole(user);

        LichDangKyKham lich = getLich(maLich);
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("maLichKham", lich.getMaLichKham());
        result.put("maBenhNhan", lich.getBenhNhan().getMaBenhNhan());
        result.put("tenBenhNhan",
                lich.getBenhNhan().getHoTen());
        result.put("ngaySinh", lich.getBenhNhan().getNgaySinh());
        result.put("gioiTinh", lich.getBenhNhan().getGioiTinh());
        result.put("gioKham", lich.getGioKham());
        result.put("trangThai", lich.getTrangThai());
        result.put("bacSiPhuTrach",
                lich.getBacSi().getNguoiDung().getHoTen());

        List<Map<String, Object>> chiDinhs =
                getChiDinh(maLich).stream().map(c -> {
                    Map<String, Object> row = new LinkedHashMap<>();

                    row.put("maChiDinh", c.getMaChiDinh());
                    row.put("tenDichVu",
                            c.getDichVuYTe().getTenDichVu());

                    // Loại chỉ định từ database
                    row.put("loaiChiDinh", c.getLoaiChiDinh());

                    // Loại dịch vụ từ database
                    row.put("loaiDichVu",
                            c.getDichVuYTe().getLoaiDichVu());

                    // Nhóm xét nghiệm từ database
                    row.put("nhomXetNghiem",
                            c.getDichVuYTe().getNhomXetNghiem());

                    // Thông tin phòng và thời gian
                    row.put("maPhong", c.getMaPhong());
                    row.put("ngayChiDinh", c.getNgayChiDinh());
                    row.put("trangThai", c.getTrangThai());

                    KetQuaDichVu k = getKetQua(c.getMaChiDinh());

                    row.put("noiDungKetQua",
                            k == null ? "" : k.getNoiDungKetQua());
                    row.put("ketLuan",
                            k == null ? "" : k.getKetLuan());
                    row.put("trangThaiKetQua",
                            k == null ? null : k.getTrangThai());
                    row.put("fileURL",
                            k == null ? null : k.getFileURL());

                    return row;
                }).toList();

        result.put("chiDinh", chiDinhs);
        return result;
    }

    // =======================================
    // luu ket qua
    // =======================================
    @PostMapping("/{maLich}/chi-dinh/{maChiDinh}/luu")
    @Transactional
    public Map<String, String> luuKetQua(
            @PathVariable Integer maLich,
            @PathVariable Integer maChiDinh,
            @RequestBody Map<String, String> input,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        checkRole(user);

        getLich(maLich);

        ChiDinhYTe chiDinh = getChiDinh(maLich).stream()
                .filter(c -> maChiDinh.equals(c.getMaChiDinh()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Chỉ định không thuộc lượt khám này"
                ));

        if (!"DangThucHien".equals(chiDinh.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ định chưa được bắt đầu thực hiện CLS"
            );
        }

        String noiDung = input.getOrDefault(
                "noiDungKetQua", ""
        ).trim();

        String ketLuan = input.getOrDefault(
                "ketLuan", ""
        ).trim();

        if (noiDung.isBlank() || ketLuan.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Phải nhập nội dung kết quả và kết luận"
            );
        }

        if (noiDung.length() > 20000 || ketLuan.length() > 20000) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Nội dung vượt giới hạn"
            );
        }

        KetQuaDichVu ketQua = getKetQua(maChiDinh);

        if (ketQua == null) {
            ketQua = new KetQuaDichVu();
            ketQua.setChiDinhYTe(chiDinh);
            em.persist(ketQua);
        } else if ("DaHoanThanh".equals(ketQua.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Kết quả đã hoàn thành, không thể sửa tại đây"
            );
        }

        ketQua.setNoiDungKetQua(noiDung);
        ketQua.setKetLuan(ketLuan);
        ketQua.setTrangThai("DangThucHien");

        em.flush();

        return Map.of(
                "message",
                "Đã lưu kết quả."
        );
    }

    // ====================================
    // hoan tat
    // ====================================
    @PostMapping("/{maLich}/hoan-tat")
    @Transactional
    public Map<String, String> hoanTat(
            @PathVariable Integer maLich,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        checkRole(user);

        LichDangKyKham lich = getLich(maLich);

        List<ChiDinhYTe> danhSach = getChiDinh(maLich);

        // Chỉ lấy những chỉ định đang được nhân viên thực hiện.
        List<ChiDinhYTe> danhSachDangThucHien = danhSach.stream()
                .filter(c -> "DangThucHien".equals(c.getTrangThai()))
                .toList();

        if (danhSachDangThucHien.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Không có chỉ định CLS nào đang thực hiện."
            );
        }

        // Kiểm tra kết quả của từng chỉ định đang thực hiện.
        for (ChiDinhYTe chiDinh : danhSachDangThucHien) {
            KetQuaDichVu ketQua = getKetQua(
                    chiDinh.getMaChiDinh()
            );

            if (ketQua == null
                    || ketQua.getNoiDungKetQua() == null
                    || ketQua.getNoiDungKetQua().isBlank()
                    || ketQua.getKetLuan() == null
                    || ketQua.getKetLuan().isBlank()) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Còn chỉ định chưa nhập đầy đủ kết quả: "
                                + chiDinh.getDichVuYTe().getTenDichVu()
                );
            }

            ketQua.setTrangThai("DaHoanThanh");
            ketQua.setNgayCoKetQua(
                    LocalDateTime.now(
                            ZoneId.of("Asia/Ho_Chi_Minh")
                    )
            );

            chiDinh.setTrangThai("DaHoanThanh");
        }

        em.flush();

        // Kiểm tra còn chỉ định nào chưa được xử lý hay không.
        // Không thay đổi những chỉ định chưa thanh toán hoặc chưa bắt đầu.
        boolean conChiDinhChuaXuLy = danhSach.stream()
                .anyMatch(c ->
                        List.of(
                                "ChoThanhToan",
                                "ChoThucHien",
                                "DangThucHien"
                        ).contains(c.getTrangThai())
                );

        // Chỉ chuyển hồ sơ về bác sĩ khi tất cả chỉ định CLS
        // của lượt khám đã được hoàn thành.
        HoSoBenhAn hoSo = em.createQuery("""
            SELECT h
            FROM HoSoBenhAn h
            WHERE h.lichDangKyKham.maLichKham = :id
            """, HoSoBenhAn.class)
                .setParameter("id", maLich)
                .getResultStream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy hồ sơ bệnh án"
                ));

        if (!conChiDinhChuaXuLy) {
            if ("ChoCLS".equals(hoSo.getTrangThai())) {
                hoSo.setTrangThai("DangKham");
                hoSoBenhAnRepository.save(hoSo);
            }
        }

        em.flush();

        // Thông tin dịch vụ vừa hoàn thành.
        String tenDichVu = danhSachDangThucHien.stream()
                .map(cd -> cd.getDichVuYTe().getTenDichVu())
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.joining(", "));

        BenhNhan benhNhan = lich.getBenhNhan();

        // Gửi thông báo cho bệnh nhân.
        Integer maNguoiDung = benhNhan.getNguoiDung()
                .getMaNguoiDung();

        String noiDung = "Kết quả cận lâm sàng của bạn đã được cập nhật"
                + (tenDichVu.isBlank() ? "." : ": " + tenDichVu + ".")
                + " Vui lòng kiểm tra.";

        thongBaoService.taoThongBaoVaGuiRealtime(
                maNguoiDung,
                benhNhan,
                "Đã có kết quả cận lâm sàng",
                noiDung,
                "KET_QUA_CLS"
        );

        // Gửi thông báo cho bác sĩ phụ trách.
        if (lich.getBacSi() != null
                && lich.getBacSi().getNguoiDung() != null) {

            Integer maNguoiDungBacSi = lich.getBacSi()
                    .getNguoiDung()
                    .getMaNguoiDung();

            String noiDungBacSi =
                    "Bệnh nhân " + benhNhan.getHoTen()
                            + " đã có kết quả cận lâm sàng: "
                            + (tenDichVu.isBlank() ? "CLS" : tenDichVu)
                            + ". Vui lòng kiểm tra hồ sơ bệnh án.";

            thongBaoService.taoThongBaoVaGuiRealtime(
                    maNguoiDungBacSi,
                    benhNhan,
                    "Kết quả cận lâm sàng đã có",
                    noiDungBacSi,
                    "KET_QUA_CLS"
            );
        }

        em.flush();

        return Map.of(
                "message",
                conChiDinhChuaXuLy
                        ? "Đã hoàn thành các chỉ định CLS đang thực hiện. Vẫn còn chỉ định chưa được xử lý."
                        : "Đã hoàn thành CLS. Hồ sơ bệnh án đã được chuyển về bác sĩ.",
                "trangThai",
                conChiDinhChuaXuLy ? "ChoCLS" : "DangKham"
        );
    }

    // ===================================
    //
     // ==================================
    @GetMapping("/{maLich}/chi-dinh/{maChiDinh}/files")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getFilesKetQua(
            @PathVariable Integer maLich,
            @PathVariable Integer maChiDinh,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        checkRole(user);

        getLich(maLich);

        ChiDinhYTe chiDinh = getChiDinh(maLich).stream()
                .filter(c -> maChiDinh.equals(c.getMaChiDinh()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Chỉ định không thuộc lượt khám này"
                ));

        KetQuaDichVu ketQua = getKetQua(maChiDinh);

        if (ketQua == null) {
            return ResponseEntity.ok(List.of());
        }

        List<AnhKetQuaDichVu> images = em.createQuery(
                        "SELECT a FROM AnhKetQuaDichVu a " +
                                "WHERE a.ketQuaDichVu = :ketQua " +
                                "ORDER BY a.ngayTao DESC",
                        AnhKetQuaDichVu.class
                )
                .setParameter("ketQua", ketQua)
                .getResultList();

        List<Map<String, Object>> result = images.stream()
                .map(anh -> Map.<String, Object>of(
                        "maAnh", anh.getMaAnh(),
                        "fileURL", anh.getFileURL(),
                        "tenFile", anh.getTenFile() == null
                                ? ""
                                : anh.getTenFile()
                ))
                .toList();

        return ResponseEntity.ok(result);
    }

    // ====================================
    //
     // ===================================
    @GetMapping("/file")
    public ResponseEntity<InputStreamResource> xemFileKetQua(
            @RequestParam("key") String fileKey,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        checkRole(user);

        if (fileKey == null
                || !fileKey.startsWith("images/")
                || fileKey.contains("..")) {
            return ResponseEntity.badRequest().build();
        }

        return cloudflareR2Service.getImage(fileKey);
    }

    // ======================================
    // upload file
    // ======================================
    @PostMapping(
            value = "/{maLich}/chi-dinh/{maChiDinh}/files",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Transactional
    public ResponseEntity<?> uploadFilesKetQua(
            @PathVariable Integer maLich,
            @PathVariable Integer maChiDinh,
            @RequestParam("files") List<MultipartFile> files,
            @AuthenticationPrincipal CustomUserDetails user
    ) {
        checkRole(user);

        if (files == null || files.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vui lòng chọn ít nhất một ảnh"
            );
        }

        if (files.size() > 10) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chỉ được tải tối đa 10 ảnh mỗi lần"
            );
        }

        getLich(maLich);

        ChiDinhYTe chiDinh = getChiDinh(maLich).stream()
                .filter(c -> maChiDinh.equals(c.getMaChiDinh()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Chỉ định không thuộc lượt khám này"
                ));

        if (!"DangThucHien".equals(chiDinh.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Chỉ định chưa được bắt đầu thực hiện CLS"
            );
        }

        KetQuaDichVu ketQua = getKetQua(maChiDinh);

        if (ketQua == null) {
            ketQua = new KetQuaDichVu();
            ketQua.setChiDinhYTe(chiDinh);
            ketQua.setTrangThai("DangThucHien");
            ketQua.setNgayCoKetQua(
                    LocalDateTime.now(
                            ZoneId.of("Asia/Ho_Chi_Minh")
                    )
            );

            em.persist(ketQua);
            em.flush();
        }

        if ("DaHoanThanh".equals(ketQua.getTrangThai())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Kết quả đã hoàn thành, không thể thêm ảnh"
            );
        }

        List<Map<String, Object>> uploadedImages = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            String fileKey = cloudflareR2Service.uploadImage(file);

            AnhKetQuaDichVu anh = new AnhKetQuaDichVu();
            anh.setKetQuaDichVu(ketQua);
            anh.setFileURL(fileKey);
            anh.setTenFile(file.getOriginalFilename());
            anh.setNgayTao(
                    LocalDateTime.now(
                            ZoneId.of("Asia/Ho_Chi_Minh")
                    )
            );

            em.persist(anh);

            uploadedImages.add(Map.of(
                    "fileURL", fileKey,
                    "tenFile", file.getOriginalFilename() == null
                            ? ""
                            : file.getOriginalFilename()
            ));
        }

        em.flush();

        return ResponseEntity.ok(Map.of(
                "message", "Tải ảnh kết quả thành công",
                "images", uploadedImages
        ));
    }
}
