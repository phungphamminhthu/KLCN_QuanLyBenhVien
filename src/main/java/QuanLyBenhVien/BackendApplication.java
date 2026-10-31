package QuanLyBenhVien;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {

		// Kiểm tra IntelliJ có nhận biến môi trường Firebase không
		String firebasePath =
				System.getenv("GOOGLE_APPLICATION_CREDENTIALS");

		System.out.println("FIREBASE ENV = " + firebasePath);

		if (firebasePath != null) {
			boolean fileExists = java.nio.file.Files.isRegularFile(
					java.nio.file.Path.of(firebasePath)
			);

			System.out.println("FIREBASE FILE EXISTS = " + fileExists);
		}

		SpringApplication.run(BackendApplication.class, args);
	}
}