package QuanLyBenhVien.Controller;

import QuanLyBenhVien.DTO.*;

import QuanLyBenhVien.Entity.NguoiDung;

import QuanLyBenhVien.Repository.NguoiDungRepository;

import QuanLyBenhVien.Service.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/duocsi")
public class DuocSiApiController {


    // =====================================================
    // SERVICE
    // =====================================================

    private final DuocSiHistoryService duocSiHistoryService;

    private final DuocSiChoCapThuocService duocSiChoCapThuocService;

    private final DuocSiChiTietDonThuocService duocSiChiTietDonThuocService;

    private final DuocSiCapThuocService duocSiCapThuocService;

    private final DuocSiPdfService duocSiPdfService;

    private final ThongBaoWebSocketService thongBaoWebSocketService;

    private final NguoiDungRepository nguoiDungRepository;

    private final DuocSiDieuChinhDonThuocService
            duocSiDieuChinhDonThuocService;

    private final HoaDonThuocService hoaDonThuocService;


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public DuocSiApiController(

            DuocSiHistoryService duocSiHistoryService,

            DuocSiChoCapThuocService duocSiChoCapThuocService,

            DuocSiChiTietDonThuocService duocSiChiTietDonThuocService,

            DuocSiCapThuocService duocSiCapThuocService,

            DuocSiPdfService duocSiPdfService,

            ThongBaoWebSocketService thongBaoWebSocketService,

            NguoiDungRepository nguoiDungRepository,

            DuocSiDieuChinhDonThuocService duocSiDieuChinhDonThuocService,

            HoaDonThuocService hoaDonThuocService
    ) {

        this.duocSiHistoryService =
                duocSiHistoryService;

        this.duocSiChoCapThuocService =
                duocSiChoCapThuocService;

        this.duocSiChiTietDonThuocService =
                duocSiChiTietDonThuocService;

        this.duocSiCapThuocService =
                duocSiCapThuocService;

        this.duocSiPdfService =
                duocSiPdfService;

        this.thongBaoWebSocketService =
                thongBaoWebSocketService;

        this.nguoiDungRepository =
                nguoiDungRepository;

        this.duocSiDieuChinhDonThuocService =
                duocSiDieuChinhDonThuocService;

        this.hoaDonThuocService = hoaDonThuocService;
    }


    // =====================================================
    // 1. ĐƠN THUỐC CHỜ CẤP
    // =====================================================

    /**
     * GET
     * /api/duocsi/cho-cap-thuoc
     *
     * Ví dụ:
     * /api/duocsi/cho-cap-thuoc?page=0&size=6
     *
     * Bộ lọc:
     * keyword
     * patient
     * date
     * doctorId
     */

    @GetMapping("/cho-cap-thuoc")
    public Page<DuocSiChoCapThuocResponse> getChoCapThuoc(

            @RequestParam(
                    required = false
            )
            String keyword,

            @RequestParam(
                    required = false
            )
            String patient,

            @RequestParam(
                    required = false
            )
            String date,

            @RequestParam(
                    required = false
            )
            Integer doctorId,

            @RequestParam(
                    defaultValue = "0"
            )
            int page,

            @RequestParam(
                    defaultValue = "6"
            )
            int size

    ) {

        // =================================================
        // LẤY DỮ LIỆU
        // =================================================

        List<DuocSiChoCapThuocResponse> data =
                duocSiChoCapThuocService.getDanhSach(

                        keyword,

                        patient,

                        date,

                        doctorId,

                        page,

                        size
                );


        // =================================================
        // TỔNG SỐ BẢN GHI
        // =================================================

        long total =
                duocSiChoCapThuocService.count(

                        keyword,

                        patient,

                        date,

                        doctorId
                );


        // =================================================
        // PHÂN TRANG
        // =================================================

        Pageable pageable =
                PageRequest.of(

                        page,

                        size
                );


        // =================================================
        // TRẢ PAGE
        // =================================================

        return new PageImpl<>(

                data,

                pageable,

                total
        );
    }


    // =====================================================
    // 2. LỊCH SỬ CẤP THUỐC
    // =====================================================

    /**
     * GET
     * /api/duocsi/lich-su-cap-thuoc
     *
     * Bộ lọc:
     * keyword
     * fromDate
     * toDate
     * status
     */

