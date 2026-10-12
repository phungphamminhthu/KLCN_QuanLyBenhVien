package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DuocSiChiTietDonThuocResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class DuocSiChiTietDonThuocService {

    private final JdbcTemplate jdbcTemplate;

    public DuocSiChiTietDonThuocService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }


    // =====================================================
    // LẤY CHI TIẾT ĐƠN THUỐC
    //
    // Dùng cho:
    // 1. Chờ cấp thuốc
    // 2. Chi tiết đơn thuốc
    // 3. Lịch sử cấp thuốc
    // =====================================================

    public DuocSiChiTietDonThuocResponse getChiTiet(
            Integer maDonThuoc
    ) {

        // =================================================
        // KIỂM TRA MÃ ĐƠN
        // =================================================

        if (maDonThuoc == null) {

            throw new IllegalArgumentException(
                    "Mã đơn thuốc không được để trống."
            );
        }


        // =================================================
        // THÔNG TIN ĐƠN THUỐC + BỆNH NHÂN
        // + THÔNG TIN CẤP THUỐC
        // =================================================

        String orderSql = """
            SELECT

                d.MaDonThuoc,

                -- =========================================
                -- BỆNH NHÂN
                -- =========================================

                bn.MaBenhNhan,

                nd_bn.HoTen AS TenBenhNhan,

                bn.GioiTinh,

                bn.NgaySinh,

                bn.DiaChi,

                -- =========================================
                -- HỒ SƠ BỆNH ÁN
                -- =========================================

                hs.CanNang,

                hs.HuyetApTamThu,

                hs.HuyetApTamTruong,

                -- =========================================
                -- BÁC SĨ
                -- =========================================

                nd_bs.HoTen AS TenBacSi,

                -- =========================================
                -- ĐƠN THUỐC
                -- =========================================

                d.NgayKeThuoc,

                d.GhiChu,

                -- =========================================
                -- PHIẾU CẤP THUỐC
                -- =========================================

                p.ThoiGianCap,

                p.TrangThai AS TrangThaiCapThuoc,

                nd_cap.HoTen AS TenNguoiCap

            FROM DonThuoc d

            -- =============================================
            -- HỒ SƠ BỆNH ÁN
            -- =============================================

            INNER JOIN HoSoBenhAn hs
                ON hs.MaHoSoBenhAn =
                   d.MaHoSoBenhAn

            -- =============================================
            -- LỊCH ĐĂNG KÝ KHÁM
            -- =============================================

            INNER JOIN LichDangKyKham lk
                ON lk.MaLichKham =
                   hs.MaLichKham

            -- =============================================
            -- BỆNH NHÂN
            -- =============================================

            INNER JOIN BenhNhan bn
                ON bn.MaBenhNhan =
                   lk.MaBenhNhan

            INNER JOIN Nguoidung nd_bn
                ON nd_bn.MaNguoiDung =
                   bn.MaNguoiDung

            -- =============================================
            -- BÁC SĨ
            -- =============================================

            INNER JOIN BacSi bs
                ON bs.MaBacSi =
                   d.MaBacSi

            INNER JOIN Nguoidung nd_bs
                ON nd_bs.MaNguoiDung =
                   bs.MaNguoiDung

            -- =============================================
            -- PHIẾU CẤP THUỐC
            --
            -- LEFT JOIN:
            -- Đơn chưa cấp vẫn xem được.
            -- =============================================

            LEFT JOIN PhieuCapThuoc p
                ON p.MaDonThuoc =
                   d.MaDonThuoc

            -- =============================================
            -- NGƯỜI CẤP THUỐC
            -- =============================================

            LEFT JOIN Nguoidung nd_cap
                ON nd_cap.MaNguoiDung =
                   p.MaNguoiCap

            WHERE d.MaDonThuoc = ?
            """;


        // =================================================
        // QUERY ĐƠN THUỐC
        // =================================================

        List<DuocSiChiTietDonThuocResponse> orders =
                jdbcTemplate.query(
                        orderSql,

                        new Object[]{
                                maDonThuoc
                        },

                        (rs, rowNum) -> {

                            DuocSiChiTietDonThuocResponse response =
                                    new DuocSiChiTietDonThuocResponse();


                            // =========================================
                            // MÃ ĐƠN THUỐC
                            // =========================================

                            int maDon =
                                    rs.getInt(
                                            "MaDonThuoc"
                                    );

                            response.setMaDonThuoc(
                                    maDon
                            );


                            response.setMaHienThi(
                                    "DP" +
                                            String.format(
                                                    "%05d",
                                                    maDon
                                            )
                            );


                            // =========================================
                            // MÃ BỆNH NHÂN
                            // =========================================

                            int maBenhNhan =
                                    rs.getInt(
                                            "MaBenhNhan"
                                    );

                            response.setMaBenhNhan(
                                    maBenhNhan
                            );


                            response.setMaBenhNhanHienThi(
                                    "BN" +
                                            String.format(
                                                    "%05d",
                                                    maBenhNhan
                                            )
                            );


                            // =========================================
                            // TÊN BỆNH NHÂN
                            // =========================================

                            response.setBenhNhan(
                                    rs.getString(
                                            "TenBenhNhan"
                                    )
                            );


                            // =========================================
                            // GIỚI TÍNH
                            // =========================================

                            response.setGioiTinh(
                                    rs.getString(
                                            "GioiTinh"
                                    )
                            );


                            // =========================================
                            // NGÀY SINH
                            // =========================================

                            java.sql.Date ngaySinh =
                                    rs.getDate(
                                            "NgaySinh"
                                    );


                            if (ngaySinh != null) {

                                response.setNgaySinh(
                                        ngaySinh
                                                .toLocalDate()
                                                .format(
                                                        DateTimeFormatter.ofPattern(
                                                                "dd/MM/yyyy"
                                                        )
                                                )
                                );

                            } else {

                                response.setNgaySinh(
                                        "-"
                                );
                            }


                            // =========================================
                            // CÂN NẶNG
                            // =========================================

                            response.setCanNang(
                                    rs.getBigDecimal(
                                            "CanNang"
                                    )
                            );


                            // =========================================
                            // HUYẾT ÁP TÂM THU
                            // =========================================

                            response.setHuyetApTamThu(
                                    rs.getObject(
                                            "HuyetApTamThu",
                                            Integer.class
                                    )
                            );


                            // =========================================
                            // HUYẾT ÁP TÂM TRƯƠNG
                            // =========================================

                            response.setHuyetApTamTruong(
                                    rs.getObject(
                                            "HuyetApTamTruong",
                                            Integer.class
                                    )
                            );


                            // =========================================
                            // ĐỊA CHỈ
                            // =========================================

                            String diaChi =
                                    rs.getString(
                                            "DiaChi"
                                    );


                            response.setDiaChi(
                                    diaChi != null &&
                                            !diaChi.trim().isEmpty()
                                            ? diaChi
                                            : "-"
                            );


                            // =========================================
                            // BÁC SĨ
                            // =========================================

                            String tenBacSi =
                                    rs.getString(
                                            "TenBacSi"
                                    );


                            response.setBacSi(
                                    tenBacSi != null &&
                                            !tenBacSi.trim().isEmpty()
                                            ? "BS. " + tenBacSi
                                            : "-"
                            );


                            // =========================================
                            // NGÀY KÊ THUỐC
                            // =========================================

                            Timestamp ngayKe =
                                    rs.getTimestamp(
                                            "NgayKeThuoc"
                                    );


                            if (ngayKe != null) {

                                response.setNgayKe(
                                        ngayKe
                                                .toLocalDateTime()
                                                .format(
                                                        DateTimeFormatter.ofPattern(
                                                                "dd/MM/yyyy"
                                                        )
                                                )
                                );

                            } else {

                                response.setNgayKe(
                                        "-"
                                );
                            }


                            // =========================================
                            // GHI CHÚ
                            // =========================================

                            String ghiChu =
                                    rs.getString(
                                            "GhiChu"
                                    );


                            response.setGhiChu(
                                    ghiChu != null &&
                                            !ghiChu.trim().isEmpty()
                                            ? ghiChu
                                            : "-"
                            );


                            // =========================================
                            // NGÀY CẤP THUỐC
                            // =========================================

                            Timestamp thoiGianCap =
                                    rs.getTimestamp(
                                            "ThoiGianCap"
                                    );


                            if (thoiGianCap != null) {

                                response.setNgayCap(
                                        thoiGianCap
                                                .toLocalDateTime()
                                                .format(
                                                        DateTimeFormatter.ofPattern(
                                                                "dd/MM/yyyy HH:mm"
                                                        )
                                                )
                                );

                            } else {

                                response.setNgayCap(
                                        "-"
                                );
                            }


                            // =========================================
                            // NGƯỜI CẤP
                            // =========================================

                            String tenNguoiCap =
                                    rs.getString(
                                            "TenNguoiCap"
                                    );


                            response.setNguoiCap(
                                    tenNguoiCap != null &&
                                            !tenNguoiCap.trim().isEmpty()
                                            ? tenNguoiCap
                                            : "-"
                            );


                            // =========================================
                            // TRẠNG THÁI CẤP THUỐC
                            // =========================================

                            String trangThaiCap =
                                    rs.getString(
                                            "TrangThaiCapThuoc"
                                    );


                            response.setTrangThaiCapThuoc(
                                    trangThaiCap != null &&
                                            !trangThaiCap.trim().isEmpty()
                                            ? trangThaiCap
                                            : "-"
                            );


                            return response;
                        }
                );


        // =================================================
        // KIỂM TRA ĐƠN THUỐC
        // =================================================

        if (orders.isEmpty()) {

            throw new RuntimeException(
                    "Không tìm thấy đơn thuốc có mã: "
                            + maDonThuoc
            );
        }


        DuocSiChiTietDonThuocResponse response =
                orders.get(0);


        // =================================================
        // CHI TIẾT THUỐC
        // =================================================

        String medicineSql = """
            SELECT

                ct.MaCTDonThuoc,

                ct.MaThuoc,

                t.TenThuoc,

                t.DonViTinh,

                ct.SoLuong,

                ct.DonGiaBan,

                ct.LieuDung,

                ct.ThoiGianDung,

                ct.HuongDanSuDung,

                COALESCE(
                    SUM(k.SoLuongTon),
                    0
                ) AS TonKho,

                COALESCE(
                    MIN(k.SoLuongToiThieu),
                    0
                ) AS SoLuongToiThieu

            FROM CTDonThuoc ct

            INNER JOIN Thuoc t
                ON t.MaThuoc =
                   ct.MaThuoc

            LEFT JOIN KhoThuoc k
                ON k.MaThuoc =
                   ct.MaThuoc

            WHERE ct.MaDonThuoc = ?

            GROUP BY

                ct.MaCTDonThuoc,

                ct.MaThuoc,

                t.TenThuoc,

                t.DonViTinh,

                ct.SoLuong,

                ct.DonGiaBan,

                ct.LieuDung,

                ct.ThoiGianDung,

                ct.HuongDanSuDung

            ORDER BY
                ct.MaCTDonThuoc
            """;


        // =================================================
        // QUERY DANH SÁCH THUỐC
        // =================================================

        List<DuocSiChiTietDonThuocResponse.ThuocItem>
                medicines =

                jdbcTemplate.query(

                        medicineSql,

                        new Object[]{
                                maDonThuoc
                        },

                        (rs, rowNum) -> {

                            DuocSiChiTietDonThuocResponse.ThuocItem item =
                                    new DuocSiChiTietDonThuocResponse
                                            .ThuocItem();


                            // =========================================
                            // MÃ THUỐC
                            // =========================================

                            int maThuoc =
                                    rs.getInt(
                                            "MaThuoc"
                                    );


                            // =========================================
                            // SỐ LƯỢNG
                            // =========================================

                            int soLuong =
                                    rs.getInt(
                                            "SoLuong"
                                    );


                            // =========================================
                            // ĐƠN GIÁ
                            // =========================================

                            double donGia =
                                    rs.getDouble(
                                            "DonGiaBan"
                                    );


                            // =========================================
                            // TỒN KHO
                            // =========================================

                            int tonKho =
                                    rs.getInt(
                                            "TonKho"
                                    );


                            // =========================================
                            // TỒN KHO TỐI THIỂU
                            // =========================================

                            int tonKhoToiThieu =
                                    rs.getInt(
                                            "SoLuongToiThieu"
                                    );


                            // =========================================
                            // SET THÔNG TIN THUỐC
                            // =========================================

                            item.setMaThuoc(
                                    maThuoc
                            );


                            item.setTenThuoc(
                                    rs.getString(
                                            "TenThuoc"
                                    )
                            );


                            item.setDonViTinh(
                                    rs.getString(
                                            "DonViTinh"
                                    )
                            );


                            item.setSoLuong(
                                    soLuong
                            );


                            // =========================================
                            // SỐ LƯỢNG HIỂN THỊ
                            // =========================================

                            String donViTinh =
                                    rs.getString(
                                            "DonViTinh"
                                    );


                            item.setSoLuongHienThi(
                                    soLuong +
                                            " " +
                                            (
                                                    donViTinh != null
                                                            ? donViTinh
                                                            : ""
                                            )
                            );


                            // =========================================
                            // LIỀU DÙNG
                            // =========================================

                            item.setLieuDung(
                                    rs.getString(
                                            "LieuDung"
                                    )
                            );


                            // =========================================
                            // THỜI GIAN DÙNG
                            // =========================================

                            item.setThoiGianDung(
                                    rs.getObject(
                                            "ThoiGianDung",
                                            Integer.class
                                    )
                            );


                            // =========================================
                            // CÁCH DÙNG
                            // =========================================

                            item.setCachDung(
                                    rs.getString(
                                            "HuongDanSuDung"
                                    )
                            );


                            // =========================================
                            // ĐƠN GIÁ
                            // =========================================

                            item.setDonGia(
                                    donGia
                            );


                            // =========================================
                            // THÀNH TIỀN
                            // =========================================

                            item.setThanhTien(
                                    donGia *
                                            soLuong
                            );


                            // =========================================
                            // TỒN KHO
                            // =========================================

                            item.setTonKho(
                                    tonKho
                            );


                            // =========================================
                            // TỒN KHO TỐI THIỂU
                            // =========================================

                            item.setTonKhoToiThieu(
                                    tonKhoToiThieu
                            );


                            // =========================================
                            // TÌNH TRẠNG KHO
                            // =========================================

                            if (tonKho <= 0) {

                                item.setTinhTrang(
                                        "Hết"
                                );

                            } else if (
                                    tonKho <=
                                            tonKhoToiThieu
                            ) {

                                item.setTinhTrang(
                                        "Sắp hết"
                                );

                            } else {

                                item.setTinhTrang(
                                        "Đủ"
                                );
                            }


                            return item;
                        }
                );


        // =================================================
        // GÁN DANH SÁCH THUỐC
        // =================================================

        response.setDanhSachThuoc(
                medicines
        );


        // =================================================
        // TÍNH TỔNG TIỀN
        // =================================================

        double tongTien =
                medicines
                        .stream()
                        .mapToDouble(
                                item ->
                                        item.getThanhTien() != null
                                                ? item.getThanhTien()
                                                : 0
                        )
                        .sum();


        response.setTongTien(
                tongTien
        );


        // =================================================
        // CẢNH BÁO KHO
        //
        // canhBaoKho của DTO hiện tại là String.
        // Không dùng boolean ở đây.
        // =================================================

        DuocSiChiTietDonThuocResponse.ThuocItem thuocSapHet =

                medicines
                        .stream()
                        .filter(
                                item ->

                                        "Sắp hết".equals(
                                                item.getTinhTrang()
                                        )

                                                ||

                                                "Hết".equals(
                                                        item.getTinhTrang()
                                                )
                        )
                        .findFirst()
                        .orElse(null);


        // =================================================
        // CÓ THUỐC SẮP HẾT / HẾT
        // =================================================

        if (thuocSapHet != null) {

            int viTri =
                    medicines.indexOf(
                            thuocSapHet
                    ) + 1;


            int tonKho =
                    thuocSapHet.getTonKho() != null
                            ? thuocSapHet.getTonKho()
                            : 0;


            String tinhTrang =
                    "Hết".equals(
                            thuocSapHet.getTinhTrang()
                    )
                            ? "đã hết"
                            : "sắp hết";


            response.setCanhBaoKho(

                    "Cảnh báo kho thuốc: " +

                            "Thuốc số " +

                            viTri +

                            " chỉ còn " +

                            tonKho +

                            " đơn vị (" +

                            tinhTrang +

                            ")."
            );


        } else {

            // =============================================
            // KHO BÌNH THƯỜNG
            // =============================================

            response.setCanhBaoKho(
                    null
            );
        }


        // =================================================
        // RETURN
        // =================================================

        return response;
    }
}