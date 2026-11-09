package QuanLyBenhVien.DTO;

import java.time.LocalDateTime;

public class TinNhanResponse {

    private Integer maTinNhan;
    private String noiDung;
    private String nguoiGui;
    private LocalDateTime thoiGianTao;

    public TinNhanResponse() {
    }

    public TinNhanResponse(
            Integer maTinNhan,
            String noiDung,
            String nguoiGui,
            LocalDateTime thoiGianTao) {

        this.maTinNhan = maTinNhan;
        this.noiDung = noiDung;
        this.nguoiGui = nguoiGui;
        this.thoiGianTao = thoiGianTao;
    }

    public Integer getMaTinNhan() {
        return maTinNhan;
    }

    public String getNoiDung() {
        return noiDung;
    }

    public String getNguoiGui() {
        return nguoiGui;
    }

    public LocalDateTime getThoiGianTao() {
        return thoiGianTao;
    }

}