    @GetMapping("/lich-su-cap-thuoc")
    public Page<DuocSiHistoryResponse> getLichSuCapThuoc(

            @RequestParam(
                    required = false
            )
            String keyword,

            @RequestParam(
                    required = false
            )
            String fromDate,

            @RequestParam(
                    required = false
            )
            String toDate,

            @RequestParam(
                    required = false
            )
            String status,

            @RequestParam(
                    defaultValue = "0"
            )
            int page,

            @RequestParam(
                    defaultValue = "5"
            )
            int size

    ) {

        // =================================================
        // LẤY TOÀN BỘ DỮ LIỆU
        // =================================================

        List<DuocSiHistoryResponse> allData =
                duocSiHistoryService.getHistory(

                        keyword,

                        fromDate,

                        toDate,

                        status
                );


        // =================================================
        // PAGE
        // =================================================

        Pageable pageable =
                PageRequest.of(

                        page,

                        size
                );


        // =================================================
        // START
        // =================================================

        int start =
                (int) pageable.getOffset();


        // =================================================
        // END
        // =================================================

        int end =
                Math.min(

                        start + pageable.getPageSize(),

                        allData.size()
                );


        List<DuocSiHistoryResponse> pageData;


        // =================================================
        // KHÔNG CÓ DỮ LIỆU
        // =================================================

        if (
                start >= allData.size()
        ) {

            pageData =
                    List.of();

        } else {

            pageData =
                    allData.subList(

                            start,

                            end
                    );
        }


        // =================================================
        // TRẢ PAGE
        // =================================================

        return new PageImpl<>(

                pageData,

                pageable,

                allData.size()
        );
    }


    // =====================================================
    // 3. CHI TIẾT ĐƠN THUỐC
    // =====================================================

    @GetMapping("/cho-cap-thuoc/{id}")
    public DuocSiChiTietDonThuocResponse
    getChiTietDonThuoc(

            @PathVariable("id")
            Integer id

    ) {

        return duocSiChiTietDonThuocService
                .getChiTiet(id);
    }


    // =====================================================
    // 4. XÁC NHẬN CẤP THUỐC
    // =====================================================

    @PostMapping("/cho-cap-thuoc/{id}/cap-thuoc")
    public String capThuoc(

            @PathVariable("id")
            Integer id,

            @RequestBody
            DuocSiCapThuocRequest request,

            Authentication authentication

    ) {

        duocSiCapThuocService.capThuoc(

                id,

                request,

                authentication.getName()
        );


        return "Cấp thuốc thành công.";
    }


    // =====================================================
    // 5. TẢI ĐƠN THUỐC
    // KHÔNG CÓ TIỀN
    // =====================================================

