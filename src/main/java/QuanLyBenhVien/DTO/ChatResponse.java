
package QuanLyBenhVien.DTO;

public class ChatResponse {

    private Integer maPhien;
    private TinNhanResponse tinNhanNguoiDung;
    private TinNhanResponse tinNhanAI;
    private String action;

    public ChatResponse() {
    }

    public ChatResponse(
            Integer maPhien,
            TinNhanResponse tinNhanNguoiDung,
            TinNhanResponse tinNhanAI,
            String action) {

        this.maPhien = maPhien;
        this.tinNhanNguoiDung = tinNhanNguoiDung;
        this.tinNhanAI = tinNhanAI;
        this.action = action;
    }

    public Integer getMaPhien() {
        return maPhien;
    }

    public TinNhanResponse getTinNhanNguoiDung() {
        return tinNhanNguoiDung;
    }

    public TinNhanResponse getTinNhanAI() {
        return tinNhanAI;
    }

    public String getAction() {
        return action;
    }
}
