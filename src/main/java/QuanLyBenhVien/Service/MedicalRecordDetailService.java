
package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.*;
import QuanLyBenhVien.Repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import QuanLyBenhVien.Repository.DonThuocRepository;


import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.*;

@Service
public class MedicalRecordDetailService {
    // bệnh nhân

    private final HoSoBenhAnRepository hoSoRepository;
    private final DonThuocRepository donThuocRepository;
    private final CTDonThuocRepository ctDonThuocRepository;
    private final ChiDinhYTeRepository chiDinhRepository;
    private final HoaDonRepository hoaDonRepository;
    private final CTHoaDonRepository ctHoaDonRepository;

    private final SecureRandom secureRandom = new SecureRandom();

    public MedicalRecordDetailService(
            HoSoBenhAnRepository hoSoRepository,
            DonThuocRepository donThuocRepository,
            CTDonThuocRepository ctDonThuocRepository,
            ChiDinhYTeRepository chiDinhRepository,
            HoaDonRepository hoaDonRepository,
            CTHoaDonRepository ctHoaDonRepository) {
        this.hoSoRepository = hoSoRepository;
        this.donThuocRepository = donThuocRepository;
        this.ctDonThuocRepository = ctDonThuocRepository;
        this.chiDinhRepository = chiDinhRepository;
        this.hoaDonRepository = hoaDonRepository;
        this.ctHoaDonRepository = ctHoaDonRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDetail(Integer maHoSoBenhAn) {

        HoSoBenhAn hs = hoSoRepository.findById(maHoSoBenhAn)
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "Không tìm thấy hồ sơ bệnh án"));

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("maHoSoBenhAn", hs.getMaHoSoBenhAn());
        result.put("trangThai", hs.getTrangThai());
        result.put("trieuChung", hs.getTrieuChung());
        result.put("chanDoan", hs.getChanDoan());
        result.put("ketLuan", hs.getKetLuan());
        result.put("huongDieuTri", hs.getHuongDieuTri());
        result.put("ngayTaiKham", hs.getNgayTaiKham());
        result.put("ghiChuTaiKham", hs.getGhiChuTaiKham());

        result.put("canNang", hs.getCanNang());
        result.put("chieuCao", hs.getChieuCao());
        result.put("huyetApTamThu", hs.getHuyetApTamThu());
        result.put("huyetApTamTruong", hs.getHuyetApTamTruong());

        LichDangKyKham lich = hs.getLichDangKyKham();

        if (lich != null) {
            result.put("maLichKham", lich.getMaLichKham());
            result.put("ngayKham", lich.getNgayKham());
            result.put("gioKham", lich.getGioKham());
            result.put("lyDoKham", lich.getLyDoKham());

            // Các getter này giả định Entity hiện tại có
            // getNguoiDung() trong BacSi và getTenKhoa() trong Khoa.
            String tenBacSi = null;
            if (lich.getBacSi() != null
                    && lich.getBacSi().getNguoiDung() != null) {
                tenBacSi =
                        lich.getBacSi().getNguoiDung().getHoTen();
            }

            result.put("tenBacSi", tenBacSi);
            result.put("tenKhoa",
                    lich.getKhoa() != null
                            ? lich.getKhoa().getTenKhoa()
                            : null);
        }

        // CHI DINH Y TE
        List<Map<String, Object>> chiDinhList = new ArrayList<>();
        BigDecimal tongChiDinh = BigDecimal.ZERO;

