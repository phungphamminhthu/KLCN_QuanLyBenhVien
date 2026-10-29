
package QuanLyBenhVien.Controller;

import QuanLyBenhVien.Service.TiepNhanPhanCongService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/tiepnhan/chi-tiet-lich-su")
public class TiepNhanChiTietLichSuController {

    private final JdbcTemplate jdbc;
    private final TiepNhanPhanCongService phanCong;

    public TiepNhanChiTietLichSuController(
            JdbcTemplate jdbc,
            TiepNhanPhanCongService phanCong
    ) {
        this.jdbc = jdbc;
        this.phanCong = phanCong;
    }

    // =====================================================
    // API XEM TOÀN BỘ CHI TIẾT MỘT LƯỢT KHÁM
    // Không chỉnh sửa dữ liệu.
    // =====================================================

    @GetMapping("/{maLichKham}")
    @Transactional(readOnly = true)
    public Map<String, Object> chiTiet(
            @PathVariable Integer maLichKham,
            Authentication authentication
    ) {
        if (maLichKham == null || maLichKham <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mã lịch khám không hợp lệ."
            );
        }

        // Kiểm tra quyền và khoa nhân viên phụ trách.
        phanCong.kiemTraQuyenVoiLichKham(
                authentication,
                maLichKham
        );

        List<Map<String, Object>> thongTin =
                jdbc.queryForList("""
                    SELECT
                        l.MaLichKham,
                        l.MaBenhNhan,
                        l.NgayKham,
                        l.GioKham,
                        l.LyDoKham,
                        l.TrangThai AS TrangThaiLich,

                        bn.NgaySinh,
                        bn.GioiTinh,
                        bn.DiaChi,

                        nd.HoTen AS TenBenhNhan,
                        nd.SoDienThoai,

                        k.TenKhoa,
                        ndBs.HoTen AS TenBacSi,

                        h.MaHoSoBenhAn,
                        h.TrangThai AS TrangThaiHoSo,

                        h.CanNang,
                        h.ChieuCao,
                        h.HuyetApTamThu,
                        h.HuyetApTamTruong,

                        h.TrieuChung,
                        h.ChanDoan,
                        h.KetLuan,
                        h.HuongDieuTri,
                        h.NgayTaiKham,
                        h.GhiChuTaiKham,

                        (
                            SELECT p.TenPhong
                            FROM lichlamviec lv
                            JOIN phongchuyentrach p
                              ON p.MaPhong = lv.MaPhong
                            WHERE lv.MaBacSi = l.MaBacSi
                              AND lv.NgayLamViec = l.NgayKham
                              AND l.GioKham >= lv.GioBatDau
                              AND l.GioKham < lv.GioKetThuc
                            ORDER BY lv.MaLichLamViec DESC
                            LIMIT 1
                        ) AS TenPhong

                    FROM lichdangkykham l

                    JOIN benhnhan bn
                      ON bn.MaBenhNhan = l.MaBenhNhan

                    JOIN nguoidung nd
                      ON nd.MaNguoiDung = bn.MaNguoiDung

                    LEFT JOIN khoa k
                      ON k.MaKhoa = l.MaKhoa

                    LEFT JOIN bacsi bs
                      ON bs.MaBacSi = l.MaBacSi

                    LEFT JOIN nguoidung ndBs
                      ON ndBs.MaNguoiDung = bs.MaNguoiDung

                    LEFT JOIN hosobenhan h
                      ON h.MaLichKham = l.MaLichKham

                    WHERE l.MaLichKham = ?
                    """, maLichKham);

