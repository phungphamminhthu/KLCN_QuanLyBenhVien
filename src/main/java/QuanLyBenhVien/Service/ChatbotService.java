package QuanLyBenhVien.Service;

import QuanLyBenhVien.Entity.NguoiDung;
import QuanLyBenhVien.Entity.PhienTroChuyen;
import QuanLyBenhVien.Entity.TinNhan;
import QuanLyBenhVien.DTO.*;
import QuanLyBenhVien.Repository.PhienTroChuyenRepository;
import QuanLyBenhVien.Repository.TinNhanRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.transaction.PlatformTransactionManager;

import java.util.List;

@Service
public class ChatbotService {

    private final PhienTroChuyenRepository phienRepository;
    private final TinNhanRepository tinNhanRepository;
    private final PythonAiClient pythonAiClient;
    private final TransactionTemplate transactionTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    public ChatbotService(
            PhienTroChuyenRepository phienRepository,
            TinNhanRepository tinNhanRepository,
            PythonAiClient pythonAiClient,
            PlatformTransactionManager transactionManager) {

        this.phienRepository = phienRepository;
        this.tinNhanRepository = tinNhanRepository;
        this.pythonAiClient = pythonAiClient;

        this.transactionTemplate =
                new TransactionTemplate(transactionManager);
    }

    // ===================================
    // 1. Tạo phiên trò chuyện
    // ===================================
    @Transactional
    public PhienTroChuyenResponse taoPhien(Integer maNguoiDung) {

        NguoiDung nguoiDung = entityManager.getReference(
                NguoiDung.class,
                maNguoiDung
        );

        PhienTroChuyen phien = new PhienTroChuyen();
        phien.setNguoiDung(nguoiDung);
        phien.setTrangThai("DANG_HOAT_DONG");

        phien = phienRepository.save(phien);

        return chuyenDoiPhien(phien);
    }

    // ====================================
    // 2. Lấy danh sách phiên của người dùng
    // ====================================
    @Transactional(readOnly = true)
    public List<PhienTroChuyenResponse> layDanhSachPhien(
            Integer maNguoiDung) {

        return phienRepository
                .findByNguoiDung_MaNguoiDungOrderByThoiGianBatDauDesc(
                        maNguoiDung
                )
                .stream()
                .map(this::chuyenDoiPhien)
                .toList();
    }

    // =======================================
    // 3. Kiểm tra phiên có thuộc người dùng
    // =======================================
    private PhienTroChuyen layPhienHopLe(
            Integer maPhien,
            Integer maNguoiDung) {

        return phienRepository
                .findByMaPhienAndNguoiDung_MaNguoiDung(
                        maPhien,
                        maNguoiDung
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Không tìm thấy phiên trò chuyện"
                        )
                );
    }

    // ========================================
    // 4. Lấy lịch sử tin nhắn
    // ========================================
    @Transactional(readOnly = true)
    public List<TinNhanResponse> layLichSu(
            Integer maPhien,
            Integer maNguoiDung) {

        layPhienHopLe(maPhien, maNguoiDung);

        return tinNhanRepository
                .findByPhienTroChuyen_MaPhienOrderByThoiGianTaoAsc(
                        maPhien
                )
                .stream()
                .map(this::chuyenDoiTinNhan)
                .toList();
    }

    // ==========================================
    // 5. Gửi câu hỏi và nhận câu trả lời từ Gemini
    // ==========================================
    public ChatResponse guiTinNhanVaNhanPhanHoi(
            Integer maPhien,
            Integer maNguoiDung,
            String noiDung) {

        // Bước 1: Kiểm tra phiên, xác định câu hỏi đầu tiên và lưu tin nhắn.
        TinNhanResponse tinNhanNguoiDung =
                transactionTemplate.execute(status -> {

                    PhienTroChuyen phien = layPhienHopLe(
                            maPhien,
                            maNguoiDung
                    );

                    if ("DA_KET_THUC".equals(phien.getTrangThai())) {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "Phiên trò chuyện đã kết thúc"
                        );
                    }

                    // Kiểm tra đây có phải tin nhắn đầu tiên của người dùng không.
                    // Lưu câu hỏi của người dùng.
                    TinNhan tinNhan = new TinNhan();
                    tinNhan.setPhienTroChuyen(phien);
                    tinNhan.setNoiDung(noiDung);
                    tinNhan.setNguoiGui("NguoiDung");

                    TinNhan saved = tinNhanRepository.save(tinNhan);

                    return chuyenDoiTinNhan(saved);
                });

        // Bước 2: Gọi Python FastAPI để xử lý câu hỏi.
        // Nhận cả nội dung trả lời và action.
        PythonChatResponse pythonResponse =
                pythonAiClient.guiCauHoi(noiDung);

        String noiDungAI = pythonResponse.getAnswer();

        String action = pythonResponse.getAction();

        // Bước 3: Lưu câu trả lời AI vào database.
        TinNhanResponse tinNhanAI =
                transactionTemplate.execute(status -> {

                    PhienTroChuyen phien = layPhienHopLe(
                            maPhien,
                            maNguoiDung
                    );

                    TinNhan tinNhan = new TinNhan();
                    tinNhan.setPhienTroChuyen(phien);
                    tinNhan.setNoiDung(noiDungAI);
                    tinNhan.setNguoiGui("AI");

                    TinNhan saved =
                            tinNhanRepository.save(tinNhan);

                    return chuyenDoiTinNhan(saved);
                });

        // Bước 4: Trả cả hai tin nhắn về Controller.
        return new ChatResponse(
                maPhien,
                tinNhanNguoiDung,
                tinNhanAI,
                action
        );
    }

    // ==================================
    // 6. Xóa phiên trò chuyện
    // ==================================
    @Transactional
    public void xoaPhien(
            Integer maPhien,
            Integer maNguoiDung) {

        PhienTroChuyen phien = layPhienHopLe(
                maPhien,
                maNguoiDung
        );

        // Cascade + orphanRemoval trong Entity
        // sẽ xóa các tin nhắn thuộc phiên.
        phienRepository.delete(phien);
    }

    // =============================
    // Chuyển Entity thành DTO phiên
    // =============================

    private PhienTroChuyenResponse chuyenDoiPhien(
            PhienTroChuyen phien) {

        // Lấy câu hỏi đầu tiên của người dùng làm tên phiên
        String tenPhien = tinNhanRepository
                .findFirstByPhienTroChuyen_MaPhienAndNguoiGuiOrderByThoiGianTaoAsc(
                        phien.getMaPhien(),
                        "NguoiDung"
                )
                .map(TinNhan::getNoiDung)
                .map(String::trim)
                .filter(noiDung -> !noiDung.isEmpty())
                .orElse("Cuộc trò chuyện mới");

        return new PhienTroChuyenResponse(
                phien.getMaPhien(),
                tenPhien,
                phien.getThoiGianBatDau(),
                phien.getThoiGianKetThuc(),
                phien.getTrangThai()
        );
    }


    // =============================
    // Chuyển Entity thành DTO tin nhắn
    // =============================
    private TinNhanResponse chuyenDoiTinNhan(
            TinNhan tinNhan) {

        return new TinNhanResponse(
                tinNhan.getMaTinNhan(),
                tinNhan.getNoiDung(),
                tinNhan.getNguoiGui(),
                tinNhan.getThoiGianTao()
        );
    }
}