        for (ChiDinhYTe cd :
                chiDinhRepository.findByHoSoBenhAn_MaHoSoBenhAn(
                        maHoSoBenhAn)) {

            DichVuYTe dv = cd.getDichVuYTe();
            BigDecimal gia = dv != null && dv.getGia() != null
                    ? dv.getGia()
                    : BigDecimal.ZERO;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("maChiDinh", cd.getMaChiDinh());
            item.put("maPhieuChiDinh", cd.getMaPhieuChiDinh());
            item.put("tenDichVu",
                    dv != null ? dv.getTenDichVu() : null);
            item.put("loaiChiDinh", cd.getLoaiChiDinh());
            item.put("trangThai", cd.getTrangThai());
            item.put("ngayChiDinh", cd.getNgayChiDinh());
            item.put("donGia", gia);

            chiDinhList.add(item);

            // Tạm tính theo giá dịch vụ hiện tại.
            // Cần điều chỉnh theo quy tắc thu phí thực tế.
            tongChiDinh = tongChiDinh.add(gia);
        }

        result.put("chiDinh", chiDinhList);

        // DON THUOC
        List<Map<String, Object>> donThuocList = new ArrayList<>();
        BigDecimal tongTienThuoc = BigDecimal.ZERO;

        Optional<DonThuoc> donThuocOptional =
                donThuocRepository.findByHoSoBenhAn_MaHoSoBenhAn(
                        maHoSoBenhAn
                );

        if (donThuocOptional.isPresent()) {
            DonThuoc don = donThuocOptional.get();

            Map<String, Object> donMap = new LinkedHashMap<>();
            donMap.put("maDonThuoc", don.getMaDonThuoc());
            donMap.put("ngayKeThuoc", don.getNgayKeThuoc());
            donMap.put("chanDoan", don.getChanDoan());
            donMap.put("ghiChu", don.getGhiChu());
            donMap.put("trangThai", don.getTrangThai());

            List<Map<String, Object>> chiTietList = new ArrayList<>();
            BigDecimal tongTienDon = BigDecimal.ZERO;

            for (CTDonThuoc ct :
                    ctDonThuocRepository.findByDonThuoc_MaDonThuoc(
                            don.getMaDonThuoc())) {

                BigDecimal donGia = ct.getDonGiaBan() != null
                        ? ct.getDonGiaBan()
                        : BigDecimal.ZERO;

                int soLuong = ct.getSoLuong() != null
                        ? ct.getSoLuong()
                        : 0;

                BigDecimal thanhTien = donGia.multiply(
                        BigDecimal.valueOf(soLuong)
                );

                Map<String, Object> thuocMap = new LinkedHashMap<>();
                thuocMap.put("maCTDonThuoc", ct.getMaCTDonThuoc());
                thuocMap.put("tenThuoc",
                        ct.getThuoc() != null
                                ? ct.getThuoc().getTenThuoc()
                                : null);
                thuocMap.put("donViTinh",
                        ct.getThuoc() != null
                                ? ct.getThuoc().getDonViTinh()
                                : null);
                thuocMap.put("donGia", donGia);
                thuocMap.put("soLuong", soLuong);
                thuocMap.put("thanhTien", thanhTien);
                thuocMap.put("lieuDung", ct.getLieuDung());
                thuocMap.put("thoiGianDung", ct.getThoiGianDung());
                thuocMap.put("huongDanSuDung", ct.getHuongDanSuDung());

                chiTietList.add(thuocMap);
                tongTienDon = tongTienDon.add(thanhTien);
            }

            donMap.put("chiTiet", chiTietList);
            donMap.put("tongTien", tongTienDon);

            donThuocList.add(donMap);
            tongTienThuoc = tongTienThuoc.add(tongTienDon);
        }

        result.put("donThuoc", donThuocList);

        // CHI PHI
        Map<String, Object> chiPhi = new LinkedHashMap<>();

        BigDecimal phiKham = BigDecimal.ZERO;
        BigDecimal phiChiDinh = BigDecimal.ZERO;
        BigDecimal tienThuoc = BigDecimal.ZERO;
        BigDecimal tongHoaDon = BigDecimal.ZERO;

        List<Map<String, Object>> hoaDonList = new ArrayList<>();

        LichDangKyKham lichKham = hs.getLichDangKyKham();

