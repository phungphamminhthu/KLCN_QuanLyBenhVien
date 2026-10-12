package QuanLyBenhVien.Repository;

import QuanLyBenhVien.Entity.RegistrationOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RegistrationOtpRepository
        extends JpaRepository<RegistrationOtp, Long> {

    Optional<RegistrationOtp> findByEmailIgnoreCase(String email);

    void deleteByEmailIgnoreCase(String email);
}
