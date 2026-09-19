package QuanLyBenhVien.DTO;

public class LoginResponse {
    //trả về thông tin sau khi đăng nhập
    private String Token;
    private String HoTen;
    private String Email;
    private String VaiTro;
    private String AnhDaiDien;

    public LoginResponse() {
    }

    public LoginResponse(
            String Token,
            String HoTen,
            String Email,
            String VaiTro,
            String AnhDaiDien
    ) {
        this.Token = Token;
        this.HoTen = HoTen;
        this.Email = Email;
        this.VaiTro = VaiTro;
        this.AnhDaiDien = AnhDaiDien;
    }

    public String getToken() {
        return Token;
    }

    public void setToken(String Token) {
        this.Token = Token;
    }

    public String getHoTen() {
        return HoTen;
    }

    public void setHoTen(String HoTen) {
        this.HoTen = HoTen;
    }

    public String getEmail() {
        return Email;
    }

    public void setEmail(String Email) {
        this.Email = Email;
    }

    public String getVaiTro() {
        return VaiTro;
    }

    public void setVaiTro(String VaiTro) {
        this.VaiTro = VaiTro;
    }

    public String getAnhDaiDien() {
        return AnhDaiDien;
    }

    public void setAnhDaiDien(String AnhDaiDien) {
        this.AnhDaiDien = AnhDaiDien;
    }
}
