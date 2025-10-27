package utils

import (
	"fmt"
	"net/smtp"
	"os"
)

func SendPasswordResetEmail(toEmail, username, resetCode string) error {
	from := os.Getenv("SMTP_USER")
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")

	// Create message with 6-digit code
	subject := "Password Reset Request - AI Trip Planner"
	body := fmt.Sprintf(`Hello %s,

You have requested to reset your password for AI Trip Planner.

Your 6-digit password reset code is:

    %s

This code will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

Best regards,
AI Trip Planner Team`, username, resetCode)

	// Format email with proper headers
	msg := fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: text/plain; charset=UTF-8\r\n"+
		"\r\n"+
		"%s\r\n", from, toEmail, subject, body)

	// Authentication
	auth := smtp.PlainAuth("", from, password, smtpHost)

	// Send email
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{toEmail}, []byte(msg))
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}
