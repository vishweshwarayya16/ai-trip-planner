package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"regexp"
	"time"
	"trip-planner-backend/config"
	"trip-planner-backend/models"
	"trip-planner-backend/utils"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

func SendRegistrationOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	// Check if email already exists
	var exists bool
	err := config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if exists {
		http.Error(w, "Email already registered", http.StatusConflict)
		return
	}

	// Generate 6-digit OTP
	otpCode := fmt.Sprintf("%06d", 100000+rand.Intn(900000))

	// Store OTP with 15 minute expiry
	expiresAt := time.Now().Add(15 * time.Minute)
	_, err = config.DB.Exec(
		"INSERT INTO registration_otps (email, otp_code, expires_at, user_type) VALUES ($1, $2, $3, $4)",
		req.Email, otpCode, expiresAt, "user",
	)
	if err != nil {
		log.Printf("Error storing OTP: %v", err)
		http.Error(w, "Failed to generate OTP", http.StatusInternalServerError)
		return
	}

	// Send email
	name := req.Name
	if name == "" {
		name = "User"
	}
	err = utils.SendRegistrationOTPEmail(req.Email, name, otpCode)
	if err != nil {
		log.Printf("Error sending email: %v", err)
		http.Error(w, "Failed to send OTP email. Please try again.", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Registration OTP sent to: %s | Code: %s", req.Email, otpCode)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "OTP has been sent to your email",
	})
}

func VerifyRegistrationOTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check if OTP exists and is valid
	var id int
	var expiresAt time.Time
	var used bool

	err := config.DB.QueryRow(
		"SELECT id, expires_at, used FROM registration_otps WHERE email = $1 AND otp_code = $2 AND user_type = $3 ORDER BY created_at DESC LIMIT 1",
		req.Email, req.OTP, "user",
	).Scan(&id, &expiresAt, &used)

	if err == sql.ErrNoRows {
		http.Error(w, "Invalid OTP", http.StatusBadRequest)
		return
	}

	if used {
		http.Error(w, "OTP already used", http.StatusBadRequest)
		return
	}

	if time.Now().After(expiresAt) {
		http.Error(w, "OTP expired", http.StatusBadRequest)
		return
	}

	// Mark OTP as used
	_, err = config.DB.Exec("UPDATE registration_otps SET used = true WHERE id = $1", id)
	if err != nil {
		log.Printf("Warning: Failed to mark OTP as used: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "OTP verified successfully",
	})
}

func Register(w http.ResponseWriter, r *http.Request) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Verify OTP was used
	var otpVerified bool
	err := config.DB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM registration_otps WHERE email = $1 AND user_type = $2 AND used = true ORDER BY created_at DESC LIMIT 1)",
		user.Email, "user",
	).Scan(&otpVerified)
	if err != nil || !otpVerified {
		http.Error(w, "Please verify your email with OTP first", http.StatusBadRequest)
		return
	}

	if !isValidPassword(user.Password) {
		http.Error(w, "Password must be at least 8 characters and contain uppercase, lowercase, special character, and digit", http.StatusBadRequest)
		return
	}

	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	query := `INSERT INTO users (username, firstname, lastname, email, password) 
			  VALUES ($1, $2, $3, $4, $5) RETURNING userid`

	err = config.DB.QueryRow(query, user.Username, user.FirstName, user.LastName, user.Email, hashedPassword).Scan(&user.UserID)
	if err != nil {
		http.Error(w, "Username or email already exists", http.StatusConflict)
		return
	}

	token, err := utils.GenerateJWT(user.UserID, user.Username, "user")
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":     token,
		"userid":    user.UserID,
		"username":  user.Username,
		"firstname": user.FirstName,
		"lastname":  user.LastName,
		"email":     user.Email,
		"role":      "user",
		"message":   "Registration successful",
	})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var credentials struct {
		UsernameOrEmail string `json:"username_or_email"`
		Password        string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var user models.User
	query := `SELECT userid, username, firstname, lastname, email, password 
			  FROM users WHERE username = $1 OR email = $1`

	err := config.DB.QueryRow(query, credentials.UsernameOrEmail).Scan(
		&user.UserID, &user.Username, &user.FirstName, &user.LastName, &user.Email, &user.Password)

	if err == sql.ErrNoRows {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if !utils.CheckPasswordHash(credentials.Password, user.Password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := utils.GenerateJWT(user.UserID, user.Username, "user")
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":     token,
		"userid":    user.UserID,
		"username":  user.Username,
		"firstname": user.FirstName,
		"lastname":  user.LastName,
		"email":     user.Email,
		"role":      "user",
		"message":   "Login successful",
	})
}

func ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check if email exists
	var username string
	err := config.DB.QueryRow("SELECT username FROM users WHERE email = $1", request.Email).Scan(&username)

	if err == sql.ErrNoRows {
		// Don't reveal if email doesn't exist
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "If the email exists, a password reset code has been sent",
		})
		return
	}

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Generate 6-digit reset code
	resetCode := fmt.Sprintf("%06d", 100000+rand.Intn(900000))

	// Store reset code in database with 1 hour expiry
	expiresAt := time.Now().Add(1 * time.Hour)
	_, err = config.DB.Exec(
		"INSERT INTO password_resets (email, reset_code, expires_at) VALUES ($1, $2, $3)",
		request.Email, resetCode, expiresAt,
	)
	if err != nil {
		log.Printf("Error storing reset code: %v", err)
		http.Error(w, "Failed to generate reset code", http.StatusInternalServerError)
		return
	}

	// Send email
	err = utils.SendPasswordResetEmail(request.Email, username, resetCode)
	if err != nil {
		log.Printf("Error sending email: %v", err)
		http.Error(w, "Failed to send email. Please try again.", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Password reset code sent to: %s | Code: %s", request.Email, resetCode)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Password reset code has been sent to your email",
	})
}

func VerifyResetCode(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Check if code exists and is valid
	var id int
	var expiresAt time.Time
	var used bool

	err := config.DB.QueryRow(
		"SELECT id, expires_at, used FROM password_resets WHERE email = $1 AND reset_code = $2 ORDER BY created_at DESC LIMIT 1",
		request.Email, request.Code,
	).Scan(&id, &expiresAt, &used)

	if err == sql.ErrNoRows {
		http.Error(w, "Invalid reset code", http.StatusBadRequest)
		return
	}

	if used {
		http.Error(w, "Reset code already used", http.StatusBadRequest)
		return
	}

	if time.Now().After(expiresAt) {
		http.Error(w, "Reset code expired", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Code verified successfully",
	})
}

func ResetPassword(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email       string `json:"email"`
		Code        string `json:"code"`
		NewPassword string `json:"new_password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Validate password
	if !isValidPassword(request.NewPassword) {
		http.Error(w, "Password must be at least 8 characters and contain uppercase, lowercase, special character, and digit", http.StatusBadRequest)
		return
	}

	// Verify code
	var id int
	var expiresAt time.Time
	var used bool

	err := config.DB.QueryRow(
		"SELECT id, expires_at, used FROM password_resets WHERE email = $1 AND reset_code = $2 ORDER BY created_at DESC LIMIT 1",
		request.Email, request.Code,
	).Scan(&id, &expiresAt, &used)

	if err == sql.ErrNoRows {
		http.Error(w, "Invalid reset code", http.StatusBadRequest)
		return
	}

	if used {
		http.Error(w, "Reset code already used", http.StatusBadRequest)
		return
	}

	if time.Now().After(expiresAt) {
		http.Error(w, "Reset code expired", http.StatusBadRequest)
		return
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(request.NewPassword)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	// Update password
	_, err = config.DB.Exec("UPDATE users SET password = $1 WHERE email = $2", hashedPassword, request.Email)
	if err != nil {
		http.Error(w, "Failed to update password", http.StatusInternalServerError)
		return
	}

	// Mark code as used
	_, err = config.DB.Exec("UPDATE password_resets SET used = true WHERE id = $1", id)
	if err != nil {
		log.Printf("Warning: Failed to mark reset code as used: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Password reset successful",
	})
}

func GetUser(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userid").(int)

	var user models.User
	query := `SELECT userid, username, firstname, lastname, email FROM users WHERE userid = $1`

	err := config.DB.QueryRow(query, userID).Scan(&user.UserID, &user.Username, &user.FirstName, &user.LastName, &user.Email)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func isValidPassword(password string) bool {
	if len(password) < 8 {
		return false
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)
	hasSpecial := regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`).MatchString(password)

	return hasUpper && hasLower && hasDigit && hasSpecial
}
