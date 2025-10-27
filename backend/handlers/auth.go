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

func Register(w http.ResponseWriter, r *http.Request) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
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

	token, err := utils.GenerateJWT(user.UserID, user.Username)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":    token,
		"userid":   user.UserID,
		"username": user.Username,
		"message":  "Registration successful",
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

	token, err := utils.GenerateJWT(user.UserID, user.Username)
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
