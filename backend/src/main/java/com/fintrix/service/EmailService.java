package com.fintrix.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendTransactionEmail(String toEmail, String userName, String subject, String htmlContent) {
        CompletableFuture.runAsync(() -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom("Fintrix <fintirix@gmail.com>");
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);

                mailSender.send(message);
                System.out.println("✅ Transaction email sent to " + toEmail);
            } catch (Exception e) {
                System.err.println("❌ Failed to send email to " + toEmail + ": " + e.getMessage());
            }
        });
    }

    public String generateTradeEmailHtml(String userName, String type, String ticker, int shares, BigDecimal price) {
        boolean isBuy = "BUY".equalsIgnoreCase(type);
        BigDecimal totalVal = price.multiply(new BigDecimal(shares));
        
        NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        String total = formatter.format(totalVal);
        String color = isBuy ? "#00d09c" : "#eb5757";

        return "<div style=\"font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ebedf5; border-radius: 8px; overflow: hidden;\">" +
                "  <div style=\"background: " + color + "; color: white; padding: 20px; text-align: center;\">" +
                "    <h2 style=\"margin: 0;\">Trade Executed</h2>" +
                "  </div>" +
                "  <div style=\"padding: 24px; background: #ffffff; color: #1a1a2e;\">" +
                "    <p>Hi <strong>" + userName + "</strong>,</p>" +
                "    <p>Your order to <strong>" + type + "</strong> " + shares + " shares of " + ticker + " has been successfully executed.</p>" +
                "    <table style=\"width: 100%; border-collapse: collapse; margin-top: 20px;\">" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Stock</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold;\">" + ticker + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Order Type</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold; color: " + color + "\">" + type + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Quantity</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold;\">" + shares + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Avg. Price</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold;\">₹" + price.setScale(2, BigDecimal.ROUND_HALF_UP).toString() + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 12px 0 0; color: #8c8fa6; font-size: 16px;\">Total Value</td>" +
                "        <td style=\"padding: 12px 0 0; text-align: right; font-weight: bold; font-size: 16px;\">" + total + "</td>" +
                "      </tr>" +
                "    </table>" +
                "    <p style=\"margin-top: 30px; font-size: 12px; color: #8c8fa6; text-align: center;\">" +
                "      Thank you for investing with Fintrix." +
                "    </p>" +
                "  </div>" +
                "</div>";
    }

    public String generateMFTradeEmailHtml(String userName, String type, String mfName, BigDecimal amount, BigDecimal nav, BigDecimal units) {
        boolean isBuy = "BUY".equalsIgnoreCase(type) || "INVEST".equalsIgnoreCase(type);
        
        NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        String total = formatter.format(amount);
        String color = isBuy ? "#00d09c" : "#eb5757";
        String displayType = isBuy ? "Invest" : "Redeem";

        return "<div style=\"font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ebedf5; border-radius: 8px; overflow: hidden;\">" +
                "  <div style=\"background: " + color + "; color: white; padding: 20px; text-align: center;\">" +
                "    <h2 style=\"margin: 0;\">Mutual Fund Transaction Executed</h2>" +
                "  </div>" +
                "  <div style=\"padding: 24px; background: #ffffff; color: #1a1a2e;\">" +
                "    <p>Hi <strong>" + userName + "</strong>,</p>" +
                "    <p>Your order to <strong>" + displayType + "</strong> units of <strong>" + mfName + "</strong> has been successfully executed.</p>" +
                "    <table style=\"width: 100%; border-collapse: collapse; margin-top: 20px;\">" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Mutual Fund</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold;\">" + mfName + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Transaction Type</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold; color: " + color + "\">" + displayType + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Units</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold;\">" + units.setScale(4, BigDecimal.ROUND_HALF_UP).toString() + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">NAV</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold;\">₹" + nav.setScale(2, BigDecimal.ROUND_HALF_UP).toString() + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 12px 0 0; color: #8c8fa6; font-size: 16px;\">Total Value</td>" +
                "        <td style=\"padding: 12px 0 0; text-align: right; font-weight: bold; font-size: 16px;\">" + total + "</td>" +
                "      </tr>" +
                "    </table>" +
                "    <p style=\"margin-top: 30px; font-size: 12px; color: #8c8fa6; text-align: center;\">" +
                "      Thank you for investing with Fintrix." +
                "    </p>" +
                "  </div>" +
                "</div>";
    }

    public String generateFundEmailHtml(String userName, BigDecimal amount, String bankName, String upiRef) {
        NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        String total = formatter.format(amount);

        return "<div style=\"font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #ebedf5; border-radius: 8px; overflow: hidden;\">" +
                "  <div style=\"background: #00d09c; color: white; padding: 20px; text-align: center;\">" +
                "    <h2 style=\"margin: 0;\">Funds Added Successfully</h2>" +
                "  </div>" +
                "  <div style=\"padding: 24px; background: #ffffff; color: #1a1a2e;\">" +
                "    <p>Hi <strong>" + userName + "</strong>,</p>" +
                "    <p>We've successfully received your funds deposit to your Fintrix wallet.</p>" +
                "    <table style=\"width: 100%; border-collapse: collapse; margin-top: 20px;\">" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Amount</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold; color: #00d09c;\">+" + total + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Bank</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold;\">" + bankName + "</td>" +
                "      </tr>" +
                "      <tr>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; color: #8c8fa6;\">Reference (UPI)</td>" +
                "        <td style=\"padding: 8px 0; border-bottom: 1px solid #ebedf5; text-align: right; font-weight: bold;\">" + upiRef + "</td>" +
                "      </tr>" +
                "    </table>" +
                "    <p style=\"margin-top: 30px; font-size: 12px; color: #8c8fa6; text-align: center;\">" +
                "      Your funds are now ready to be invested. Happy trading!" +
                "    </p>" +
                "  </div>" +
                "</div>";
    }
}
