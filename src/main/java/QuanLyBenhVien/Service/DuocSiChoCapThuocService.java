package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.DuocSiChoCapThuocResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class DuocSiChoCapThuocService {

    private final JdbcTemplate jdbcTemplate;


    public DuocSiChoCapThuocService(
            JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate =
                jdbcTemplate;
    }


    // =====================================================
    // LẤY DANH SÁCH
    // =====================================================

    public List<DuocSiChoCapThuocResponse>
    getDanhSach(

            String keyword,

            String patient,

            String date,

            Integer doctorId,

            int page,

            int size

    ) {

        StringBuilder sql =
                new StringBuilder("""
                    SELECT
                        d.MaDonThuoc,

                        bn.MaBenhNhan,

                        nd_bn.HoTen AS TenBenhNhan,

                        nd_bs.HoTen AS TenBacSi,

                        d.NgayKeThuoc,

                        COUNT(ct.MaCTDonThuoc)
                            AS SoLoaiThuoc,

                        d.TrangThai

                    FROM DonThuoc d

                    INNER JOIN HoSoBenhAn hs
                        ON hs.MaHoSoBenhAn =
                           d.MaHoSoBenhAn

                    INNER JOIN LichDangKyKham lk
                        ON lk.MaLichKham =
                           hs.MaLichKham

                    INNER JOIN BenhNhan bn
                        ON bn.MaBenhNhan =
                           lk.MaBenhNhan

                    INNER JOIN Nguoidung nd_bn
                        ON nd_bn.MaNguoiDung =
                           bn.MaNguoiDung

                    INNER JOIN BacSi bs
                        ON bs.MaBacSi =
                           d.MaBacSi

                    INNER JOIN Nguoidung nd_bs
                        ON nd_bs.MaNguoiDung =
                           bs.MaNguoiDung

                    LEFT JOIN CTDonThuoc ct
                        ON ct.MaDonThuoc =
                           d.MaDonThuoc

                    WHERE d.TrangThai
                        IN ('ChoCapThuoc',
                            'DangCapThuoc')
                    """);


        List<Object> params =
                new ArrayList<>();


        // =================================================
        // MÃ ĐƠN
        // =================================================

        if (
                keyword != null
                        &&
                        !keyword.trim().isEmpty()
        ) {

            sql.append("""
                AND CAST(
                    d.MaDonThuoc
                    AS CHAR
                ) LIKE ?
                """);

            params.add(
                    "%" +
                            keyword.trim() +
                            "%"
            );
        }


        // =================================================
        // TÊN BỆNH NHÂN
        // =================================================

        if (
                patient != null
                        &&
                        !patient.trim().isEmpty()
        ) {

            sql.append("""
                AND nd_bn.HoTen
                    LIKE ?
                """);

            params.add(
                    "%" +
                            patient.trim() +
                            "%"
            );
        }


        // =================================================
        // NGÀY KÊ
        // =================================================

        if (
                date != null
                        &&
                        !date.trim().isEmpty()
        ) {

            sql.append("""
                AND DATE(d.NgayKeThuoc) = ?
                """);

            params.add(
                    date
            );
        }


        // =================================================
        // BÁC SĨ
        // =================================================

        if (
                doctorId != null
        ) {

            sql.append("""
                AND d.MaBacSi = ?
                """);

            params.add(
                    doctorId
            );
        }


        // =================================================
        // GROUP
        // =================================================

        sql.append("""
            GROUP BY
                d.MaDonThuoc,
                bn.MaBenhNhan,
                nd_bn.HoTen,
                nd_bs.HoTen,
                d.NgayKeThuoc,
                d.TrangThai

            ORDER BY
                d.NgayKeThuoc DESC

            LIMIT ? OFFSET ?
            """);


        params.add(size);

        params.add(
                page * size
        );


        return jdbcTemplate.query(
                sql.toString(),
                params.toArray(),
                (rs, rowNum) -> {

                    DuocSiChoCapThuocResponse item =
                            new DuocSiChoCapThuocResponse();


                    int maDonThuoc =
                            rs.getInt(
                                    "MaDonThuoc"
                            );


                    int maBenhNhan =
                            rs.getInt(
                                    "MaBenhNhan"
                            );


                    item.setMaDonThuoc(
                            maDonThuoc
                    );


                    item.setMaHienThi(
                            "DP" +
                                    String.format(
                                            "%05d",
                                            maDonThuoc
                                    )
                    );


                    item.setMaBenhNhan(
                            maBenhNhan
                    );


                    item.setMaBenhNhanHienThi(
                            "BN" +
                                    String.format(
                                            "%05d",
                                            maBenhNhan
                                    )
                    );


                    item.setBenhNhan(
                            rs.getString(
                                    "TenBenhNhan"
                            )
                    );


                    item.setBacSi(
                            "BS. " +
                                    rs.getString(
                                            "TenBacSi"
                                    )
                    );


                    Timestamp ngayKe =
                            rs.getTimestamp(
                                    "NgayKeThuoc"
                            );


                    if (
                            ngayKe != null
                    ) {

                        item.setNgayKe(
                                ngayKe
                                        .toLocalDateTime()
                                        .format(
                                                DateTimeFormatter.ofPattern(
                                                        "dd/MM/yyyy"
                                                )
                                        )
                        );

                    } else {

                        item.setNgayKe(
                                "-"
                        );
                    }


                    item.setSoLoaiThuoc(
                            rs.getInt(
                                    "SoLoaiThuoc"
                            )
                    );


                    item.setTrangThai(
                            rs.getString(
                                    "TrangThai"
                            )
                    );


                    return item;
                }
        );
    }


    // =====================================================
    // COUNT
    // =====================================================

    public long count(

            String keyword,

            String patient,

            String date,

            Integer doctorId

    ) {

        StringBuilder sql =
                new StringBuilder("""
                    SELECT COUNT(DISTINCT d.MaDonThuoc)

                    FROM DonThuoc d

                    INNER JOIN HoSoBenhAn hs
                        ON hs.MaHoSoBenhAn =
                           d.MaHoSoBenhAn

                    INNER JOIN LichDangKyKham lk
                        ON lk.MaLichKham =
                           hs.MaLichKham

                    INNER JOIN BenhNhan bn
                        ON bn.MaBenhNhan =
                           lk.MaBenhNhan

                    INNER JOIN Nguoidung nd_bn
                        ON nd_bn.MaNguoiDung =
                           bn.MaNguoiDung

                    WHERE d.TrangThai
                        IN ('ChoCapThuoc',
                            'DangCapThuoc')
                    """);


        List<Object> params =
                new ArrayList<>();


        if (
                keyword != null
                        &&
                        !keyword.trim().isEmpty()
        ) {

            sql.append("""
                AND CAST(
                    d.MaDonThuoc
                    AS CHAR
                ) LIKE ?
                """);

            params.add(
                    "%" +
                            keyword.trim() +
                            "%"
            );
        }


        if (
                patient != null
                        &&
                        !patient.trim().isEmpty()
        ) {

            sql.append("""
                AND nd_bn.HoTen LIKE ?
                """);

            params.add(
                    "%" +
                            patient.trim() +
                            "%"
            );
        }


        if (
                date != null
                        &&
                        !date.trim().isEmpty()
        ) {

            sql.append("""
                AND DATE(d.NgayKeThuoc) = ?
                """);

            params.add(
                    date
            );
        }


        if (
                doctorId != null
        ) {

            sql.append("""
                AND d.MaBacSi = ?
                """);

            params.add(
                    doctorId
            );
        }


        Long result =
                jdbcTemplate.queryForObject(
                        sql.toString(),
                        params.toArray(),
                        Long.class
                );


        return result == null
                ? 0
                : result;
    }
}