        if (lichKham != null) {
            List<HoaDon> hoaDons =
                    hoaDonRepository.findByLichDangKyKham_MaLichKham(
                            lichKham.getMaLichKham()
                    );

            for (HoaDon hoaDon : hoaDons) {
                Map<String, Object> hoaDonMap = new LinkedHashMap<>();

                hoaDonMap.put("maHoaDon", hoaDon.getMaHoaDon());
                hoaDonMap.put("ngayLapHoaDon", hoaDon.getNgayLapHoaDon());
                hoaDonMap.put("trangThai", hoaDon.getTrangThai());
                hoaDonMap.put("loaiHoaDon", hoaDon.getLoaiHoaDon());
                hoaDonMap.put("tongTien", hoaDon.getTongTien());

                List<Map<String, Object>> chiTietHoaDonList =
                        new ArrayList<>();

                for (CTHoaDon ct :
                        ctHoaDonRepository.findByHoaDon_MaHoaDon(
                                hoaDon.getMaHoaDon())) {

                    BigDecimal thanhTien = ct.getThanhTien() != null
                            ? ct.getThanhTien()
                            : BigDecimal.ZERO;

                    Map<String, Object> item = new LinkedHashMap<>();

                    item.put("maCTHoaDon", ct.getMaCTHoaDon());
                    item.put("noiDung", ct.getNoiDung());
                    item.put("soLuong", ct.getSoLuong());
                    item.put("donGia", ct.getDonGia());
                    item.put("thanhTien", thanhTien);
                    item.put("maChiDinh", ct.getMaChiDinh());
                    item.put("maCTDonThuoc", ct.getMaCTDonThuoc());
                    item.put("maDichVu",
                            ct.getDichVuYTe() != null
                                    ? ct.getDichVuYTe().getMaDichVu()
                                    : null);

                    chiTietHoaDonList.add(item);

                    // Phân loại chi phí dựa vào khóa liên kết.
                    if (ct.getMaCTDonThuoc() != null) {
                        tienThuoc = tienThuoc.add(thanhTien);

                    } else if (ct.getMaChiDinh() != null) {
                        phiChiDinh = phiChiDinh.add(thanhTien);

                    } else if (ct.getDichVuYTe() != null) {
                        // Chỉ coi là phí khám khi dữ liệu xác định
                        // rõ đây là dịch vụ khám.
                        String loaiDichVu =
                                ct.getDichVuYTe().getLoaiDichVu();

                        if (loaiDichVu != null
                                && loaiDichVu.toLowerCase()
                                .contains("khám")) {
                            phiKham = phiKham.add(thanhTien);
                        } else {
                            // Dịch vụ chưa phân loại rõ:
                            // không tự ý cộng vào phí khám.
                            item.put("canXacDinhLoaiChiPhi", true);
                        }
                    }
                }

                hoaDonMap.put("chiTiet", chiTietHoaDonList);
                hoaDonList.add(hoaDonMap);

                if (hoaDon.getTongTien() != null) {
                    tongHoaDon = tongHoaDon.add(hoaDon.getTongTien());
                }
            }
        }

        chiPhi.put("phiKham", phiKham);
        chiPhi.put("phiChiDinh", phiChiDinh);
        chiPhi.put("tienThuoc", tienThuoc);

        // Tổng chi phí lấy từ tổng tiền hóa đơn,
        // tránh cộng trùng các khoản đã có trong hóa đơn.
        chiPhi.put("tongCong", tongHoaDon);

        result.put("hoaDon", hoaDonList);
        result.put("chiPhi", chiPhi);

        return result;
    }

    @Transactional
    public String getOrCreateQrToken(Integer maHoSoBenhAn) {
        HoSoBenhAn hs = hoSoRepository.findById(maHoSoBenhAn)
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "Không tìm thấy hồ sơ bệnh án"));

        if (hs.getQrToken() == null
                || hs.getQrToken().isBlank()) {

            byte[] bytes = new byte[32];
            secureRandom.nextBytes(bytes);

            String token = Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(bytes);

            hs.setQrToken(token);
            hoSoRepository.save(hs);
        }

        return hs.getQrToken();
    }
}
