
package QuanLyBenhVien.DTO;

import java.math.BigDecimal;

public record SePayWebhookRequest(
        Long id,
        String gateway,
        String transactionDate,
        String accountNumber,
        String subAccount,
        String code,
        String content,
        String transferType,
        String description,
        BigDecimal transferAmount,
        String referenceCode,
        BigDecimal accumulated
) {
}
