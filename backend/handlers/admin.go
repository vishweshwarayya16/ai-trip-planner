package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"
	"trip-planner-backend/config"
	"trip-planner-backend/models"
	"trip-planner-backend/utils"

	"github.com/gorilla/mux"
)

// this is cvhatgpt fix
func sendJSONError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}

// this is end of chatgpt
// Admin login
func AdminLogin(w http.ResponseWriter, r *http.Request) {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&credentials); err != nil {
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if credentials.Email != adminEmail || credentials.Password != adminPassword {
		sendJSONError(w, "You are not an admin. Access denied.", http.StatusUnauthorized)
		return
	}

	// Generate admin token
	token, err := utils.GenerateJWT(0, "admin", "admin") // userid 0 for admin
	if err != nil {
		sendJSONError(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":   token,
		"email":   adminEmail,
		"role":    "admin",
		"message": "Admin login successful",
	})
}

// Get all users
func GetAllUsers(w http.ResponseWriter, r *http.Request) {
	query := `SELECT userid, username, firstname, lastname, email, created_at FROM users ORDER BY created_at DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		sendJSONError(w, "Error fetching users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.UserID, &user.Username, &user.FirstName, &user.LastName, &user.Email, &user.CreatedAt); err != nil {
			continue
		}
		users = append(users, user)
	}

	if users == nil {
		users = []models.User{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// Create user by admin
func AdminCreateUser(w http.ResponseWriter, r *http.Request) {
	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	if user.Username == "" || user.FirstName == "" || user.LastName == "" || user.Email == "" || user.Password == "" {
		sendJSONError(w, "All fields are required", http.StatusBadRequest)
		return
	}

	if !isValidPassword(user.Password) {
		sendJSONError(w, "Password must be at least 8 characters with uppercase, lowercase, digit, and special character", http.StatusBadRequest)
		return
	}

	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		sendJSONError(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	query := `INSERT INTO users (username, firstname, lastname, email, password) 
			  VALUES ($1, $2, $3, $4, $5) RETURNING userid`

	err = config.DB.QueryRow(query, user.Username, user.FirstName, user.LastName, user.Email, hashedPassword).Scan(&user.UserID)
	if err != nil {
		sendJSONError(w, "Username or email already exists", http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"userid":  user.UserID,
		"message": "User created successfully",
	})
}

// Update user by admin
func AdminUpdateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := strconv.Atoi(vars["userid"])
	if err != nil {
		sendJSONError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var user models.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// Check if user exists
	var exists bool
	err = config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE userid = $1)", userID).Scan(&exists)
	if err != nil || !exists {
		sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	query := `UPDATE users SET username = $1, firstname = $2, lastname = $3, email = $4 WHERE userid = $5`
	_, err = config.DB.Exec(query, user.Username, user.FirstName, user.LastName, user.Email, userID)
	if err != nil {
		sendJSONError(w, "Error updating user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User updated successfully",
	})
}

// Delete user by admin
func AdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := strconv.Atoi(vars["userid"])
	if err != nil {
		sendJSONError(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	query := `DELETE FROM users WHERE userid = $1`
	result, err := config.DB.Exec(query, userID)
	if err != nil {
		sendJSONError(w, "Error deleting user", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		sendJSONError(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User deleted successfully",
	})
}

// Save contact message
func SaveContactMessage(w http.ResponseWriter, r *http.Request) {
	var message struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Subject string `json:"subject"`
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&message); err != nil {
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	if message.Name == "" || message.Email == "" || message.Subject == "" || message.Message == "" {
		sendJSONError(w, "All fields are required", http.StatusBadRequest)
		return
	}

	query := `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)`
	_, err := config.DB.Exec(query, message.Name, message.Email, message.Subject, message.Message)
	if err != nil {
		sendJSONError(w, "Error saving message", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Your message has been sent successfully. We'll get back to you soon!",
	})
}

// Get all contact messages (admin only)
func GetAllContactMessages(w http.ResponseWriter, r *http.Request) {
	query := `SELECT id, name, email, subject, message, replied, admin_reply, created_at, replied_at 
			  FROM contact_messages ORDER BY created_at DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		sendJSONError(w, "Error fetching messages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []map[string]interface{}
	for rows.Next() {
		var (
			id         int
			name       string
			email      string
			subject    string
			message    string
			replied    bool
			adminReply sql.NullString
			createdAt  time.Time
			repliedAt  sql.NullTime
		)

		if err := rows.Scan(&id, &name, &email, &subject, &message, &replied, &adminReply, &createdAt, &repliedAt); err != nil {
			continue
		}

		msg := map[string]interface{}{
			"id":          id,
			"name":        name,
			"email":       email,
			"subject":     subject,
			"message":     message,
			"replied":     replied,
			"admin_reply": adminReply.String,
			"created_at":  createdAt,
			"replied_at":  repliedAt.Time,
		}
		messages = append(messages, msg)
	}

	if messages == nil {
		messages = []map[string]interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// Reply to contact message
func ReplyToContactMessage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	messageID, err := strconv.Atoi(vars["id"])
	if err != nil {
		sendJSONError(w, "Invalid message ID", http.StatusBadRequest)
		return
	}

	var reply struct {
		Reply string `json:"reply"`
	}

	if err := json.NewDecoder(r.Body).Decode(&reply); err != nil {
		sendJSONError(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	if reply.Reply == "" {
		sendJSONError(w, "Reply message is required", http.StatusBadRequest)
		return
	}

	// Get message details
	var email, name, subject string
	err = config.DB.QueryRow("SELECT email, name, subject FROM contact_messages WHERE id = $1", messageID).Scan(&email, &name, &subject)
	if err != nil {
		sendJSONError(w, "Message not found", http.StatusNotFound)
		return
	}

	// Update database
	query := `UPDATE contact_messages SET replied = true, admin_reply = $1, replied_at = $2 WHERE id = $3`
	_, err = config.DB.Exec(query, reply.Reply, time.Now(), messageID)
	if err != nil {
		sendJSONError(w, "Error saving reply", http.StatusInternalServerError)
		return
	}

	// Send email reply
	err = utils.SendContactReplyEmail(email, name, subject, reply.Reply)
	if err != nil {
		// Reply saved but email failed
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Reply saved but email sending failed. Please contact user manually.",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Reply sent successfully to %s", email),
	})
}
