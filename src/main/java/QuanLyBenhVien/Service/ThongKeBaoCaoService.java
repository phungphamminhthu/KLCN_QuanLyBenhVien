package QuanLyBenhVien.Service;

import QuanLyBenhVien.DTO.ThongKeBaoCaoResponse;
import QuanLyBenhVien.Repository.ThongKeBaoCaoRepository;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class ThongKeBaoCaoService {

    private final ThongKeBaoCaoRepository repository;

    public ThongKeBaoCaoService(ThongKeBaoCaoRepository repository) {
        this.repository = repository;
    }

    // =========================================================
    // THỐNG KÊ - METHOD CŨ, GIỮ TƯƠNG THÍCH
    // =========================================================

    public ThongKeBaoCaoResponse getThongKe(
            String period,
            LocalDate date,
            Integer maKhoa
    ) {
        return getThongKe(
                period,
                date,
                null,
                null,
                maKhoa
        );
    }

    // =========================================================
    // THỐNG KÊ - HỖ TRỢ NGÀY ĐƠN VÀ KHOẢNG NGÀY
    // =========================================================

    public ThongKeBaoCaoResponse getThongKe(
            String period,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate,
            Integer maKhoa
    ) {
        LocalDate today = LocalDate.now();

        LocalDate from;
        LocalDate to;

        // Ưu tiên khoảng thời gian được truyền vào
        if (fromDate != null || toDate != null) {

            if (fromDate == null || toDate == null) {
                throw new IllegalArgumentException(
                        "Vui lòng chọn đầy đủ từ ngày và đến ngày"
                );
            }

            if (fromDate.isAfter(toDate)) {
                throw new IllegalArgumentException(
                        "Từ ngày không được lớn hơn đến ngày"
                );
            }

            from = fromDate;
            to = toDate;

        } else {
            String selectedPeriod =
                    period == null ? "" : period.trim();

            switch (selectedPeriod) {

                case "day":
                case "today":
                case "custom": {
                    LocalDate selectedDate =
                            date != null ? date : today;

                    from = selectedDate;
                    to = selectedDate;
                    break;
                }

                case "7days": {
                    LocalDate endDate =
                            date != null ? date : today;

                    from = endDate.minusDays(6);
                    to = endDate;
                    break;
                }

                case "30days": {
                    LocalDate endDate =
                            date != null ? date : today;

                    from = endDate.minusDays(29);
                    to = endDate;
                    break;
                }

                default: {
                    LocalDate selectedDate =
                            date != null ? date : today;

                    from = selectedDate.minusDays(29);
                    to = selectedDate;
                    break;
                }
            }
        }

        // =====================================================
        // THỐNG KÊ TỔNG QUAN
        // =====================================================

        Long tongLuotKham =
                repository.countLuotKham(from, to, maKhoa);

        BigDecimal tongDoanhThu =
                repository.sumDoanhThu(from, to, maKhoa);

        Long tongBenhNhan =
                repository.countBenhNhan(from, to, maKhoa);

        // =====================================================
        // LẤY DỮ LIỆU TỪ REPOSITORY
        // =====================================================

        List<Object[]> luotKhamRows =
                repository.getLuotKhamTheoNgay(from, to, maKhoa);

        List<Object[]> doanhThuRows =
                repository.getDoanhThuTheoNgay(from, to, maKhoa);

        DateTimeFormatter formatter =
                DateTimeFormatter.ofPattern("dd/MM");

        // =====================================================
        // LƯỢT KHÁM THEO NGÀY
        //
        // Repository trả về:
        // [0] Ngày
        // [1] Tổng lượt khám
        // [2] Hoàn thành
        // [3] Đang khám
        // [4] Đã hủy
        // [5] Không đến
        // =====================================================

        List<ThongKeBaoCaoResponse.ThongKeTheoNgay>
                luotKhamTheoNgay = new ArrayList<>();

        for (Object[] row : luotKhamRows) {

            LocalDate ngay = convertToLocalDate(row[0]);

            Long tong = row[1] != null
                    ? ((Number) row[1]).longValue()
                    : 0L;

            Long hoanThanh = row[2] != null
                    ? ((Number) row[2]).longValue()
                    : 0L;

            Long dangKham = row[3] != null
                    ? ((Number) row[3]).longValue()
                    : 0L;

            Long daHuy = row[4] != null
                    ? ((Number) row[4]).longValue()
                    : 0L;

            Long khongDen = row[5] != null
                    ? ((Number) row[5]).longValue()
                    : 0L;

            ThongKeBaoCaoResponse.ThongKeTheoNgay item =
                    new ThongKeBaoCaoResponse.ThongKeTheoNgay();

            item.setLabel(ngay.format(formatter));
            item.setLuotKham(tong);
            item.setHoanThanh(hoanThanh);
            item.setDangKham(dangKham);
            item.setDaHuy(daHuy);
            item.setKhongDen(khongDen);

            luotKhamTheoNgay.add(item);
        }

        // =====================================================
        // DOANH THU THEO NGÀY
        //
        // Repository trả về:
        // [0] Ngày thanh toán
        // [1] Tiền khám
        // [2] Tiền thuốc
        // [3] Tiền dịch vụ
        // [4] Tổng doanh thu
        // =====================================================

        List<ThongKeBaoCaoResponse.ThongKeTheoNgay>
                doanhThuTheoNgay = new ArrayList<>();

        for (Object[] row : doanhThuRows) {
            ThongKeBaoCaoResponse.ThongKeTheoNgay item =
                    new ThongKeBaoCaoResponse.ThongKeTheoNgay();

            LocalDate ngay = convertToLocalDate(row[0]);

            item.setLabel(
                    ngay != null ? ngay.format(formatter) : ""
            );

            item.setLuotKham(0L);
            item.setHoanThanh(0L);
            item.setDangKham(0L);
            item.setDaHuy(0L);
            item.setKhongDen(0L);

            item.setTienKham(toBigDecimal(row[1]));
            item.setTienThuoc(toBigDecimal(row[2]));
            item.setTienDichVu(toBigDecimal(row[3]));
            item.setTongDoanhThu(toBigDecimal(row[4]));

            doanhThuTheoNgay.add(item);
        }

        // =====================================================
        // THỐNG KÊ THEO KHOA
        // =====================================================

        List<Object[]> thongKeTheoKhoaRows =
                repository.getThongKeTheoKhoa(from, to, maKhoa);

        List<ThongKeBaoCaoResponse.ThongKeTheoKhoa>
                thongKeTheoKhoa = new ArrayList<>();

        for (Object[] row : thongKeTheoKhoaRows) {
            ThongKeBaoCaoResponse.ThongKeTheoKhoa item =
                    new ThongKeBaoCaoResponse.ThongKeTheoKhoa();

            item.setMaKhoa(toInteger(row[0]));
            item.setTenKhoa(
                    row[1] != null ? row[1].toString() : ""
            );
            item.setSoBenhNhan(toLong(row[2]));
            item.setTongLuotKham(toLong(row[3]));
            item.setTongDoanhThu(toBigDecimal(row[4]));

            thongKeTheoKhoa.add(item);
        }

        // =====================================================
        // DANH SÁCH KHOA CHO DROPDOWN
        // =====================================================

        List<ThongKeBaoCaoResponse.KhoaOption> danhSachKhoa =
                getDanhSachKhoa();

        // =====================================================
        // TRẢ VỀ DTO
        // =====================================================

        ThongKeBaoCaoResponse response =
                new ThongKeBaoCaoResponse();

        response.setTongLuotKham(tongLuotKham);
        response.setTongDoanhThu(tongDoanhThu);
        response.setTongBenhNhan(tongBenhNhan);

        response.setLuotKhamTheoNgay(luotKhamTheoNgay);
        response.setDoanhThuTheoNgay(doanhThuTheoNgay);

        response.setDanhSachKhoa(danhSachKhoa);
        response.setThongKeTheoKhoa(thongKeTheoKhoa);

        return response;
    }

    // =========================================================
    // CHUYỂN KIỂU NGÀY TỪ QUERY
    // =========================================================

    private LocalDate convertToLocalDate(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof LocalDate) {
            return (LocalDate) value;
        }

        if (value instanceof Date) {
            return ((Date) value).toLocalDate();
        }

        if (value instanceof java.util.Date) {
            return new Date(
                    ((java.util.Date) value).getTime()
            ).toLocalDate();
        }

        return LocalDate.parse(value.toString());
    }

    // =========================================================
    // CONVERT KIỂU DỮ LIỆU
    // =========================================================

    private Long toLong(Object value) {
        if (value == null) {
            return 0L;
        }

        return ((Number) value).longValue();
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }

        return ((Number) value).intValue();
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }

        return new BigDecimal(value.toString());
    }

    // =========================================================
    // DANH SÁCH KHOA
    // =========================================================

    private List<ThongKeBaoCaoResponse.KhoaOption> getDanhSachKhoa() {
        List<Object[]> rows = repository.getDanhSachKhoa();

        List<ThongKeBaoCaoResponse.KhoaOption> result =
                new ArrayList<>();

        for (Object[] row : rows) {
            ThongKeBaoCaoResponse.KhoaOption item =
                    new ThongKeBaoCaoResponse.KhoaOption();

            item.setMaKhoa(toInteger(row[0]));
            item.setTenKhoa(
                    row[1] != null ? row[1].toString() : ""
            );

            result.add(item);
        }

        return result;
    }

    // =========================================================
    // EXPORT EXCEL - METHOD CŨ
    // =========================================================

    public byte[] exportExcel(
            String period,
            Integer maKhoa,
            LocalDate date
    ) throws IOException {
        return exportExcel(
                period,
                maKhoa,
                date,
                null,
                null
        );
    }

    // =========================================================
    // EXPORT EXCEL - HỖ TRỢ KHOẢNG NGÀY
    // =========================================================

    public byte[] exportExcel(
            String period,
            Integer maKhoa,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate
    ) throws IOException {

        ThongKeBaoCaoResponse data =
                getThongKe(
                        period,
                        date,
                        fromDate,
                        toDate,
                        maKhoa
                );

        try (
                Workbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream outputStream =
                        new ByteArrayOutputStream()
        ) {
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle normalStyle = createNormalStyle(workbook);
            CellStyle numberStyle = createNumberStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);

            createOverviewSheet(
                    workbook.createSheet("Tổng quan"),
                    data,
                    titleStyle,
                    headerStyle,
                    normalStyle,
                    numberStyle,
                    currencyStyle
            );

            createAppointmentSheet(
                    workbook.createSheet("Lượt khám"),
                    data,
                    titleStyle,
                    headerStyle,
                    normalStyle,
                    numberStyle
            );

            createRevenueSheet(
                    workbook.createSheet("Doanh thu"),
                    data,
                    titleStyle,
                    headerStyle,
                    normalStyle,
                    currencyStyle
            );

            createDepartmentSheet(
                    workbook.createSheet("Theo khoa"),
                    data,
                    titleStyle,
                    headerStyle,
                    normalStyle,
                    numberStyle,
                    currencyStyle
            );

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
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);

        titleCell.setCellValue(
                "MEDCARE HOSPITAL - BÁO CÁO THỐNG KÊ"
        );
        titleCell.setCellStyle(titleStyle);

        sheet.addMergedRegion(
                new CellRangeAddress(0, 0, 0, 1)
        );

        Row dateRow = sheet.createRow(2);
        dateRow.createCell(0).setCellValue("Ngày xuất báo cáo");
        dateRow.createCell(1).setCellValue(
                LocalDate.now().format(
                        DateTimeFormatter.ofPattern("dd/MM/yyyy")
                )
        );

        dateRow.getCell(0).setCellStyle(headerStyle);
        dateRow.getCell(1).setCellStyle(normalStyle);

        Row headerRow = sheet.createRow(4);
        headerRow.createCell(0).setCellValue("Chỉ tiêu");
        headerRow.createCell(1).setCellValue("Giá trị");

        headerRow.getCell(0).setCellStyle(headerStyle);
        headerRow.getCell(1).setCellStyle(headerStyle);

        addOverviewRow(
                sheet, 5, "Tổng lượt khám",
                data.getTongLuotKham(), normalStyle, numberStyle
        );

        addOverviewRow(
                sheet, 6, "Tổng doanh thu",
                data.getTongDoanhThu(), normalStyle, currencyStyle
        );

        addOverviewRow(
                sheet, 7, "Tổng bệnh nhân",
                data.getTongBenhNhan(), normalStyle, numberStyle
        );

        sheet.setColumnWidth(0, 30 * 256);
        sheet.setColumnWidth(1, 25 * 256);
    }

    private void addOverviewRow(
            Sheet sheet,
            int rowIndex,
            String label,
            Object value,
            CellStyle normalStyle,
            CellStyle valueStyle
    ) {
        Row row = sheet.createRow(rowIndex);

        row.createCell(0).setCellValue(label);

        Cell valueCell = row.createCell(1);

        if (value instanceof BigDecimal) {
            valueCell.setCellValue(
                    ((BigDecimal) value).doubleValue()
            );
        } else if (value instanceof Number) {
            valueCell.setCellValue(
                    ((Number) value).doubleValue()
            );
        } else {
            valueCell.setCellValue(0);
        }

        row.getCell(0).setCellStyle(normalStyle);
        valueCell.setCellStyle(valueStyle);
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
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);

        titleCell.setCellValue("THỐNG KÊ LƯỢT KHÁM");
        titleCell.setCellStyle(titleStyle);

        sheet.addMergedRegion(
                new CellRangeAddress(0, 0, 0, 5)
        );

        Row headerRow = sheet.createRow(2);

        String[] headers = {
                "Ngày",
                "Tổng lượt khám",
                "Hoàn thành",
                "Đang khám",
                "Đã hủy",
                "Không đến"
        };

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowIndex = 3;

        long totalLuotKham = 0;
        long totalHoanThanh = 0;
        long totalDangKham = 0;
        long totalDaHuy = 0;
        long totalKhongDen = 0;

        if (data.getLuotKhamTheoNgay() != null) {
            for (ThongKeBaoCaoResponse.ThongKeTheoNgay item
                    : data.getLuotKhamTheoNgay()) {

                Row row = sheet.createRow(rowIndex++);

                row.createCell(0).setCellValue(
                        item.getLabel() != null ? item.getLabel() : ""
                );

                long luotKham = safeLong(item.getLuotKham());
                long hoanThanh = safeLong(item.getHoanThanh());
                long dangKham = safeLong(item.getDangKham());
                long daHuy = safeLong(item.getDaHuy());
                long khongDen = safeLong(item.getKhongDen());

                row.createCell(1).setCellValue(luotKham);
                row.createCell(2).setCellValue(hoanThanh);
                row.createCell(3).setCellValue(dangKham);
                row.createCell(4).setCellValue(daHuy);
                row.createCell(5).setCellValue(khongDen);

                for (int i = 0; i <= 5; i++) {
                    row.getCell(i).setCellStyle(
                            i == 0 ? normalStyle : numberStyle
                    );
                }

                // Cộng tổng từng cột
                totalLuotKham += luotKham;
                totalHoanThanh += hoanThanh;
                totalDangKham += dangKham;
                totalDaHuy += daHuy;
                totalKhongDen += khongDen;
            }
        }

        // Dòng tổng
        Row totalRow = sheet.createRow(rowIndex);

        totalRow.createCell(0).setCellValue("TỔNG");
        totalRow.createCell(1).setCellValue(totalLuotKham);
        totalRow.createCell(2).setCellValue(totalHoanThanh);
        totalRow.createCell(3).setCellValue(totalDangKham);
        totalRow.createCell(4).setCellValue(totalDaHuy);
        totalRow.createCell(5).setCellValue(totalKhongDen);

        for (int i = 0; i <= 5; i++) {
            totalRow.getCell(i).setCellStyle(
                    i == 0 ? headerStyle : numberStyle
            );
        }

        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
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
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);

        titleCell.setCellValue("THỐNG KÊ DOANH THU");
        titleCell.setCellStyle(titleStyle);

        sheet.addMergedRegion(
                new CellRangeAddress(0, 0, 0, 4)
        );

        Row headerRow = sheet.createRow(2);

        String[] headers = {
                "Ngày",
                "Tiền khám",
                "Tiền thuốc",
                "Tiền dịch vụ",
                "Tổng doanh thu"
        };

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowIndex = 3;

        BigDecimal totalKham = BigDecimal.ZERO;
        BigDecimal totalThuoc = BigDecimal.ZERO;
        BigDecimal totalDichVu = BigDecimal.ZERO;
        BigDecimal totalDoanhThu = BigDecimal.ZERO;

        if (data.getDoanhThuTheoNgay() != null) {
            for (ThongKeBaoCaoResponse.ThongKeTheoNgay item
                    : data.getDoanhThuTheoNgay()) {

                Row row = sheet.createRow(rowIndex++);

                row.createCell(0).setCellValue(
                        item.getLabel() != null ? item.getLabel() : ""
                );

                BigDecimal tienKham = safeDecimal(item.getTienKham());
                BigDecimal tienThuoc = safeDecimal(item.getTienThuoc());
                BigDecimal tienDichVu = safeDecimal(item.getTienDichVu());
                BigDecimal tong = safeDecimal(item.getTongDoanhThu());

                row.createCell(1).setCellValue(tienKham.doubleValue());
                row.createCell(2).setCellValue(tienThuoc.doubleValue());
                row.createCell(3).setCellValue(tienDichVu.doubleValue());
                row.createCell(4).setCellValue(tong.doubleValue());

                row.getCell(0).setCellStyle(normalStyle);

                for (int i = 1; i <= 4; i++) {
                    row.getCell(i).setCellStyle(currencyStyle);
                }

                totalKham = totalKham.add(tienKham);
                totalThuoc = totalThuoc.add(tienThuoc);
                totalDichVu = totalDichVu.add(tienDichVu);
                totalDoanhThu = totalDoanhThu.add(tong);
            }
        }

        Row totalRow = sheet.createRow(rowIndex);
        totalRow.createCell(0).setCellValue("TỔNG");
        totalRow.createCell(1).setCellValue(totalKham.doubleValue());
        totalRow.createCell(2).setCellValue(totalThuoc.doubleValue());
        totalRow.createCell(3).setCellValue(totalDichVu.doubleValue());
        totalRow.createCell(4).setCellValue(totalDoanhThu.doubleValue());

        for (int i = 0; i <= 4; i++) {
            totalRow.getCell(i).setCellStyle(
                    i == 0 ? headerStyle : currencyStyle
            );
        }

        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    // =========================================================
    // SHEET THỐNG KÊ THEO KHOA
    // =========================================================

    private void createDepartmentSheet(
            Sheet sheet,
            ThongKeBaoCaoResponse data,
            CellStyle titleStyle,
            CellStyle headerStyle,
            CellStyle normalStyle,
            CellStyle numberStyle,
            CellStyle currencyStyle
    ) {
        Row titleRow = sheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);

        titleCell.setCellValue("THỐNG KÊ THEO KHOA");
        titleCell.setCellStyle(titleStyle);

        sheet.addMergedRegion(
                new CellRangeAddress(0, 0, 0, 4)
        );

        Row headerRow = sheet.createRow(2);

        String[] headers = {
                "Mã khoa",
                "Tên khoa",
                "Số bệnh nhân",
                "Tổng lượt khám",
                "Tổng doanh thu"
        };

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        int rowIndex = 3;

        if (data.getThongKeTheoKhoa() != null) {
            for (ThongKeBaoCaoResponse.ThongKeTheoKhoa item
                    : data.getThongKeTheoKhoa()) {

                Row row = sheet.createRow(rowIndex++);

                row.createCell(0).setCellValue(
                        item.getMaKhoa() != null
                                ? item.getMaKhoa()
                                : 0
                );

                row.createCell(1).setCellValue(
                        item.getTenKhoa() != null
                                ? item.getTenKhoa()
                                : ""
                );

                row.createCell(2).setCellValue(
                        safeLong(item.getSoBenhNhan())
                );

                row.createCell(3).setCellValue(
                        safeLong(item.getTongLuotKham())
                );

                row.createCell(4).setCellValue(
                        safeDecimal(item.getTongDoanhThu()).doubleValue()
                );

                row.getCell(0).setCellStyle(numberStyle);
                row.getCell(1).setCellStyle(normalStyle);
                row.getCell(2).setCellStyle(numberStyle);
                row.getCell(3).setCellStyle(numberStyle);
                row.getCell(4).setCellStyle(currencyStyle);
            }
        }

        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    // =========================================================
    // SAFE VALUE
    // =========================================================

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private BigDecimal safeDecimal(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    // =========================================================
    // EXCEL STYLES
    // =========================================================

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();

        font.setBold(true);
        font.setFontHeightInPoints((short) 16);

        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);

        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();

        font.setBold(true);

        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);

        return style;
    }

    private CellStyle createNormalStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();

        style.setVerticalAlignment(VerticalAlignment.CENTER);

        return style;
    }

    private CellStyle createNumberStyle(Workbook workbook) {
        CellStyle style = createNormalStyle(workbook);

        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setDataFormat(
                workbook.createDataFormat().getFormat("#,##0")
        );

        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = createNormalStyle(workbook);

        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setDataFormat(
                workbook.createDataFormat().getFormat("#,##0")
        );

        return style;
    }
}