    @GetMapping("/lich-su-cap-thuoc/{id}/pdf")
    public ResponseEntity<byte[]> downloadPrescriptionPdf(

            @PathVariable
            Integer id

    ) {

        try {

            // =================================================
            // 1. TẠO PDF
            // =================================================

            byte[] pdf =
                    duocSiPdfService
                            .generatePrescriptionPdf(id);


            // =================================================
            // 2. LẤY TÀI KHOẢN ĐANG ĐĂNG NHẬP
            // =================================================

            Authentication authentication =
                    SecurityContextHolder
                            .getContext()
                            .getAuthentication();


            if (

                    authentication != null

                            && authentication.isAuthenticated()

                            && !"anonymousUser".equals(
                            authentication.getName()
                    )

            ) {

                String username =
                        authentication.getName();


                // =================================================
                // 3. TÌM NGƯỜI DÙNG
                // =================================================

                NguoiDung nguoiDung =
                        nguoiDungRepository
                                .findByTenDangNhap(username)
                                .orElse(null);


                // =================================================
                // 4. LƯU DB + GỬI WEBSOCKET
                // =================================================

                if (nguoiDung != null) {

                    thongBaoWebSocketService
                            .taoVaGuiThongBao(

                                    nguoiDung,

                                    "Tải đơn thuốc",

                                    "Đơn thuốc DP"
                                            + String.format(
                                            "%05d",
                                            id
                                    )
                                            + " đã được tải xuống thành công.",

                                    "DOWNLOAD_PRESCRIPTION",

                                    "Chưa đọc"
                            );
                }
            }


            // =================================================
            // 5. TRẢ FILE PDF
            // =================================================

            return ResponseEntity.ok()

                    .header(

                            HttpHeaders.CONTENT_DISPOSITION,

                            "attachment; filename=\"DonThuoc_MedcareHospital_DP"
                                    + String.format(
                                    "%05d",
                                    id
                            )
                                    + ".pdf\""
                    )

                    .contentType(

                            MediaType.APPLICATION_PDF
                    )

                    .body(pdf);


        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity

                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )

                    .build();
        }
    }


    // =====================================================
    // 6. TẢI HÓA ĐƠN
    // CÓ TIỀN
    // =====================================================

    @GetMapping("/lich-su-cap-thuoc/{id}/invoice-pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(

            @PathVariable
            Integer id

    ) {

        try {

            // =================================================
            // 1. TẠO HÓA ĐƠN PDF
            // =================================================

            byte[] pdf =
                    duocSiPdfService
                            .generateInvoicePdf(id);


            // =================================================
            // 2. LẤY TÀI KHOẢN ĐANG ĐĂNG NHẬP
            // =================================================

            Authentication authentication =
                    SecurityContextHolder
                            .getContext()
                            .getAuthentication();


            if (

                    authentication != null

                            && authentication.isAuthenticated()

                            && !"anonymousUser".equals(
                            authentication.getName()
                    )

            ) {

                String username =
                        authentication.getName();


                // =================================================
                // 3. TÌM NGƯỜI DÙNG
                // =================================================

                NguoiDung nguoiDung =
                        nguoiDungRepository
                                .findByTenDangNhap(username)
                                .orElse(null);


                // =================================================
                // 4. LƯU DB + GỬI WEBSOCKET
                // =================================================

                if (nguoiDung != null) {

                    thongBaoWebSocketService
                            .taoVaGuiThongBao(

                                    nguoiDung,

                                    "Tải hóa đơn thuốc",

                                    "Hóa đơn DP"
                                            + String.format(
                                            "%05d",
                                            id
                                    )
                                            + " đã được tải xuống thành công.",

                                    "DOWNLOAD_INVOICE",

                                    "Chưa đọc"
                            );
                }
            }


            // =================================================
            // 5. TRẢ FILE PDF
            // =================================================

            return ResponseEntity.ok()

                    .header(

                            HttpHeaders.CONTENT_DISPOSITION,

                            "attachment; filename=\"HoaDon_MedcareHospital_DP"
                                    + String.format(
                                    "%05d",
                                    id
                            )
                                    + ".pdf\""
                    )

                    .contentType(

                            MediaType.APPLICATION_PDF
                    )

                    .body(pdf);


        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity

                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )

                    .build();
        }
    }

    // ===================================
    // chờ cấp thuốc
    // ===================================

    @PostMapping("/cho-cap-thuoc/{id}/bat-dau")
    public ResponseEntity<String> batDauCapThuoc(
            @PathVariable Integer id
    ) {
        duocSiCapThuocService.batDauCapThuoc(id);

        return ResponseEntity.ok(
                "Đã chuyển đơn thuốc sang trạng thái đang lấy thuốc."
        );
    }

    // ============================================
    // dieu chinh don thuoc
    // ============================================
    @PutMapping("/cho-cap-thuoc/{id}/dieu-chinh")
    public String dieuChinhDonThuoc(
            @PathVariable("id") Integer id,
            @RequestBody DuocSiDieuChinhDonThuocRequest request
    ) {
        duocSiDieuChinhDonThuocService.dieuChinh(id, request);
        return "Lưu điều chỉnh đơn thuốc thành công.";
    }


    // =====================================================
    // LẬP HÓA ĐƠN THUỐC
    // POST /api/duocsi/cho-cap-thuoc/{id}/hoa-don
    // =====================================================

    @PostMapping("/cho-cap-thuoc/{id}/hoa-don")
    public ResponseEntity<?> taoHoaDonThuoc(
            @PathVariable("id") Integer id
    ) {
        try {
            Integer maHoaDon =
                    hoaDonThuocService.taoHoaDonThuoc(id);

            return ResponseEntity.ok(
                    java.util.Map.of(
                            "success", true,
                            "message", "Lập hóa đơn thuốc thành công.",
                            "maDonThuoc", id,
                            "maHoaDon", maHoaDon
                    )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .badRequest()
                    .body(java.util.Map.of(
                            "success", false,
                            "message", e.getMessage()
                    ));

        } catch (IllegalStateException e) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of(
                            "success", false,
                            "message", e.getMessage()
                    ));
        }
    }
}