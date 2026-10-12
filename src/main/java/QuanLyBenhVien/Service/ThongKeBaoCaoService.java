package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.ThongKeBaoCaoResponse;
import QuanLyBenhVien.Repository.ThongKeBaoCaoRepository;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class ThongKeBaoCaoService {

    private final ThongKeBaoCaoRepository repository;

    public ThongKeBaoCaoService(
            ThongKeBaoCaoRepository repository
    ) {
        this.repository = repository;
    }


    // =========================================================
    // THỐNG KÊ
    // =========================================================

    public ThongKeBaoCaoResponse getThongKe(
            String period,
            LocalDate date,
            Integer maKhoa
    ) {

        LocalDate today = LocalDate.now();

        LocalDate from;
        LocalDate to;


        // =====================================================
        // XÁC ĐỊNH KHOẢNG THỜI GIAN
        // =====================================================

        switch (period) {

            case "today":

                from = today;
                to = today;

                break;


            case "7days":

                from = today.minusDays(6);
                to = today;

                break;


            case "30days":

                from = today.minusDays(29);
                to = today;

                break;


            case "custom":

                if (date == null) {

                    throw new IllegalArgumentException(
                            "Ngày tùy chọn không được để trống"
                    );
                }

                from = date;
                to = date;

                break;


            default:

                from = today.minusDays(29);
                to = today;

                break;
        }


        // =====================================================
        // THỐNG KÊ CARD
        // =====================================================

        Long tongLuotKham =
                repository.countLuotKham(
                        from,
                        to,
                        maKhoa
                );


        BigDecimal tongDoanhThu =
                repository.sumDoanhThu(
                        from,
                        to,
                        maKhoa
                );


        /*
         * BenhNhan không có NgayTao
         * nên đây là tổng số bệnh nhân
         * hiện có trong hệ thống.
         */
        Long tongBenhNhan =
                repository.countBenhNhan();


        // =====================================================
        // DỮ LIỆU BIỂU ĐỒ
        // =====================================================

        List<Object[]> luotKhamRows =
                repository.getLuotKhamTheoNgay(
                        from,
                        to,
                        maKhoa
                );


        List<Object[]> doanhThuRows =
                repository.getDoanhThuTheoNgay(
                        from,
                        to,
                        maKhoa
                );


        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd/MM");


        // =====================================================
        // LƯỢT KHÁM THEO NGÀY
        // =====================================================

        List<ThongKeBaoCaoResponse.ThongKeTheoNgay>
                luotKhamTheoNgay =
                new ArrayList<>();


        for (Object[] row : luotKhamRows) {

            LocalDate ngay =
                    (LocalDate) row[0];

            Long soLuong =
                    ((Number) row[1])
                            .longValue();


            luotKhamTheoNgay.add(
                    new ThongKeBaoCaoResponse.ThongKeTheoNgay(
                            ngay.format(formatter),
                            soLuong,
                            BigDecimal.ZERO
                    )
            );
        }


        // =====================================================
        // DOANH THU THEO NGÀY
        // =====================================================

        List<ThongKeBaoCaoResponse.ThongKeTheoNgay>
                doanhThuTheoNgay =
                new ArrayList<>();


        for (Object[] row : doanhThuRows) {

            LocalDate ngay =
                    (LocalDate) row[0];

            BigDecimal doanhThu =
                    row[1] != null
                            ? new BigDecimal(
                            row[1].toString()
                    )
                            : BigDecimal.ZERO;


            doanhThuTheoNgay.add(
                    new ThongKeBaoCaoResponse.ThongKeTheoNgay(
                            ngay.format(formatter),
                            0L,
                            doanhThu
                    )
            );
        }


        // =====================================================
        // TRẢ RESPONSE
        // =====================================================

        return new ThongKeBaoCaoResponse(

                tongLuotKham,

                tongDoanhThu,

                tongBenhNhan,

                luotKhamTheoNgay,

                doanhThuTheoNgay,

                getDanhSachKhoa()
        );
    }


    // =========================================================
    // DANH SÁCH KHOA
    // =========================================================

    private List<ThongKeBaoCaoResponse.KhoaOption>
    getDanhSachKhoa() {

        return repository
                .findAllKhoa()
                .stream()
                .map(row ->
                        new ThongKeBaoCaoResponse.KhoaOption(
                                ((Number) row[0]).intValue(),
                                (String) row[1]
                        )
                )
                .toList();
    }


    // =========================================================
    // EXPORT EXCEL
    // =========================================================

    public byte[] exportExcel(
            String period,
            Integer maKhoa,
            LocalDate date
    ) throws IOException {

        // Lấy dữ liệu theo đúng bộ lọc
        ThongKeBaoCaoResponse data =
                getThongKe(
                        period,
                        date,
                        maKhoa
                );


        try (
                Workbook workbook =
                        new XSSFWorkbook();

                ByteArrayOutputStream outputStream =
                        new ByteArrayOutputStream()
        ) {


            // =================================================
            // STYLE
            // =================================================

            CellStyle titleStyle =
                    createTitleStyle(workbook);

            CellStyle headerStyle =
                    createHeaderStyle(workbook);

            CellStyle normalStyle =
                    createNormalStyle(workbook);

            CellStyle numberStyle =
                    createNumberStyle(workbook);

            CellStyle currencyStyle =
                    createCurrencyStyle(workbook);


            // =================================================
            // SHEET 1 - TỔNG QUAN
            // =================================================

            Sheet overviewSheet =
                    workbook.createSheet("Tổng quan");


            createOverviewSheet(
                    overviewSheet,
                    data,
                    titleStyle,
                    headerStyle,
                    normalStyle,
                    numberStyle,
                    currencyStyle
            );


            // =================================================
            // SHEET 2 - LƯỢT KHÁM
            // =================================================

            Sheet appointmentSheet =
                    workbook.createSheet("Lượt khám");


            createAppointmentSheet(
                    appointmentSheet,
                    data,
                    titleStyle,
                    headerStyle,
                    normalStyle,
                    numberStyle
            );


            // =================================================
            // SHEET 3 - DOANH THU
            // =================================================

            Sheet revenueSheet =
                    workbook.createSheet("Doanh thu");


            createRevenueSheet(
                    revenueSheet,
                    data,
                    titleStyle,
                    headerStyle,
                    normalStyle,
                    currencyStyle
            );


            // =================================================
            // GHI FILE
            // =================================================

            workbook.write(outputStream);

            return outputStream.toByteArray();
        }
    }


    // =========================================================
    // SHEET TỔNG QUAN
    // =========================================================

    private void createOverviewSheet(
            Sheet sheet,
            ThongKeBaoCaoResponse data,
            CellStyle titleStyle,
            CellStyle headerStyle,
            CellStyle normalStyle,
            CellStyle numberStyle,
            CellStyle currencyStyle
    ) {

        // Tiêu đề
        Row titleRow =
                sheet.createRow(0);

        Cell titleCell =
                titleRow.createCell(0);

        titleCell.setCellValue(
                "MEDCARE HOSPITAL - BÁO CÁO THỐNG KÊ & QUẢN TRỊ"
        );

        titleCell.setCellStyle(titleStyle);


        sheet.addMergedRegion(
                new org.apache.poi.ss.util.CellRangeAddress(
                        0,
                        0,
                        0,
                        2
                )
        );


        // =====================================================
        // NGÀY XUẤT
        // =====================================================

        Row dateRow =
                sheet.createRow(2);

        dateRow.createCell(0)
                .setCellValue(
                        "Ngày xuất báo cáo"
                );

        dateRow.createCell(1)
                .setCellValue(
                        LocalDate.now()
                                .format(
                                        DateTimeFormatter.ofPattern(
                                                "dd/MM/yyyy"
                                        )
                                )
                );


        dateRow.getCell(0)
                .setCellStyle(headerStyle);

        dateRow.getCell(1)
                .setCellStyle(normalStyle);


        // =====================================================
        // HEADER
        // =====================================================

        Row headerRow =
                sheet.createRow(4);

        headerRow.createCell(0)
                .setCellValue("Chỉ tiêu");

        headerRow.createCell(1)
                .setCellValue("Giá trị");


        headerRow.getCell(0)
                .setCellStyle(headerStyle);

        headerRow.getCell(1)
                .setCellStyle(headerStyle);


        // =====================================================
        // TỔNG LƯỢT KHÁM
        // =====================================================

        Row appointmentRow =
                sheet.createRow(5);

        appointmentRow.createCell(0)
                .setCellValue(
                        "Tổng lượt khám"
                );

        appointmentRow.createCell(1)
                .setCellValue(
                        data.getTongLuotKham() != null
                                ? data.getTongLuotKham()
                                : 0
                );


        appointmentRow.getCell(0)
                .setCellStyle(normalStyle);

        appointmentRow.getCell(1)
                .setCellStyle(numberStyle);


        // =====================================================
        // TỔNG DOANH THU
        // =====================================================

        Row revenueRow =
                sheet.createRow(6);

        revenueRow.createCell(0)
                .setCellValue(
                        "Tổng doanh thu"
                );

        revenueRow.createCell(1)
                .setCellValue(
                        data.getTongDoanhThu() != null
                                ? data.getTongDoanhThu()
                                .doubleValue()
                                : 0
                );


        revenueRow.getCell(0)
                .setCellStyle(normalStyle);

        revenueRow.getCell(1)
                .setCellStyle(currencyStyle);


        // =====================================================
        // TỔNG BỆNH NHÂN
        // =====================================================

        Row patientRow =
                sheet.createRow(7);

        patientRow.createCell(0)
                .setCellValue(
                        "Tổng bệnh nhân"
                );

        patientRow.createCell(1)
                .setCellValue(
                        data.getTongBenhNhan() != null
                                ? data.getTongBenhNhan()
                                : 0
                );


        patientRow.getCell(0)
                .setCellStyle(normalStyle);

        patientRow.getCell(1)
                .setCellStyle(numberStyle);


        // =====================================================
        // COLUMN WIDTH
        // =====================================================

        sheet.setColumnWidth(
                0,
                30 * 256
        );

        sheet.setColumnWidth(
                1,
                25 * 256
        );

        sheet.setColumnWidth(
                2,
                20 * 256
        );
    }


    // =========================================================
    // SHEET LƯỢT KHÁM
    // =========================================================

    private void createAppointmentSheet(
            Sheet sheet,
            ThongKeBaoCaoResponse data,
            CellStyle titleStyle,
            CellStyle headerStyle,
            CellStyle normalStyle,
            CellStyle numberStyle
    ) {

        Row titleRow =
                sheet.createRow(0);

        Cell titleCell =
                titleRow.createCell(0);

        titleCell.setCellValue(
                "THỐNG KÊ LƯỢT KHÁM THEO THỜI GIAN"
        );

        titleCell.setCellStyle(titleStyle);


        sheet.addMergedRegion(
                new org.apache.poi.ss.util.CellRangeAddress(
                        0,
                        0,
                        0,
                        1
                )
        );


        // =====================================================
        // HEADER
        // =====================================================

        Row headerRow =
                sheet.createRow(2);

        headerRow.createCell(0)
                .setCellValue("Ngày");

        headerRow.createCell(1)
                .setCellValue("Số lượt khám");


        headerRow.getCell(0)
                .setCellStyle(headerStyle);

        headerRow.getCell(1)
                .setCellStyle(headerStyle);


        int rowIndex = 3;

        long total = 0;


        // =====================================================
        // DATA
        // =====================================================

        if (data.getLuotKhamTheoNgay() != null) {

            for (
                    ThongKeBaoCaoResponse.ThongKeTheoNgay item
                    : data.getLuotKhamTheoNgay()
            ) {

                Row row =
                        sheet.createRow(
                                rowIndex++
                        );


                // Ngày
                row.createCell(0)
                        .setCellValue(
                                item.getLabel()
                        );


                // Số lượt khám
                long luotKham =
                        item.getLuotKham() != null
                                ? item.getLuotKham()
                                : 0;


                row.createCell(1)
                        .setCellValue(
                                luotKham
                        );


                row.getCell(0)
                        .setCellStyle(
                                normalStyle
                        );

                row.getCell(1)
                        .setCellStyle(
                                numberStyle
                        );


                total += luotKham;
            }
        }


        // =====================================================
        // TỔNG
        // =====================================================

        Row totalRow =
                sheet.createRow(rowIndex);


        totalRow.createCell(0)
                .setCellValue("TỔNG");

        totalRow.createCell(1)
                .setCellValue(total);


        totalRow.getCell(0)
                .setCellStyle(headerStyle);

        totalRow.getCell(1)
                .setCellStyle(numberStyle);


        sheet.setColumnWidth(
                0,
                20 * 256
        );

        sheet.setColumnWidth(
                1,
                20 * 256
        );
    }


    // =========================================================
    // SHEET DOANH THU
    // =========================================================

    private void createRevenueSheet(
            Sheet sheet,
            ThongKeBaoCaoResponse data,
            CellStyle titleStyle,
            CellStyle headerStyle,
            CellStyle normalStyle,
            CellStyle currencyStyle
    ) {

        Row titleRow =
                sheet.createRow(0);

        Cell titleCell =
                titleRow.createCell(0);

        titleCell.setCellValue(
                "THỐNG KÊ DOANH THU THEO THỜI GIAN"
        );

        titleCell.setCellStyle(titleStyle);


        sheet.addMergedRegion(
                new org.apache.poi.ss.util.CellRangeAddress(
                        0,
                        0,
                        0,
                        1
                )
        );


        // =====================================================
        // HEADER
        // =====================================================

        Row headerRow =
                sheet.createRow(2);

        headerRow.createCell(0)
                .setCellValue("Ngày");

        headerRow.createCell(1)
                .setCellValue("Doanh thu");


        headerRow.getCell(0)
                .setCellStyle(headerStyle);

        headerRow.getCell(1)
                .setCellStyle(headerStyle);


        int rowIndex = 3;

        BigDecimal total =
                BigDecimal.ZERO;


        // =====================================================
        // DATA
        // =====================================================

        if (data.getDoanhThuTheoNgay() != null) {

            for (
                    ThongKeBaoCaoResponse.ThongKeTheoNgay item
                    : data.getDoanhThuTheoNgay()
            ) {

                Row row =
                        sheet.createRow(
                                rowIndex++
                        );


                // Ngày
                row.createCell(0)
                        .setCellValue(
                                item.getLabel()
                        );


                // Doanh thu
                BigDecimal doanhThu =
                        item.getDoanhThu() != null
                                ? item.getDoanhThu()
                                : BigDecimal.ZERO;


                row.createCell(1)
                        .setCellValue(
                                doanhThu.doubleValue()
                        );


                row.getCell(0)
                        .setCellStyle(
                                normalStyle
                        );

                row.getCell(1)
                        .setCellStyle(
                                currencyStyle
                        );


                total =
                        total.add(
                                doanhThu
                        );
            }
        }


        // =====================================================
        // TỔNG
        // =====================================================

        Row totalRow =
                sheet.createRow(rowIndex);


        totalRow.createCell(0)
                .setCellValue("TỔNG");

        totalRow.createCell(1)
                .setCellValue(
                        total.doubleValue()
                );


        totalRow.getCell(0)
                .setCellStyle(headerStyle);

        totalRow.getCell(1)
                .setCellStyle(currencyStyle);


        sheet.setColumnWidth(
                0,
                20 * 256
        );

        sheet.setColumnWidth(
                1,
                25 * 256
        );
    }


    // =========================================================
    // STYLE - TITLE
    // =========================================================

    private CellStyle createTitleStyle(
            Workbook workbook
    ) {

        CellStyle style =
                workbook.createCellStyle();

        Font font =
                workbook.createFont();

        font.setBold(true);

        font.setFontHeightInPoints(
                (short) 16
        );


        style.setFont(font);

        style.setAlignment(
                HorizontalAlignment.CENTER
        );

        style.setVerticalAlignment(
                VerticalAlignment.CENTER
        );


        return style;
    }


    // =========================================================
    // STYLE - HEADER
    // =========================================================

    private CellStyle createHeaderStyle(
            Workbook workbook
    ) {

        CellStyle style =
                workbook.createCellStyle();

        Font font =
                workbook.createFont();

        font.setBold(true);


        style.setFont(font);

        style.setAlignment(
                HorizontalAlignment.CENTER
        );

        style.setVerticalAlignment(
                VerticalAlignment.CENTER
        );

        style.setBorderBottom(
                BorderStyle.THIN
        );


        return style;
    }


    // =========================================================
    // STYLE - NORMAL
    // =========================================================

    private CellStyle createNormalStyle(
            Workbook workbook
    ) {

        CellStyle style =
                workbook.createCellStyle();

        style.setVerticalAlignment(
                VerticalAlignment.CENTER
        );


        return style;
    }


    // =========================================================
    // STYLE - NUMBER
    // =========================================================

    private CellStyle createNumberStyle(
            Workbook workbook
    ) {

        CellStyle style =
                createNormalStyle(
                        workbook
                );

        style.setAlignment(
                HorizontalAlignment.RIGHT
        );

        style.setDataFormat(
                workbook.createDataFormat()
                        .getFormat("#,##0")
        );


        return style;
    }


    // =========================================================
    // STYLE - CURRENCY
    // =========================================================

    private CellStyle createCurrencyStyle(
            Workbook workbook
    ) {

        CellStyle style =
                createNormalStyle(
                        workbook
                );

        style.setAlignment(
                HorizontalAlignment.RIGHT
        );

        style.setDataFormat(
                workbook.createDataFormat()
                        .getFormat("#,##0")
        );


        return style;
    }
}