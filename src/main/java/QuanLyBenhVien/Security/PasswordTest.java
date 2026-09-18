package QuanLyBenhVien.Security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordTest {

    public static void main(String[] args) {

        BCryptPasswordEncoder encoder =
                new BCryptPasswordEncoder();

        String MatKhau = "123456";

        String Hash = encoder.encode(MatKhau);

        System.out.println("Mat khau: " + MatKhau);
        System.out.println("Hash: " + Hash);

        boolean KetQua =
                encoder.matches(MatKhau, Hash);

        System.out.println("Ket qua: " + KetQua);
    }
}