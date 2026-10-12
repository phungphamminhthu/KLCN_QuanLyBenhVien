//package QuanLyBenhVien.DTO;
//
//public class LoginRequest {
//
//    private String TenDangNhap;
//    private String MatKhau;
//
//    public String getTenDangNhap() {
//        return TenDangNhap;
//    }
//
//    public void setTenDangNhap(String TenDangNhap) {
//        this.TenDangNhap = TenDangNhap;
//    }
//
//    public String getMatKhau() {
//        return MatKhau;
//    }
//
//    public void setMatKhau(String MatKhau) {
//        this.MatKhau = MatKhau;
//    }
//}


package QuanLyBenhVien.DTO;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class LoginRequest {

    private String tenDangNhap;
    private String matKhau;

    public LoginRequest() {
    }

    @JsonProperty("tenDangNhap")
    @JsonAlias("TenDangNhap")
    public String getTenDangNhap() {
        return tenDangNhap;
    }

    @JsonProperty("tenDangNhap")
    @JsonAlias("TenDangNhap")
    public void setTenDangNhap(String tenDangNhap) {
        this.tenDangNhap = tenDangNhap;
    }

    @JsonProperty("matKhau")
    @JsonAlias("MatKhau")
    public String getMatKhau() {
        return matKhau;
    }

    @JsonProperty("matKhau")
    @JsonAlias("MatKhau")
    public void setMatKhau(String matKhau) {
        this.matKhau = matKhau;
    }
}
