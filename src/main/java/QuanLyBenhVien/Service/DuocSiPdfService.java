package QuanLyBenhVien.Service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DuocSiPdfService {

    private final JdbcTemplate jdbcTemplate;

    private static final String FONT_NORMAL =
            "/fonts/DejaVuSans.ttf";

    private static final String FONT_BOLD =
            "/fonts/DejaVuSans-Bold.ttf";

    private static final String FONT_ITALIC =
            "/fonts/DejaVuSans-Oblique.ttf";

    public DuocSiPdfService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // =====================================================
    // FONT
    // =====================================================

    private Font normalFont(float size) {
        try {
            BaseFont baseFont = BaseFont.createFont(
                    FONT_NORMAL,
                    BaseFont.IDENTITY_H,
                    BaseFont.EMBEDDED
            );

            return new Font(
                    baseFont,
                    size,
                    Font.NORMAL,
                    Color.BLACK
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Không thể load font tiếng Việt.",
                    e
            );
        }
    }

    private Font boldFont(float size) {
        try {
            BaseFont baseFont = BaseFont.createFont(
                    FONT_BOLD,
                    BaseFont.IDENTITY_H,
                    BaseFont.EMBEDDED
            );

            return new Font(
                    baseFont,
                    size,
                    Font.BOLD,
                    Color.BLACK
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Không thể load font Bold.",
                    e
            );
        }
    }

    private String upperCaseVietnamese(Object value) {
        if (value == null) {
            return "-";
        }

        String text = String.valueOf(value).trim();

        if (text.isEmpty()) {
            return "-";
        }

        return text.toUpperCase(new Locale("vi", "VN"));
    }

    private Font italicFont(float size) {
        try {
            BaseFont baseFont = BaseFont.createFont(
                    FONT_ITALIC,
                    BaseFont.IDENTITY_H,
                    BaseFont.EMBEDDED
            );

            return new Font(
                    baseFont,
                    size,
                    Font.ITALIC,
                    Color.BLACK
            );

        } catch (Exception e) {
            throw new RuntimeException(
                    "Không thể load font Italic.",
                    e
            );
        }
    }

    // =====================================================
    // QUERY DATA
    // =====================================================

    private Map<String, Object> getOrder(Integer maDonThuoc) {

        String sql = """
            SELECT
                d.MaDonThuoc,
                d.MaHoSoBenhAn,
                d.NgayKeThuoc,
                d.GhiChu,

                nd_bn.HoTen AS TenBenhNhan,

                bn.MaBenhNhan,
                bn.GioiTinh,
                bn.NgaySinh,
                bn.DiaChi,

                hs.CanNang,
                hs.HuyetApTamThu,
                hs.HuyetApTamTruong,
                hs.ChanDoan,
                hs.NgayTaiKham,

                nd_bs.HoTen AS TenBacSi,

                p.ThoiGianCap,
                p.TrangThai AS TrangThaiCapThuoc,

                nd_cap.HoTen AS TenNguoiCap

            FROM DonThuoc d

            INNER JOIN HoSoBenhAn hs
                ON hs.MaHoSoBenhAn = d.MaHoSoBenhAn

            INNER JOIN LichDangKyKham lk
                ON lk.MaLichKham = hs.MaLichKham

            INNER JOIN BenhNhan bn
                ON bn.MaBenhNhan = lk.MaBenhNhan

            INNER JOIN Nguoidung nd_bn
                ON nd_bn.MaNguoiDung = bn.MaNguoiDung

            INNER JOIN BacSi bs
                ON bs.MaBacSi = d.MaBacSi

            INNER JOIN Nguoidung nd_bs
                ON nd_bs.MaNguoiDung = bs.MaNguoiDung

            LEFT JOIN PhieuCapThuoc p
                ON p.MaDonThuoc = d.MaDonThuoc

            LEFT JOIN Nguoidung nd_cap
                ON nd_cap.MaNguoiDung = p.MaNguoiCap

            WHERE d.MaDonThuoc = ?
        """;

        List<Map<String, Object>> result =
                jdbcTemplate.queryForList(
                        sql,
                        maDonThuoc
                );

        if (result.isEmpty()) {

            throw new RuntimeException(
                    "Không tìm thấy đơn thuốc: "
                            + maDonThuoc
            );
        }

        return result.get(0);
    }

    // =====================================================
    // THUỐC TRONG ĐƠN
    // =====================================================


    private List<Map<String, Object>> getMedicines(
            Integer maDonThuoc
    ) {
        String sql = """
        SELECT
            ct.MaCTDonThuoc,
            ct.MaThuoc,
            ct.MaThuocThucCap,

            COALESCE(ct.MaThuocThucCap, ct.MaThuoc)
                AS MaThuocHienThi,

            t.TenThuoc,
            t.DonViTinh,

            ct.SoLuong,

            CASE
                WHEN ct.MaThuocThucCap IS NOT NULL
                    THEN t.Gia
                ELSE ct.DonGiaBan
            END AS DonGiaBan,

            ct.LieuDung,
            ct.ThoiGianDung,
            ct.HuongDanSuDung

        FROM CTDonThuoc ct

        INNER JOIN Thuoc t
            ON t.MaThuoc = COALESCE(
                ct.MaThuocThucCap,
                ct.MaThuoc
            )

        WHERE ct.MaDonThuoc = ?

        ORDER BY ct.MaCTDonThuoc
        """;

        return jdbcTemplate.queryForList(
                sql,
                maDonThuoc
        );
    }


    // =====================================================
    // CHỈ ĐỊNH Y TẾ
    // =====================================================

    private List<Map<String, Object>> getIndications(Integer maHoSoBenhAn) {

        if (maHoSoBenhAn == null || maHoSoBenhAn <= 0) {
            return List.of();
        }

        String sql = """
        SELECT
            MaChiDinh,
            MaDichVu,
            MaPhong,
            NgayChiDinh,
            LoaiChiDinh,
            TrangThai
        FROM ChiDinhYTe
        WHERE MaHoSoBenhAn = ?
        ORDER BY MaChiDinh
    """;

        return jdbcTemplate.queryForList(
                sql,
                maHoSoBenhAn
        );
    }

    // =====================================================
    // PDF 1
    // ĐƠN THUỐC
    // KHÔNG CÓ TIỀN
    // =====================================================

    public byte[] generatePrescriptionPdf(
            Integer maDonThuoc
    ) {

        Map<String, Object> order =
                getOrder(maDonThuoc);

        List<Map<String, Object>> medicines =
                getMedicines(maDonThuoc);

        List<Map<String, Object>> indications =
                getIndications(
                        number(
                                order.get("MaHoSoBenhAn")
                        )
                );

        try {

            ByteArrayOutputStream output =
                    new ByteArrayOutputStream();

            Document document =
                    new Document(
                            PageSize.A4,
                            45,
                            45,
                            40,
                            40
                    );

            PdfWriter.getInstance(
                    document,
                    output
            );

            document.open();

            // =================================================
            // HEADER
            // =================================================

            PdfPTable header =
                    new PdfPTable(2);

            header.setWidthPercentage(100);

            header.setWidths(
                    new float[]{
                            70,
                            30
                    }
            );

            // -------------------------------------------------
            // BÊN TRÁI
            // -------------------------------------------------

            PdfPCell hospitalCell =
                    new PdfPCell();

            hospitalCell.setBorder(
                    Rectangle.NO_BORDER
            );

            hospitalCell.setPadding(0);

            Paragraph hospital =
                    new Paragraph();

            hospital.setAlignment(
                    Element.ALIGN_LEFT
            );

            hospital.add(
                    new Chunk(
                            "MEDCARE HOSPITAL\n",
                            boldFont(16)
                    )
            );

            hospital.add(
                    new Chunk(
                            "HỆ THỐNG QUẢN LÝ KHÁM CHỮA BỆNH\n",
                            normalFont(10)
                    )
            );

            hospital.add(
                    new Chunk(
                            "Khoa Dược",
                            normalFont(10)
                    )
            );

            hospitalCell.addElement(
                    hospital
            );

            header.addCell(
                    hospitalCell
            );

            // -------------------------------------------------
            // BÊN PHẢI
            // -------------------------------------------------

            PdfPCell codeCell =
                    new PdfPCell();

            codeCell.setBorder(
                    Rectangle.NO_BORDER
            );

            codeCell.setPadding(0);

            Paragraph codes =
                    new Paragraph();

            codes.setAlignment(
                    Element.ALIGN_RIGHT
            );

            // MÃ BỆNH NHÂN
            codes.add(
                    new Chunk(
                            "Mã bệnh nhân: ",
                            boldFont(10)
                    )
            );

            codes.add(
                    new Chunk(
                            "BN" + String.format(
                                    "%05d",
                                    number(
                                            order.get("MaBenhNhan")
                                    )
                            ) + "\n",
                            normalFont(10)
                    )
            );

            // MÃ ĐƠN THUỐC
            codes.add(
                    new Chunk(
                            "Mã đơn thuốc: ",
                            boldFont(10)
                    )
            );

            codes.add(
                    new Chunk(
                            "DP" + String.format(
                                    "%05d",
                                    maDonThuoc
                            ),
                            normalFont(10)
                    )
            );

            codeCell.addElement(
                    codes
            );

            header.addCell(
                    codeCell
            );

            document.add(
                    header
            );

            // =================================================
            // ĐƯỜNG KẺ
            // =================================================

            PdfPTable lineTable = new PdfPTable(1);
            lineTable.setWidthPercentage(100);

            PdfPCell lineCell = new PdfPCell();
            lineCell.setBorder(Rectangle.BOTTOM);
            lineCell.setBorderWidthBottom(1f);
            lineCell.setPadding(0);
            lineCell.setFixedHeight(1);

            lineTable.addCell(lineCell);

            lineTable.setSpacingBefore(5);
            lineTable.setSpacingAfter(5);

            document.add(lineTable);

            // =================================================
            // TITLE
            // =================================================

            Paragraph title =
                    new Paragraph(
                            "ĐƠN THUỐC",
                            boldFont(21)
                    );

            title.setAlignment(
                    Element.ALIGN_CENTER
            );

            title.setSpacingBefore(8);
            title.setSpacingAfter(2);

            document.add(title);

            Paragraph subtitle =
                    new Paragraph(
                            "Đơn thuốc đã cấp",
                            italicFont(13)
                    );

            subtitle.setAlignment(
                    Element.ALIGN_CENTER
            );

            subtitle.setSpacingAfter(15);

            document.add(subtitle);

            // =================================================
            // THÔNG TIN BỆNH NHÂN
            // =================================================

            PdfPTable patient =
                    new PdfPTable(2);

            patient.setWidthPercentage(100);

            patient.setWidths(
                    new float[]{
                            50,
                            50
                    }
            );

            // -------------------------------------------------
            // HỌ TÊN
            // -------------------------------------------------

            PdfPCell patientNameCell =
                    new PdfPCell();

            patientNameCell.setBorder(
                    Rectangle.NO_BORDER
            );

            patientNameCell.setPadding(5);

            Paragraph patientNameParagraph =
                    new Paragraph();

            patientNameParagraph.add(
                    new Chunk(
                            "Họ và tên: ",
                            normalFont(11)
                    )
            );

            patientNameParagraph.add(
                    new Chunk(
                            upperCaseVietnamese(
                                    order.get(
                                            "TenBenhNhan"
                                    )
                            ),
                            boldFont(11)
                    )
            );

            patientNameCell.addElement(
                    patientNameParagraph
            );

            patient.addCell(
                    patientNameCell
            );

            // -------------------------------------------------
            // GIỚI TÍNH
            // -------------------------------------------------

            addNoBorderCell(
                    patient,
                    "Giới tính: "
                            + value(
                            order.get(
                                    "GioiTinh"
                            )
                    ),
                    normalFont(11)
            );

            // -------------------------------------------------
            // NGÀY SINH
            // -------------------------------------------------

            addNoBorderCell(
                    patient,
                    "Ngày sinh: "
                            + formatDate(
                            order.get(
                                    "NgaySinh"
                            )
                    ),
                    normalFont(11)
            );

            // -------------------------------------------------
            // ĐỊA CHỈ
            // -------------------------------------------------

            addNoBorderCell(
                    patient,
                    "Địa chỉ: "
                            + value(
                            order.get(
                                    "DiaChi"
                            )
                    ),
                    normalFont(11)
            );

            // -------------------------------------------------
            // CÂN NẶNG
            // -------------------------------------------------

            addNoBorderCell(
                    patient,
                    "Cân nặng: "
                            + value(
                            order.get(
                                    "CanNang"
                            )
                    )
                            + " kg",
                    normalFont(11)
            );

            // -------------------------------------------------
            // HUYẾT ÁP
            // -------------------------------------------------

            String huyetAp;

            Object tamThu =
                    order.get(
                            "HuyetApTamThu"
                    );

            Object tamTruong =
                    order.get(
                            "HuyetApTamTruong"
                    );

            if (
                    tamThu != null
                            && tamTruong != null
            ) {

                huyetAp =
                        String.valueOf(
                                tamThu
                        )
                                + "/"
                                + String.valueOf(
                                tamTruong
                        )
                                + " mmHg";

            } else {

                huyetAp = "-";
            }

            addNoBorderCell(
                    patient,
                    "Huyết áp: "
                            + huyetAp,
                    normalFont(11)
            );


            // -------------------------------------------------
            // CHẨN ĐOÁN
            // -------------------------------------------------

            PdfPCell diagnosisCell =
                    new PdfPCell(
                            new Paragraph(
                                    "Chẩn đoán: "
                                            + value(
                                            order.get(
                                                    "ChanDoan"
                                            )
                                    ),
                                    normalFont(11)
                            )
                    );

            diagnosisCell.setBorder(
                    Rectangle.NO_BORDER
            );

            diagnosisCell.setPadding(5);

            diagnosisCell.setColspan(2);

            patient.addCell(
                    diagnosisCell
            );

            document.add(
                    patient
            );

            // =================================================
            // BÁC SĨ + NGÀY KÊ
            // =================================================

            PdfPTable doctorInfo =
                    new PdfPTable(1);

            doctorInfo.setWidthPercentage(100);

            // -------------------------------------------------
            // BÁC SĨ
            // -------------------------------------------------

            PdfPCell doctorCell =
                    new PdfPCell();

            doctorCell.setBorder(
                    Rectangle.NO_BORDER
            );

            doctorCell.setPadding(5);

            Paragraph doctorParagraph =
                    new Paragraph();

            doctorParagraph.add(
                    new Chunk(
                            "Bác sĩ kê đơn: ",
                            normalFont(11)
                    )
            );

            doctorParagraph.add(
                    new Chunk(
                            value(
                                    order.get("TenBacSi")
                            ),
                            normalFont(11)
                    )
            );

            doctorCell.addElement(
                    doctorParagraph
            );

            doctorInfo.addCell(
                    doctorCell
            );

            // -------------------------------------------------
            // NGÀY KÊ - XUỐNG DÒNG
            // -------------------------------------------------

            PdfPCell dateCell =
                    new PdfPCell();

            dateCell.setBorder(
                    Rectangle.NO_BORDER
            );

            dateCell.setPadding(5);

            Paragraph dateParagraph =
                    new Paragraph();

            dateParagraph.add(
                    new Chunk(
                            "Ngày kê: ",
                            normalFont(11)
                    )
            );

            dateParagraph.add(
                    new Chunk(
                            formatDate(
                                    order.get("NgayKeThuoc")
                            ),
                            normalFont(11)
                    )
            );

            dateCell.addElement(
                    dateParagraph
            );

            doctorInfo.addCell(
                    dateCell
            );

            // -------------------------------------------------
            // NGÀY TÁI KHÁM
            // -------------------------------------------------

            PdfPCell followUpDateCell =
                    new PdfPCell();

            followUpDateCell.setBorder(
                    Rectangle.NO_BORDER
            );

            followUpDateCell.setPadding(5);

            Paragraph followUpDateParagraph =
                    new Paragraph();

            followUpDateParagraph.add(
                    new Chunk(
                            "Ngày tái khám: ",
                            normalFont(11)
                    )
            );

            Object ngayTaiKham =
                    order.get("NgayTaiKham");

            followUpDateParagraph.add(
                    new Chunk(
                            ngayTaiKham != null
                                    ? formatDate(ngayTaiKham)
                                    : "Chưa có",
                            normalFont(11)
                    )
            );

            followUpDateCell.addElement(
                    followUpDateParagraph
            );

            doctorInfo.addCell(
                    followUpDateCell
            );

            // Thêm bảng sau khi đã có đầy đủ ngày kê và ngày tái khám
            document.add(
                    doctorInfo
            );

            // =================================================
            // DANH SÁCH THUỐC
            // =================================================

            Paragraph medicineTitle =
                    new Paragraph(
                            "CHỈ ĐỊNH DÙNG THUỐC:",
                            boldFont(11)
                    );

            medicineTitle.setSpacingBefore(10);
            medicineTitle.setSpacingAfter(7);

            document.add(
                    medicineTitle
            );

            int medicineIndex = 1;

            for (
                    Map<String, Object> medicine
                    : medicines
            ) {

                PdfPTable medicineTable =
                        new PdfPTable(1);

                medicineTable.setWidthPercentage(
                        100
                );

                // -------------------------------------------------
                // TÊN THUỐC + SỐ LƯỢNG
                // -------------------------------------------------

                Paragraph medicineParagraph =
                        new Paragraph();

                medicineParagraph.setSpacingAfter(
                        2
                );

                medicineParagraph.add(
                        new Chunk(
                                medicineIndex
                                        + ". "
                                        + upperCaseVietnamese(
                                        medicine.get(
                                                "TenThuoc"
                                        )
                                ),
                                boldFont(11)
                        )
                );

                medicineParagraph.add(
                        new Chunk(
                                "  -  Số lượng: "
                                        + value(
                                        medicine.get(
                                                "SoLuong"
                                        )
                                )
                                        + " "
                                        + value(
                                        medicine.get(
                                                "DonViTinh"
                                        )
                                ),
                                normalFont(11)
                        )
                );

                PdfPCell medicineCell =
                        new PdfPCell(
                                medicineParagraph
                        );

                medicineCell.setBorder(
                        Rectangle.NO_BORDER
                );

                medicineCell.setPadding(
                        3
                );

                medicineTable.addCell(
                        medicineCell
                );

                // -------------------------------------------------
                // CÁCH DÙNG
                // -------------------------------------------------

                Paragraph usageParagraph =
                        new Paragraph();

                usageParagraph.setIndentationLeft(
                        15
                );

                usageParagraph.setSpacingAfter(
                        2
                );

                usageParagraph.add(
                        new Chunk(
                                "Cách dùng: ",
                                italicFont(10)
                        )
                );

                usageParagraph.add(
                        new Chunk(
                                value(
                                        medicine.get(
                                                "HuongDanSuDung"
                                        )
                                ),
                                normalFont(10)
                        )
                );

                PdfPCell usageCell =
                        new PdfPCell(
                                usageParagraph
                        );

                usageCell.setBorder(
                        Rectangle.NO_BORDER
                );

                usageCell.setPadding(
                        3
                );

                medicineTable.addCell(
                        usageCell
                );

                // -------------------------------------------------
                // LIỀU
                // -------------------------------------------------

                Paragraph doseParagraph =
                        new Paragraph();

                doseParagraph.setIndentationLeft(
                        15
                );

                doseParagraph.setSpacingAfter(
                        2
                );

                doseParagraph.add(
                        new Chunk(
                                "Liều: ",
                                normalFont(10)
                        )
                );

                doseParagraph.add(
                        new Chunk(
                                value(
                                        medicine.get(
                                                "LieuDung"
                                        )
                                ),
                                normalFont(10)
                        )
                );

                PdfPCell doseCell =
                        new PdfPCell(
                                doseParagraph
                        );

                doseCell.setBorder(
                        Rectangle.NO_BORDER
                );

                doseCell.setPadding(
                        3
                );

                medicineTable.addCell(
                        doseCell
                );

                // -------------------------------------------------
                // THỜI GIAN DÙNG
                // -------------------------------------------------

                Object thoiGianDung =
                        medicine.get(
                                "ThoiGianDung"
                        );

                if (
                        thoiGianDung != null
                                && !String.valueOf(
                                thoiGianDung
                        ).trim().isEmpty()
                ) {

                    Paragraph timeParagraph =
                            new Paragraph();

                    timeParagraph.setIndentationLeft(
                            15
                    );

                    timeParagraph.setSpacingAfter(
                            5
                    );

                    timeParagraph.add(
                            new Chunk(
                                    "Thời gian dùng: ",
                                    normalFont(10)
                            )
                    );

                    timeParagraph.add(
                            new Chunk(
                                    value(
                                            thoiGianDung
                                    ),
                                    normalFont(10)
                            )
                    );

                    PdfPCell timeCell =
                            new PdfPCell(
                                    timeParagraph
                            );

                    timeCell.setBorder(
                            Rectangle.NO_BORDER
                    );

                    timeCell.setPadding(
                            3
                    );

                    medicineTable.addCell(
                            timeCell
                    );
                }

                document.add(
                        medicineTable
                );

                medicineIndex++;
            }

            // =================================================
            // LỜI DẶN
            // =================================================

            Paragraph noteTitle =
                    new Paragraph(
                            "LỜI DẶN:",
                            boldFont(12)
                    );

            noteTitle.setSpacingBefore(10);
            noteTitle.setSpacingAfter(4);

            document.add(
                    noteTitle
            );

            Paragraph noteParagraph =
                    new Paragraph(
                            value(
                                    order.get(
                                            "GhiChu"
                                    )
                            ),
                            normalFont(11)
                    );

            noteParagraph.setIndentationLeft(
                    10
            );

            noteParagraph.setSpacingAfter(
                    5
            );

            document.add(
                    noteParagraph
            );

            // =================================================
            // CHỈ ĐỊNH Y TẾ
            // =================================================

            if (!indications.isEmpty()) {

                Paragraph medicalIndicationTitle =
                        new Paragraph(
                                "CHỈ ĐỊNH:",
                                boldFont(12)
                        );

                medicalIndicationTitle.setSpacingBefore(5);
                medicalIndicationTitle.setSpacingAfter(5);

                document.add(medicalIndicationTitle);

                int indicationIndex = 1;

                for (Map<String, Object> indicationItem : indications) {

                    String loaiChiDinh =
                            value(indicationItem.get("LoaiChiDinh"));

                    Paragraph indicationParagraph =
                            new Paragraph();

                    indicationParagraph.setIndentationLeft(10);
                    indicationParagraph.setSpacingAfter(3);

                    indicationParagraph.add(
                            new Chunk(
                                    indicationIndex + ". "
                                            + loaiChiDinh,
                                    normalFont(11)
                            )
                    );

                    document.add(indicationParagraph);

                    indicationIndex++;
                }
            }
            // =================================================
            // CHỮ KÝ
            // =================================================

            PdfPTable signature =
                    new PdfPTable(1);

            signature.setWidthPercentage(
                    35
            );

            signature.setHorizontalAlignment(
                    Element.ALIGN_RIGHT
            );

            PdfPCell signatureCell =
                    new PdfPCell();

            signatureCell.setBorder(
                    Rectangle.NO_BORDER
            );

            signatureCell.setPaddingTop(
                    25
            );

            Paragraph dateSignature =
                    new Paragraph(
                            formatDateVietnamese(
                                    order.get("NgayKeThuoc")
                            ),
                            normalFont(11)
                    );

            dateSignature.setAlignment(
                    Element.ALIGN_CENTER
            );

            signatureCell.addElement(
                    dateSignature
            );

            Paragraph signatureTitle =
                    new Paragraph(
                            "Bác sĩ kê đơn",
                            normalFont(11)
                    );

            signatureTitle.setAlignment(
                    Element.ALIGN_CENTER
            );

            signatureTitle.setSpacingBefore(
                    3
            );

            signatureCell.addElement(
                    signatureTitle
            );

            Paragraph doctorName =
                    new Paragraph(
                            value(
                                    order.get(
                                            "TenBacSi"
                                    )
                            ),
                            normalFont(11)
                    );

            doctorName.setAlignment(
                    Element.ALIGN_CENTER
            );

            doctorName.setSpacingBefore(
                    35
            );

            signatureCell.addElement(
                    doctorName
            );

            signature.addCell(
                    signatureCell
            );

            document.add(
                    signature
            );

            // =================================================
            // CLOSE
            // =================================================

            document.close();

            return output.toByteArray();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Lỗi khi tạo PDF đơn thuốc.",
                    e
            );
        }
    }

    // =====================================================
    // PDF 2
    // HÓA ĐƠN
    // CÓ TIỀN
    // =====================================================

    public byte[] generateInvoicePdf(
            Integer maDonThuoc
    ) {

        Map<String, Object> order =
                getOrder(maDonThuoc);

        List<Map<String, Object>> medicines =
                getMedicines(maDonThuoc);

        try {

            ByteArrayOutputStream output =
                    new ByteArrayOutputStream();

            Document document =
                    new Document(
                            PageSize.A4,
                            45,
                            45,
                            40,
                            40
                    );

            PdfWriter.getInstance(
                    document,
                    output
            );

            document.open();

            // =================================================
            // HEADER
            // =================================================

            PdfPTable header =
                    new PdfPTable(2);

            header.setWidthPercentage(100);

            header.setWidths(
                    new float[]{
                            70,
                            30
                    }
            );

            PdfPCell hospitalCell =
                    new PdfPCell();

            hospitalCell.setBorder(
                    Rectangle.NO_BORDER
            );

            hospitalCell.setPadding(0);

            Paragraph hospital =
                    new Paragraph();

            hospital.setAlignment(
                    Element.ALIGN_LEFT
            );

            hospital.add(
                    new Chunk(
                            "MEDCARE HOSPITAL\n",
                            boldFont(14)
                    )
            );

            hospital.add(
                    new Chunk(
                            "HỆ THỐNG QUẢN LÝ KHÁM CHỮA BỆNH\n",
                            normalFont(10)
                    )
            );

            hospital.add(
                    new Chunk(
                            "Khoa Dược",
                            normalFont(10)
                    )
            );

            hospitalCell.addElement(
                    hospital
            );

            header.addCell(
                    hospitalCell
            );

            PdfPCell codeCell =
                    new PdfPCell();

            codeCell.setBorder(
                    Rectangle.NO_BORDER
            );

            codeCell.setPadding(0);

            Paragraph codes =
                    new Paragraph();

            codes.setAlignment(
                    Element.ALIGN_RIGHT
            );

            // MÃ BỆNH NHÂN
            codes.add(
                    new Chunk(
                            "Mã bệnh nhân: ",
                            boldFont(10)
                    )
            );

            codes.add(
                    new Chunk(
                            "BN" + String.format(
                                    "%05d",
                                    number(
                                            order.get("MaBenhNhan")
                                    )
                            ) + "\n",
                            normalFont(10)
                    )
            );

            // MÃ ĐƠN THUỐC
            codes.add(
                    new Chunk(
                            "Mã đơn thuốc: ",
                            boldFont(10)
                    )
            );

            codes.add(
                    new Chunk(
                            "DP" + String.format(
                                    "%05d",
                                    maDonThuoc
                            ),
                            normalFont(10)
                    )
            );

            codeCell.addElement(
                    codes
            );

            header.addCell(
                    codeCell
            );

            document.add(
                    header
            );

            // =================================================
            // ĐƯỜNG KẺ
            // =================================================

            PdfPTable lineTable = new PdfPTable(1);
            lineTable.setWidthPercentage(100);

            PdfPCell lineCell = new PdfPCell();
            lineCell.setBorder(Rectangle.BOTTOM);
            lineCell.setBorderWidthBottom(1f);
            lineCell.setPadding(0);
            lineCell.setFixedHeight(1);

            lineTable.addCell(lineCell);

            lineTable.setSpacingBefore(5);
            lineTable.setSpacingAfter(5);

            document.add(lineTable);


            // =================================================
            // TITLE
            // =================================================

            Paragraph title =
                    new Paragraph(
                            "HÓA ĐƠN THUỐC",
                            boldFont(22)
                    );

            title.setAlignment(
                    Element.ALIGN_CENTER
            );

            title.setSpacingBefore(
                    15
            );

            title.setSpacingAfter(
                    15
            );

            document.add(
                    title
            );

            // =================================================
            // THÔNG TIN BỆNH NHÂN
            // =================================================

            PdfPTable patient =
                    new PdfPTable(2);

            patient.setWidthPercentage(100);

            patient.setWidths(
                    new float[]{
                            50,
                            50
                    }
            );

            // -------------------------------------------------
            // HỌ VÀ TÊN
            // -------------------------------------------------

            PdfPCell patientNameCell =
                    new PdfPCell();

            patientNameCell.setBorder(
                    Rectangle.NO_BORDER
            );

            patientNameCell.setPadding(5);

            Paragraph patientNameParagraph =
                    new Paragraph();

            patientNameParagraph.add(
                    new Chunk(
                            "Họ và tên: ",
                            normalFont(11)
                    )
            );

            patientNameParagraph.add(
                    new Chunk(
                            upperCaseVietnamese(
                                    order.get("TenBenhNhan")
                            ),
                            boldFont(11)
                    )
            );

            patientNameCell.addElement(
                    patientNameParagraph
            );

            patient.addCell(
                    patientNameCell
            );

            // -------------------------------------------------
            // GIỚI TÍNH
            // -------------------------------------------------

            addNoBorderCell(
                    patient,
                    "Giới tính: "
                            + value(
                            order.get("GioiTinh")
                    ),
                    normalFont(11)
            );

            // -------------------------------------------------
            // NGÀY SINH
            // -------------------------------------------------

            addNoBorderCell(
                    patient,
                    "Ngày sinh: "
                            + formatDate(
                            order.get("NgaySinh")
                    ),
                    normalFont(11)
            );

            // -------------------------------------------------
            // ĐỊA CHỈ
            // -------------------------------------------------

            addNoBorderCell(
                    patient,
                    "Địa chỉ: "
                            + value(
                            order.get("DiaChi")
                    ),
                    normalFont(11)
            );

            // -------------------------------------------------
            // CÂN NẶNG
            // -------------------------------------------------

            addNoBorderCell(
                    patient,
                    "Cân nặng: "
                            + value(
                            order.get("CanNang")
                    )
                            + " kg",
                    normalFont(11)
            );

            // -------------------------------------------------
            // HUYẾT ÁP
            // -------------------------------------------------

            String huyetAp;

            Object tamThu =
                    order.get("HuyetApTamThu");

            Object tamTruong =
                    order.get("HuyetApTamTruong");

            if (
                    tamThu != null
                            && tamTruong != null
            ) {

                huyetAp =
                        String.valueOf(tamThu)
                                + "/"
                                + String.valueOf(tamTruong)
                                + " mmHg";

            } else {

                huyetAp = "-";
            }

            addNoBorderCell(
                    patient,
                    "Huyết áp: "
                            + huyetAp,
                    normalFont(11)
            );

            // -------------------------------------------------
            // CHẨN ĐOÁN
            // -------------------------------------------------

            PdfPCell diagnosisCell =
                    new PdfPCell();

            diagnosisCell.setBorder(
                    Rectangle.NO_BORDER
            );

            diagnosisCell.setPadding(5);

            diagnosisCell.setColspan(2);

            Paragraph diagnosisParagraph =
                    new Paragraph();

            diagnosisParagraph.add(
                    new Chunk(
                            "Chẩn đoán: ",
                            normalFont(11)
                    )
            );

            diagnosisParagraph.add(
                    new Chunk(
                            value(
                                    order.get("ChanDoan")
                            ),
                            normalFont(11)
                    )
            );

            diagnosisCell.addElement(
                    diagnosisParagraph
            );

            patient.addCell(
                    diagnosisCell
            );

            // -------------------------------------------------
            // BÁC SĨ + NGÀY KÊ
            // -------------------------------------------------

            PdfPCell doctorCell =
                    new PdfPCell();

            doctorCell.setBorder(
                    Rectangle.NO_BORDER
            );

            doctorCell.setPadding(5);

            Paragraph doctorParagraph =
                    new Paragraph();

            doctorParagraph.add(
                    new Chunk(
                            "Bác sĩ kê đơn: ",
                            normalFont(11)
                    )
            );

            doctorParagraph.add(
                    new Chunk(
                            value(
                                    order.get("TenBacSi")
                            ),
                            normalFont(11)
                    )
            );

            doctorCell.addElement(
                    doctorParagraph
            );

            patient.addCell(
                    doctorCell
            );

            // -------------------------------------------------
            // NGÀY KÊ
            // -------------------------------------------------

            PdfPCell dateCell =
                    new PdfPCell();

            dateCell.setBorder(
                    Rectangle.NO_BORDER
            );

            dateCell.setPadding(5);

            Paragraph dateParagraph =
                    new Paragraph();

            dateParagraph.add(
                    new Chunk(
                            "Ngày kê: ",
                            normalFont(11)
                    )
            );

            dateParagraph.add(
                    new Chunk(
                            formatDate(
                                    order.get("NgayKeThuoc")
                            ),
                            normalFont(11)
                    )
            );

            dateCell.addElement(
                    dateParagraph
            );

            patient.addCell(
                    dateCell
            );

            // -------------------------------------------------
            // NGÀY TÁI KHÁM
            // -------------------------------------------------

            PdfPCell followUpDateCell =
                    new PdfPCell();

            followUpDateCell.setBorder(
                    Rectangle.NO_BORDER
            );

            followUpDateCell.setPadding(5);

            Paragraph followUpDateParagraph =
                    new Paragraph();

            followUpDateParagraph.add(
                    new Chunk(
                            "Ngày tái khám: ",
                            normalFont(11)
                    )
            );

            Object ngayTaiKham =
                    order.get("NgayTaiKham");

            followUpDateParagraph.add(
                    new Chunk(
                            ngayTaiKham != null
                                    ? formatDate(ngayTaiKham)
                                    : "Chưa có",
                            normalFont(11)
                    )
            );

            followUpDateCell.addElement(
                    followUpDateParagraph
            );

            patient.addCell(
                    followUpDateCell
            );

            // Ô trống để giữ bố cục bảng 2 cột
            PdfPCell emptyCell =
                    new PdfPCell();

            emptyCell.setBorder(
                    Rectangle.NO_BORDER
            );

            emptyCell.setPadding(5);

            patient.addCell(
                    emptyCell
            );

            // Thêm bảng thông tin bệnh nhân sau khi đã có ngày tái khám
            document.add(patient);
            // =================================================
            // BẢNG THUỐC
            // =================================================

            Paragraph medicineTitle =
                    new Paragraph(
                            "CHI TIẾT THUỐC",
                            boldFont(13)
                    );

            medicineTitle.setSpacingBefore(
                    15
            );

            medicineTitle.setSpacingAfter(
                    8
            );

            document.add(
                    medicineTitle
            );

            PdfPTable medicineTable =
                    new PdfPTable(5);

            medicineTable.setWidthPercentage(
                    100
            );

            medicineTable.setWidths(
                    new float[]{
                            7,
                            35,
                            12,
                            18,
                            28
                    }
            );

            addHeaderCell(
                    medicineTable,
                    "STT"
            );

            addHeaderCell(
                    medicineTable,
                    "Tên thuốc"
            );

            addHeaderCell(
                    medicineTable,
                    "SL"
            );

            addHeaderCell(
                    medicineTable,
                    "Đơn giá"
            );

            addHeaderCell(
                    medicineTable,
                    "Thành tiền"
            );

            BigDecimal total =
                    BigDecimal.ZERO;

            int index = 1;

            for (
                    Map<String, Object> medicine
                    : medicines
            ) {

                BigDecimal quantity =
                        toBigDecimal(
                                medicine.get(
                                        "SoLuong"
                                )
                        );

                BigDecimal price =
                        toBigDecimal(
                                medicine.get(
                                        "DonGiaBan"
                                )
                        );

                BigDecimal amount =
                        quantity.multiply(
                                price
                        );

                total =
                        total.add(
                                amount
                        );

                addBodyCell(
                        medicineTable,
                        String.valueOf(
                                index
                        )
                );

                addBodyCell(
                        medicineTable,
                        value(
                                medicine.get(
                                        "TenThuoc"
                                )
                        )
                );

                addBodyCell(
                        medicineTable,
                        formatNumber(quantity)
                );

                addBodyCell(
                        medicineTable,
                        formatCurrency(
                                price
                        )
                );

                addBodyCell(
                        medicineTable,
                        formatCurrency(
                                amount
                        )
                );

                index++;
            }

            document.add(
                    medicineTable
            );

            // =================================================
            // TỔNG TIỀN
            // =================================================

            Paragraph totalParagraph =
                    new Paragraph();

            totalParagraph.setAlignment(
                    Element.ALIGN_RIGHT
            );

            totalParagraph.setSpacingBefore(8);
            totalParagraph.setSpacingAfter(5);

            totalParagraph.add(
                    new Chunk(
                            "TỔNG TIỀN: ",
                            boldFont(12)
                    )
            );

            totalParagraph.add(
                    new Chunk(
                            formatCurrency(total),
                            boldFont(12)
                    )
            );

            document.add(
                    totalParagraph
            );

            // =================================================
            // GIÁ TIỀN BẰNG CHỮ
            // =================================================

            Paragraph moneyText =
                    new Paragraph();

            moneyText.setSpacingBefore(3);
            moneyText.setSpacingAfter(8);

            moneyText.add(
                    new Chunk(
                            "Giá tiền bằng chữ: ",
                            normalFont(11)
                    )
            );

            moneyText.add(
                    new Chunk(
                            numberToVietnameseWords(total),
                            italicFont(11)
                    )
            );

            document.add(
                    moneyText
            );

            // =================================================
            // NGÀY CẤP
            // =================================================

            Paragraph dispensingDate =
                    new Paragraph(
                            "Ngày cấp thuốc: "
                                    + formatDate(
                                    order.get(
                                            "ThoiGianCap"
                                    ),
                                    "dd-MM-yyyy"
                            ),
                            normalFont(11)
                    );

            dispensingDate.setSpacingBefore(
                    8
            );

            document.add(
                    dispensingDate
            );

            // =================================================
            // CHỮ KÝ
            // =================================================

            PdfPTable signature =
                    new PdfPTable(1);

            signature.setWidthPercentage(
                    35
            );

            signature.setHorizontalAlignment(
                    Element.ALIGN_RIGHT
            );

            PdfPCell signatureCell =
                    new PdfPCell();

            signatureCell.setBorder(
                    Rectangle.NO_BORDER
            );

            signatureCell.setPaddingTop(
                    25
            );

            Paragraph signatureDate =
                    new Paragraph(
                            formatDateVietnamese(
                                    order.get("ThoiGianCap")
                            ),
                            normalFont(11)
                    );

            signatureDate.setAlignment(
                    Element.ALIGN_CENTER
            );

            signatureCell.addElement(
                    signatureDate
            );

            Paragraph signatureTitle =
                    new Paragraph(
                            "Người cấp thuốc",
                            boldFont(11)
                    );

            signatureTitle.setAlignment(
                    Element.ALIGN_CENTER
            );

            signatureTitle.setSpacingBefore(
                    3
            );

            signatureCell.addElement(
                    signatureTitle
            );

            Paragraph dispenserName =
                    new Paragraph(
                            value(
                                    order.get(
                                            "TenNguoiCap"
                                    )
                            ),
                            normalFont(11)
                    );

            dispenserName.setAlignment(
                    Element.ALIGN_CENTER
            );

            dispenserName.setSpacingBefore(
                    35
            );

            signatureCell.addElement(
                    dispenserName
            );

            signature.addCell(
                    signatureCell
            );

            document.add(
                    signature
            );

            // =================================================
            // CLOSE
            // =================================================

            document.close();

            return output.toByteArray();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Lỗi khi tạo PDF hóa đơn.",
                    e
            );
        }
    }

    // =====================================================
    // HELPER
    // =====================================================

    private void addNoBorderCell(
            PdfPTable table,
            String text,
            Font font
    ) {

        PdfPCell cell =
                new PdfPCell(
                        new Paragraph(
                                text,
                                font
                        )
                );

        cell.setBorder(
                Rectangle.NO_BORDER
        );

        cell.setPadding(
                5
        );

        table.addCell(
                cell
        );
    }

    private void addHeaderCell(
            PdfPTable table,
            String text
    ) {

        PdfPCell cell =
                new PdfPCell(
                        new Paragraph(
                                text,
                                boldFont(10)
                        )
                );

        cell.setHorizontalAlignment(
                Element.ALIGN_CENTER
        );

        cell.setVerticalAlignment(
                Element.ALIGN_MIDDLE
        );

        cell.setPadding(
                6
        );

        cell.setBackgroundColor(
                new Color(
                        230,
                        230,
                        230
                )
        );

        table.addCell(
                cell
        );
    }

    private void addBodyCell(
            PdfPTable table,
            String text
    ) {

        PdfPCell cell =
                new PdfPCell(
                        new Paragraph(
                                text,
                                normalFont(10)
                        )
                );

        cell.setVerticalAlignment(
                Element.ALIGN_MIDDLE
        );

        cell.setPadding(
                5
        );

        table.addCell(
                cell
        );
    }

    private String value(
            Object value
    ) {

        if (value == null) {
            return "-";
        }

        String text =
                String.valueOf(
                        value
                ).trim();

        if (text.isEmpty()) {
            return "-";
        }

        return text;
    }

    private Integer number(
            Object value
    ) {

        if (value == null) {
            return 0;
        }

        if (value instanceof Number) {

            return (
                    (Number) value
            ).intValue();
        }

        try {

            return Integer.parseInt(
                    String.valueOf(
                            value
                    )
            );

        } catch (Exception e) {

            return 0;
        }
    }

    private BigDecimal toBigDecimal(
            Object value
    ) {

        if (value == null) {
            return BigDecimal.ZERO;
        }

        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }

        if (value instanceof Number) {

            return BigDecimal.valueOf(
                    ((Number) value)
                            .doubleValue()
            );
        }

        try {

            return new BigDecimal(
                    String.valueOf(
                            value
                    )
            );

        } catch (Exception e) {

            return BigDecimal.ZERO;
        }
    }

    private String formatNumber(
            BigDecimal number
    ) {

        if (number == null) {
            return "0";
        }

        return number.stripTrailingZeros()
                .toPlainString();
    }

    private String formatCurrency(
            BigDecimal number
    ) {

        if (number == null) {
            number =
                    BigDecimal.ZERO;
        }

        NumberFormat formatter =
                NumberFormat.getNumberInstance(
                        new Locale(
                                "vi",
                                "VN"
                        )
                );

        formatter.setMaximumFractionDigits(
                0
        );

        return formatter.format(
                number
        );
    }

    // =====================================================
    // FORMAT DATE
    // =====================================================

    private String formatDate(
            Object value
    ) {

        if (value == null) {
            return "-";
        }

        if (value instanceof java.sql.Timestamp) {

            return (
                    (java.sql.Timestamp) value
            )
                    .toLocalDateTime()
                    .format(
                            DateTimeFormatter.ofPattern(
                                    "dd-MM-yyyy"
                            )
                    );
        }

        if (value instanceof java.sql.Date) {

            return (
                    (java.sql.Date) value
            )
                    .toLocalDate()
                    .format(
                            DateTimeFormatter.ofPattern(
                                    "dd-MM-yyyy"
                            )
                    );
        }

        String text =
                String.valueOf(
                        value
                ).trim();

        if (text.isEmpty()) {
            return "-";
        }

        try {

            if (text.contains("T")) {

                return LocalDateTime.parse(
                                text
                        )
                        .format(
                                DateTimeFormatter.ofPattern(
                                        "dd-MM-yyyy"
                                )
                        );
            }

        } catch (Exception ignored) {
        }

        try {

            return LocalDateTime.parse(
                            text,
                            DateTimeFormatter.ofPattern(
                                    "yyyy-MM-dd HH:mm:ss"
                            )
                    )
                    .format(
                            DateTimeFormatter.ofPattern(
                                    "dd-MM-yyyy"
                            )
                    );

        } catch (Exception ignored) {
        }

        try {

            return LocalDateTime.parse(
                            text,
                            DateTimeFormatter.ofPattern(
                                    "yyyy-MM-dd"
                            )
                    )
                    .format(
                            DateTimeFormatter.ofPattern(
                                    "dd-MM-yyyy"
                            )
                    );

        } catch (Exception ignored) {
        }

        return text;
    }

    private String formatDate(
            Object value,
            String pattern
    ) {

        if (value == null) {
            return "-";
        }

        if (value instanceof java.sql.Timestamp) {

            return (
                    (java.sql.Timestamp) value
            )
                    .toLocalDateTime()
                    .format(
                            DateTimeFormatter.ofPattern(
                                    pattern
                            )
                    );
        }

        if (value instanceof java.sql.Date) {

            return (
                    (java.sql.Date) value
            )
                    .toLocalDate()
                    .format(
                            DateTimeFormatter.ofPattern(
                                    pattern
                            )
                    );
        }

        String text =
                String.valueOf(
                        value
                ).trim();

        if (text.isEmpty()) {
            return "-";
        }

        try {

            if (text.contains("T")) {

                return LocalDateTime.parse(
                                text
                        )
                        .format(
                                DateTimeFormatter.ofPattern(
                                        pattern
                                )
                        );
            }

        } catch (Exception ignored) {
        }

        try {

            return LocalDateTime.parse(
                            text,
                            DateTimeFormatter.ofPattern(
                                    "yyyy-MM-dd HH:mm:ss"
                            )
                    )
                    .format(
                            DateTimeFormatter.ofPattern(
                                    pattern
                            )
                    );

        } catch (Exception ignored) {
        }

        try {

            return LocalDateTime.parse(
                            text,
                            DateTimeFormatter.ofPattern(
                                    "yyyy-MM-dd"
                            )
                    )
                    .format(
                            DateTimeFormatter.ofPattern(
                                    pattern
                            )
                    );

        } catch (Exception ignored) {
        }

        return text;
    }

    // =====================================================
    // NGÀY HIỆN TẠI
    // =====================================================

    private String currentDateVietnamese() {

        LocalDateTime now =
                LocalDateTime.now();

        return "Ngày "
                + now.getDayOfMonth()
                + " tháng "
                + now.getMonthValue()
                + " năm "
                + now.getYear();
    }

    // =====================================================
    // ĐỔI SỐ TIỀN THÀNH CHỮ
    // =====================================================

    private String numberToVietnameseWords(
            BigDecimal amount
    ) {

        if (amount == null) {
            return "Không đồng";
        }

        long number =
                amount.longValue();

        if (number == 0) {
            return "Không đồng";
        }

        if (number < 0) {

            return "Âm "
                    + numberToVietnameseWords(
                    BigDecimal.valueOf(
                            Math.abs(number)
                    )
            );
        }

        return readVietnameseNumber(
                number
        ) + " đồng";
    }

    private String readVietnameseNumber(
            long number
    ) {

        if (number < 1000) {

            return readUnder1000(
                    number
            );
        }

        if (number < 1_000_000) {

            long thousand =
                    number / 1000;

            long remainder =
                    number % 1000;

            String result =
                    readUnder1000(
                            thousand
                    )
                            + " nghìn";

            if (remainder > 0) {

                result +=
                        " "
                                + readUnder1000(
                                remainder
                        );
            }

            return result;
        }

        if (number < 1_000_000_000) {

            long million =
                    number / 1_000_000;

            long remainder =
                    number % 1_000_000;

            String result =
                    readUnder1000(
                            million
                    )
                            + " triệu";

            if (remainder > 0) {

                if (
                        remainder < 1000
                ) {

                    result +=
                            " không trăm "
                                    + readUnder1000(
                                    remainder
                            );

                } else {

                    result +=
                            " "
                                    + readVietnameseNumber(
                                    remainder
                            );
                }
            }

            return result;
        }

        if (number < 1_000_000_000_000L) {

            long billion =
                    number / 1_000_000_000L;

            long remainder =
                    number % 1_000_000_000L;

            String result =
                    readVietnameseNumber(
                            billion
                    )
                            + " tỷ";

            if (remainder > 0) {

                result +=
                        " "
                                + readVietnameseNumber(
                                remainder
                        );
            }

            return result;
        }

        return String.valueOf(
                number
        );
    }

    private String readUnder1000(
            long number
    ) {

        if (number < 10) {

            return digitWord(
                    (int) number
            );
        }

        if (number < 20) {

            if (number == 10) {
                return "mười";
            }

            return "mười "
                    + digitWord(
                    (int) (
                            number % 10
                    )
            );
        }

        if (number < 100) {

            int tens =
                    (int) (
                            number / 10
                    );

            int units =
                    (int) (
                            number % 10
                    );

            String result =
                    digitWord(
                            tens
                    )
                            + " mươi";

            if (units > 0) {

                if (units == 1) {

                    result +=
                            " mốt";

                } else if (
                        units == 5
                ) {

                    result +=
                            " lăm";

                } else {

                    result +=
                            " "
                                    + digitWord(
                                    units
                            );
                }
            }

            return result;
        }

        int hundreds =
                (int) (
                        number / 100
                );

        int remainder =
                (int) (
                        number % 100
                );

        String result =
                digitWord(
                        hundreds
                )
                        + " trăm";

        if (remainder > 0) {

            if (remainder < 10) {

                result +=
                        " lẻ "
                                + digitWord(
                                remainder
                        );

            } else {

                result +=
                        " "
                                + readUnder1000(
                                remainder
                        );
            }
        }

        return result;
    }

    private String digitWord(
            int digit
    ) {

        switch (digit) {

            case 0:
                return "không";

            case 1:
                return "một";

            case 2:
                return "hai";

            case 3:
                return "ba";

            case 4:
                return "bốn";

            case 5:
                return "năm";

            case 6:
                return "sáu";

            case 7:
                return "bảy";

            case 8:
                return "tám";

            case 9:
                return "chín";

            default:
                return "";
        }
    }

    private String formatDateVietnamese(Object value) {

        if (value == null) {
            return "-";
        }

        if (value instanceof java.sql.Timestamp) {

            return ((java.sql.Timestamp) value)
                    .toLocalDateTime()
                    .format(
                            DateTimeFormatter.ofPattern(
                                    "'Ngày' d 'tháng' M 'năm' yyyy"
                            )
                    );
        }

        if (value instanceof java.sql.Date) {

            return ((java.sql.Date) value)
                    .toLocalDate()
                    .format(
                            DateTimeFormatter.ofPattern(
                                    "'Ngày' d 'tháng' M 'năm' yyyy"
                            )
                    );
        }

        String text =
                String.valueOf(value).trim();

        if (text.isEmpty()) {
            return "-";
        }

        try {

            if (text.contains("T")) {

                return LocalDateTime.parse(text)
                        .format(
                                DateTimeFormatter.ofPattern(
                                        "'Ngày' d 'tháng' M 'năm' yyyy"
                                )
                        );
            }

        } catch (Exception ignored) {
        }

        try {

            return LocalDateTime.parse(
                    text,
                    DateTimeFormatter.ofPattern(
                            "yyyy-MM-dd HH:mm:ss"
                    )
            ).format(
                    DateTimeFormatter.ofPattern(
                            "'Ngày' d 'tháng' M 'năm' yyyy"
                    )
            );

        } catch (Exception ignored) {
        }

        try {

            return LocalDateTime.parse(
                    text,
                    DateTimeFormatter.ofPattern(
                            "yyyy-MM-dd"
                    )
            ).format(
                    DateTimeFormatter.ofPattern(
                            "'Ngày' d 'tháng' M 'năm' yyyy"
                    )
            );

        } catch (Exception ignored) {
        }

        return text;
    }
}