        if (thongTin.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Không tìm thấy lượt khám."
            );
        }

        Map<String, Object> rs = thongTin.get(0);
        Integer maHoSo = soNguyen(
                doc(rs, "MaHoSoBenhAn")
        );

        Map<String, Object> ketQua = new LinkedHashMap<>();

        // Thông tin lượt khám
        Map<String, Object> lich = new LinkedHashMap<>();

        lich.put("maLichKham", maLichKham);
        lich.put("maBenhNhan", doc(rs, "MaBenhNhan"));
        lich.put("ngayKham", chuoi(doc(rs, "NgayKham")));
        lich.put("gioKham", chuoi(doc(rs, "GioKham")));
        lich.put("tenKhoa", doc(rs, "TenKhoa"));
        lich.put("tenBacSi", doc(rs, "TenBacSi"));
        lich.put("tenPhong", doc(rs, "TenPhong"));

        lich.put(
                "trangThai",
                doc(rs, "TrangThaiHoSo") != null
                        ? doc(rs, "TrangThaiHoSo")
                        : doc(rs, "TrangThaiLich")
        );

        lich.put("lyDoKham", doc(rs, "LyDoKham"));
        ketQua.put("luotKham", lich);

        // Thông tin bệnh nhân
        Map<String, Object> benhNhan = new LinkedHashMap<>();

        benhNhan.put("maBenhNhan", doc(rs, "MaBenhNhan"));
        benhNhan.put("hoTen", doc(rs, "TenBenhNhan"));
        benhNhan.put("ngaySinh", chuoi(doc(rs, "NgaySinh")));
        benhNhan.put("gioiTinh", doc(rs, "GioiTinh"));
        benhNhan.put("soDienThoai", doc(rs, "SoDienThoai"));
        benhNhan.put("diaChi", doc(rs, "DiaChi"));

        ketQua.put("benhNhan", benhNhan);

        // Số đo
        Map<String, Object> soDo = new LinkedHashMap<>();

        soDo.put("canNang", doc(rs, "CanNang"));
        soDo.put("chieuCao", doc(rs, "ChieuCao"));

        soDo.put(
                "huyetApTamThu",
                doc(rs, "HuyetApTamThu")
        );

        soDo.put(
                "huyetApTamTruong",
                doc(rs, "HuyetApTamTruong")
        );

        ketQua.put("soDo", soDo);

        // Kết luận khám bệnh
        Map<String, Object> khamBenh = new LinkedHashMap<>();

        khamBenh.put("trieuChung", doc(rs, "TrieuChung"));
        khamBenh.put("chanDoan", doc(rs, "ChanDoan"));
        khamBenh.put("ketLuan", doc(rs, "KetLuan"));

        khamBenh.put(
                "huongDieuTri",
                doc(rs, "HuongDieuTri")
        );

        khamBenh.put(
                "ngayTaiKham",
                chuoi(doc(rs, "NgayTaiKham"))
        );

        khamBenh.put(
                "ghiChuTaiKham",
                doc(rs, "GhiChuTaiKham")
        );

        ketQua.put("khamBenh", khamBenh);

        // Dữ liệu cận lâm sàng và hóa đơn
        ketQua.put("canLamSang", layCanLamSang(maHoSo));

        ketQua.put(
                "hoaDon",
                layHoaDon(maLichKham, maHoSo)
        );

        return ketQua;
    }

    // =====================================================
    // CẬN LÂM SÀNG VÀ CÁC CHỈ SỐ XÉT NGHIỆM
    // =====================================================

    private List<Map<String, Object>> layCanLamSang(
            Integer maHoSo
    ) {
        if (maHoSo == null) {
            return List.of();
        }

        List<Map<String, Object>> rows =
                jdbc.queryForList("""
                    SELECT
                        cd.MaChiDinh,
                        cd.NgayChiDinh,
                        cd.LoaiChiDinh,
                        cd.TrangThai AS TrangThaiChiDinh,

                        dv.TenDichVu,
                        p.TenPhong,

                        kq.MaKetQua,
                        kq.NgayCoKetQua,
                        kq.NoiDungKetQua,
                        kq.KetLuan,
                        kq.FileURL,
                        kq.TrangThai AS TrangThaiKetQua

                    FROM chidinhyte cd

                    JOIN dichvuyte dv
                      ON dv.MaDichVu = cd.MaDichVu

                    LEFT JOIN phongchuyentrach p
                      ON p.MaPhong = cd.MaPhong

                    LEFT JOIN ketquadichvu kq
                      ON kq.MaChiDinh = cd.MaChiDinh

                    WHERE cd.MaHoSoBenhAn = ?

                    ORDER BY
                        cd.NgayChiDinh,
                        cd.MaChiDinh
                    """, maHoSo);

        List<Map<String, Object>> ketQua =
                new ArrayList<>();

        for (Map<String, Object> rs : rows) {
            Map<String, Object> chiDinh =
                    new LinkedHashMap<>();

            chiDinh.put(
                    "maChiDinh",
                    doc(rs, "MaChiDinh")
            );

            chiDinh.put(
                    "tenDichVu",
                    doc(rs, "TenDichVu")
            );

            chiDinh.put("phong", doc(rs, "TenPhong"));

            chiDinh.put(
                    "loaiChiDinh",
                    doc(rs, "LoaiChiDinh")
            );

            chiDinh.put(
                    "ngayChiDinh",
                    chuoi(doc(rs, "NgayChiDinh"))
            );

            chiDinh.put(
                    "trangThai",
                    doc(rs, "TrangThaiChiDinh")
            );

            chiDinh.put(
                    "ngayKetQua",
                    chuoi(doc(rs, "NgayCoKetQua"))
            );

            chiDinh.put(
                    "ketQuaTomTat",
                    doc(rs, "KetLuan")
            );

            chiDinh.put(
                    "noiDungKetQua",
                    doc(rs, "NoiDungKetQua")
            );

            chiDinh.put(
                    "trangThaiKetQua",
                    doc(rs, "TrangThaiKetQua")
            );

            chiDinh.put(
                    "fileURL",
                    doc(rs, "FileURL")
            );

            Integer maKetQua =
                    soNguyen(doc(rs, "MaKetQua"));

            if (maKetQua == null) {
                chiDinh.put("chiSo", List.of());
            } else {
                List<Map<String, Object>> chiSo =
                        jdbc.queryForList("""
                            SELECT
                                TenChiSo AS tenChiSo,
                                GiaTri AS giaTri,
                                DonVi AS donVi,
                                GiaTriThamChieu
                                    AS giaTriThamChieu,
                                TrangThai AS trangThai

                            FROM chitietketqua
                            WHERE MaKetQua = ?

                            ORDER BY MaChiTietKetQua
                            """, maKetQua);

                chiDinh.put("chiSo", chiSo);
            }

            ketQua.add(chiDinh);
        }

        return ketQua;
    }

    // =====================================================
    // HÓA ĐƠN VÀ THANH TOÁN
    //
    // Vì cấu trúc hóa đơn có thể khác giữa các nhánh Git,
    // tìm đúng tên bảng/cột trong MySQL trước khi truy vấn.
    //
    // Chỉ lấy hóa đơn liên kết đúng mã lịch hoặc mã hồ sơ.
    // Không lấy chung theo mã bệnh nhân vì một bệnh nhân
    // có thể khám nhiều lần.
    // =====================================================

    private Map<String, Object> layHoaDon(
            Integer maLich,
            Integer maHoSo
    ) {
        Map<String, Object> result =
                new LinkedHashMap<>();

        result.put("danhSach", new ArrayList<>());
        result.put("ghiChu", null);

        String hoaDon = bang("HoaDon");

        if (hoaDon == null) {
            result.put(
                    "ghiChu",
                    "Database chưa có bảng HoaDon."
            );
            return result;
        }

        String maHoaDon = cot(hoaDon, "MaHoaDon");

        if (maHoaDon == null) {
            result.put(
                    "ghiChu",
                    "Bảng HoaDon không có cột MaHoaDon."
            );
            return result;
        }

        String maLichFk = cot(hoaDon, "MaLichKham");

        String maHoSoFk =
                cot(hoaDon, "MaHoSoBenhAn");

        String chiTietBang = bang("CTHoaDon");

        List<Map<String, Object>> invoices;

        if (maLichFk != null) {
            invoices = theoKhoa(
                    hoaDon,
                    maLichFk,
                    maLich
            );
        } else if (
                maHoSoFk != null
                        && maHoSo != null
        ) {
            invoices = theoKhoa(
                    hoaDon,
                    maHoSoFk,
                    maHoSo
            );
        } else if (
                chiTietBang != null
                        && cot(chiTietBang, "MaHoaDon") != null
        ) {
            String ctLich = cot(
                    chiTietBang,
                    "MaLichKham"
            );

            String ctHoSo = cot(
                    chiTietBang,
                    "MaHoSoBenhAn"
            );

            String fkChiTiet = cot(
                    chiTietBang,
                    "MaHoaDon"
            );

            if (ctLich != null) {
                invoices = jdbc.queryForList(
                        "SELECT DISTINCT hd.* FROM "
                                + quoted(hoaDon) + " hd JOIN "
                                + quoted(chiTietBang) + " ct ON ct."
                                + quoted(fkChiTiet) + " = hd."
                                + quoted(maHoaDon)
                                + " WHERE ct."
                                + quoted(ctLich) + " = ?",
                        maLich
                );
            } else if (
                    ctHoSo != null
                            && maHoSo != null
            ) {
                invoices = jdbc.queryForList(
                        "SELECT DISTINCT hd.* FROM "
                                + quoted(hoaDon) + " hd JOIN "
                                + quoted(chiTietBang) + " ct ON ct."
                                + quoted(fkChiTiet) + " = hd."
                                + quoted(maHoaDon)
                                + " WHERE ct."
                                + quoted(ctHoSo) + " = ?",
                        maHoSo
                );
            } else {
                result.put(
                        "ghiChu",
                        "Chưa xác định được quan hệ "
                                + "HoaDon với lượt khám."
                );
                return result;
            }
        } else {
            result.put(
                    "ghiChu",
                    "Chưa xác định được quan hệ "
                            + "HoaDon với lượt khám."
            );
            return result;
        }

        List<Map<String, Object>> items =
                new ArrayList<>();

        for (Map<String, Object> invoiceRow : invoices) {
            Object id = doc(
                    invoiceRow,
                    "MaHoaDon"
            );

            Map<String, Object> invoice =
                    new LinkedHashMap<>();

            invoice.put("maHoaDon", id);

            invoice.put(
                    "ngayLap",
                    chuoi(doc(
                            invoiceRow,
                            "NgayLap",
                            "NgayTao",
                            "NgayXuat"
                    ))
            );

            invoice.put(
                    "trangThai",
                    doc(
                            invoiceRow,
                            "TrangThai",
                            "TrangThaiThanhToan"
                    )
            );

            invoice.put(
                    "tongTien",
                    doc(
                            invoiceRow,
                            "TongTien",
                            "TongThanhTien",
                            "ThanhTien"
                    )
            );

            invoice.put(
                    "giamGia",
                    doc(
                            invoiceRow,
                            "GiamGia",
                            "TienGiamGia"
                    )
            );

            invoice.put(
                    "soTienPhaiTra",
                    doc(
                            invoiceRow,
                            "SoTienPhaiTra",
                            "TongThanhToan",
                            "TongTienThanhToan"
                    )
            );

            Object chiTiet =
                    layChiTietHoaDon(chiTietBang, id);

            invoice.put("chiTiet", chiTiet);

            invoice.put(
                    "thanhToan",
                    layThanhToan(id, chiTiet)
            );

            items.add(invoice);
        }

        result.put("danhSach", items);

        if (items.isEmpty()) {
            result.put(
                    "ghiChu",
                    "Lượt khám này chưa có hóa đơn liên kết."
            );
        }

        return result;
    }

    // =====================================================
    // CÁC DÒNG CHI TIẾT HÓA ĐƠN
    // =====================================================

    private List<Map<String, Object>> layChiTietHoaDon(
            String bangCt,
            Object maHoaDon
    ) {
        if (
                bangCt == null
                        || cot(bangCt, "MaHoaDon") == null
        ) {
            return List.of();
        }

        List<Map<String, Object>> rows =
                theoKhoa(
                        bangCt,
                        cot(bangCt, "MaHoaDon"),
                        maHoaDon
                );

        List<Map<String, Object>> result =
                new ArrayList<>();

        String dichVu = bang("DichVuYTe");

        for (Map<String, Object> row : rows) {
            Map<String, Object> ct =
                    new LinkedHashMap<>();

            ct.put(
                    "maCTHoaDon",
                    doc(row, "MaCTHoaDon")
            );

            Object maDichVu =
                    doc(row, "MaDichVu");

            Object tenDichVu =
                    doc(
                            row,
                            "TenDichVu",
                            "NoiDung",
                            "MoTa"
                    );

            if (
                    tenDichVu == null
                            && maDichVu != null
                            && dichVu != null
                            && cot(dichVu, "MaDichVu") != null
            ) {
                List<Map<String, Object>> ten =
                        theoKhoa(
                                dichVu,
                                cot(dichVu, "MaDichVu"),
                                maDichVu
                        );

                if (!ten.isEmpty()) {
                    tenDichVu = doc(
                            ten.get(0),
                            "TenDichVu"
                    );
                }
            }

            ct.put("tenDichVu", tenDichVu);

            ct.put(
                    "soLuong",
                    doc(row, "SoLuong")
            );

            ct.put(
                    "donGia",
                    doc(
                            row,
                            "DonGia",
                            "DonGiaBan",
                            "GiaBan"
                    )
            );

            ct.put(
                    "thanhTien",
                    doc(
                            row,
                            "ThanhTien",
                            "SoTien"
                    )
            );

            result.add(ct);
        }

        return result;
    }

    // =====================================================
    // GIAO DỊCH THANH TOÁN
    // =====================================================

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> layThanhToan(
            Object maHoaDon,
            Object chiTietObj
    ) {
        String thanhToan = bang("ThanhToan");

        if (thanhToan == null) {
            return List.of();
        }

        List<Map<String, Object>> rows =
                new ArrayList<>();

        String fkHoaDon = cot(
                thanhToan,
                "MaHoaDon"
        );

        if (fkHoaDon != null) {
            rows = theoKhoa(
                    thanhToan,
                    fkHoaDon,
                    maHoaDon
            );
        } else {
            String ctThanhToan =
                    bang("CTThanhToan");

            if (
                    ctThanhToan != null
                            && cot(ctThanhToan, "MaCTHoaDon") != null
                            && cot(ctThanhToan, "MaThanhToan") != null
                            && cot(thanhToan, "MaThanhToan") != null
            ) {
                Set<Object> idsCt =
                        new LinkedHashSet<>();

                List<Map<String, Object>> chiTiet =
                        (List<Map<String, Object>>) chiTietObj;

                for (Map<String, Object> item : chiTiet) {
                    Object id = item.get("maCTHoaDon");

                    if (id != null) {
                        idsCt.add(id);
                    }
                }

                Set<Object> paymentIds =
                        new LinkedHashSet<>();

                for (Object idCt : idsCt) {
                    List<Map<String, Object>> cttt =
                            theoKhoa(
                                    ctThanhToan,
                                    cot(
                                            ctThanhToan,
                                            "MaCTHoaDon"
                                    ),
                                    idCt
                            );

                    for (Map<String, Object> row : cttt) {
                        Object idTt = doc(
                                row,
                                "MaThanhToan"
                        );

                        if (idTt != null) {
                            paymentIds.add(idTt);
                        }
                    }
                }

                for (Object id : paymentIds) {
                    rows.addAll(
                            theoKhoa(
                                    thanhToan,
                                    cot(
                                            thanhToan,
                                            "MaThanhToan"
                                    ),
                                    id
                            )
                    );
                }
            }
        }

        List<Map<String, Object>> result =
                new ArrayList<>();

        for (Map<String, Object> row : rows) {
            Map<String, Object> payment =
                    new LinkedHashMap<>();

            payment.put(
                    "maThanhToan",
                    doc(row, "MaThanhToan")
            );

            payment.put(
                    "ngayThanhToan",
                    chuoi(doc(
                            row,
                            "NgayThanhToan",
                            "NgayTao",
                            "NgayGiaoDich"
                    ))
            );

            payment.put(
                    "phuongThuc",
                    doc(
                            row,
                            "PhuongThucThanhToan",
                            "PhuongThuc",
                            "HinhThucThanhToan"
                    )
            );

            payment.put(
                    "soTien",
                    doc(
                            row,
                            "SoTien",
                            "SoTienThanhToan",
                            "TongTienThanhToan"
                    )
            );

            payment.put(
                    "trangThai",
                    doc(
                            row,
                            "TrangThai",
                            "TrangThaiThanhToan"
                    )
            );

            result.add(payment);
        }

        return result;
    }

    // =====================================================
    // ĐỌC TÊN BẢNG, TÊN CỘT THỰC TẾ
    // =====================================================

    private String bang(String name) {
        List<String> names = jdbc.queryForList("""
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND LOWER(TABLE_NAME) = LOWER(?)
            LIMIT 1
            """, String.class, name);

        return names.isEmpty()
                ? null
                : names.get(0);
    }

    private String cot(
            String tenBang,
            String... names
    ) {
        if (tenBang == null) {
            return null;
        }

        List<String> columns = jdbc.queryForList("""
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
            """, String.class, tenBang);

        for (String candidate : names) {
            for (String actual : columns) {
                if (candidate.equalsIgnoreCase(actual)) {
                    return actual;
                }
            }
        }

        return null;
    }

    private List<Map<String, Object>> theoKhoa(
            String tenBang,
            String tenCot,
            Object value
    ) {
        return jdbc.queryForList(
                "SELECT * FROM " + quoted(tenBang)
                        + " WHERE " + quoted(tenCot) + " = ?",
                value
        );
    }

    private String quoted(String identifier) {
        if (!identifier.matches("[A-Za-z0-9_]+")) {
            throw new IllegalArgumentException(
                    "Tên bảng/cột không hợp lệ."
            );
        }

        return "`" + identifier + "`";
    }

    private Object doc(
            Map<String, Object> row,
            String... fields
    ) {
        for (String field : fields) {
            for (Map.Entry<String, Object> e
                    : row.entrySet()) {

                if (e.getKey().equalsIgnoreCase(field)) {
                    return e.getValue();
                }
            }
        }

        return null;
    }

    private Integer soNguyen(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }

        return null;
    }

    private String chuoi(Object value) {
        return value == null
                ? null
                : value.toString();
    }
}
