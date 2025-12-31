package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"
	"trip-planner-backend/config"
	"trip-planner-backend/models"
	"trip-planner-backend/utils"

	"github.com/gorilla/mux"
	"github.com/lib/pq"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

func SendAgencyRegistrationOTP(w http.ResponseWriter, r *http.Request) {
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
	err := config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM travel_agencies WHERE email = $1)", req.Email).Scan(&exists)
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
		req.Email, otpCode, expiresAt, "agency",
	)
	if err != nil {
		log.Printf("Error storing OTP: %v", err)
		http.Error(w, "Failed to generate OTP", http.StatusInternalServerError)
		return
	}

	// Send email
	name := req.Name
	if name == "" {
		name = "Agency"
	}
	err = utils.SendRegistrationOTPEmail(req.Email, name, otpCode)
	if err != nil {
		log.Printf("Error sending email: %v", err)
		http.Error(w, "Failed to send OTP email. Please try again.", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Agency registration OTP sent to: %s | Code: %s", req.Email, otpCode)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "OTP has been sent to your email",
	})
}

func VerifyAgencyRegistrationOTP(w http.ResponseWriter, r *http.Request) {
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
		req.Email, req.OTP, "agency",
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

func AgencyRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Website  string `json:"website"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Verify OTP was used
	var otpVerified bool
	err := config.DB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM registration_otps WHERE email = $1 AND user_type = $2 AND used = true ORDER BY created_at DESC LIMIT 1)",
		req.Email, "agency",
	).Scan(&otpVerified)
	if err != nil || !otpVerified {
		http.Error(w, "Please verify your email with OTP first", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "Name, email, and password are required", http.StatusBadRequest)
		return
	}

	if !isValidPassword(req.Password) {
		http.Error(w, "Password must be at least 8 characters and contain uppercase, lowercase, special character, and digit", http.StatusBadRequest)
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	var agency models.TravelAgency
	query := `INSERT INTO travel_agencies (name, email, password, phone, website)
			  VALUES ($1, $2, $3, $4, $5)
			  RETURNING agency_id, name, email, phone, website, created_at`

	err = config.DB.QueryRow(query, req.Name, req.Email, hashedPassword, req.Phone, req.Website).
		Scan(&agency.AgencyID, &agency.Name, &agency.Email, &agency.Phone, &agency.Website, &agency.CreatedAt)
	if err != nil {
		http.Error(w, "Agency with that email already exists", http.StatusConflict)
		return
	}

	token, err := utils.GenerateJWT(agency.AgencyID, agency.Name, "agency")
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"token":     token,
		"agency":    agency,
		"role":      "agency",
		"message":   "Agency registered successfully",
		"agency_id": agency.AgencyID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func AgencyLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var agency models.TravelAgency
	query := `SELECT agency_id, name, email, phone, website, password, created_at
			  FROM travel_agencies WHERE email = $1`

	err := config.DB.QueryRow(query, req.Email).Scan(
		&agency.AgencyID,
		&agency.Name,
		&agency.Email,
		&agency.Phone,
		&agency.Website,
		&agency.Password,
		&agency.CreatedAt,
	)

	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if !utils.CheckPasswordHash(req.Password, agency.Password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := utils.GenerateJWT(agency.AgencyID, agency.Name, "agency")
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	agency.Password = ""

	response := map[string]interface{}{
		"token":     token,
		"agency":    agency,
		"role":      "agency",
		"agency_id": agency.AgencyID,
		"message":   "Login successful",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func CreateTravelPackage(w http.ResponseWriter, r *http.Request) {
	agencyID, ok := r.Context().Value("agencyid").(int)
	if !ok || agencyID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse the multipart form (limit: 20MB)
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		http.Error(w, "Error parsing form data: "+err.Error(), http.StatusBadRequest)
		return
	}

	getStr := func(key string) string { return r.FormValue(key) }
	getInt := func(key string) int {
		val, _ := strconv.Atoi(r.FormValue(key))
		return val
	}
	getFloat := func(key string) float64 {
		val, _ := strconv.ParseFloat(r.FormValue(key), 64)
		return val
	}
	getBool := func(key string) bool {
		v := r.FormValue(key)
		return v == "true" || v == "1" || v == "on"
	}

	title := getStr("title")
	description := getStr("description")
	location := getStr("location")
	initialDestination := getStr("initial_destination")
	durationDays := getInt("duration_days")
	numTravelers := getInt("num_travelers")
	transportMode := getStr("transport_mode")
	price := getFloat("price")
	isActive := getBool("is_active")

	if title == "" || description == "" || location == "" || initialDestination == "" ||
		durationDays <= 0 || price <= 0 || numTravelers <= 0 || transportMode == "" {
		http.Error(w, "All fields are required and must be valid", http.StatusBadRequest)
		return
	}

	// Parse locations array (as JSON string in form value)
	locations := []string{}
	locStr := getStr("locations")
	if locStr != "" {
		if err := json.Unmarshal([]byte(locStr), &locations); err != nil {
			http.Error(w, "Invalid locations format", http.StatusBadRequest)
			return
		}
	}

	photos := []string{}
	files := r.MultipartForm.File["photos"]
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			continue
		}
		defer file.Close()
		filename := fmt.Sprintf("%d_%d_%s", agencyID, time.Now().UnixNano(), fileHeader.Filename)
		filepath := fmt.Sprintf("uploads/packages/%s", filename)
		out, err := os.Create(filepath)
		if err != nil {
			continue
		}
		defer out.Close()
		_, err = io.Copy(out, file)
		if err == nil {
			photos = append(photos, filename)
		}
	}

	var pkg models.TravelPackage
	query := `INSERT INTO travel_packages
		(agency_id, title, description, location, initial_destination, duration_days, num_travelers, transport_mode, price, is_active, locations, photos)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING package_id, title, description, location, initial_destination, duration_days, num_travelers, transport_mode, price, is_active, locations, photos, created_at, updated_at`
	err := config.DB.QueryRow(query,
		agencyID, title, description, location, initialDestination, durationDays, numTravelers, transportMode, price, isActive, pq.Array(locations), pq.Array(photos),
	).Scan(
		&pkg.PackageID,
		&pkg.Title,
		&pkg.Description,
		&pkg.Location,
		&pkg.InitialDestination,
		&pkg.DurationDays,
		&pkg.NumTravelers,
		&pkg.TransportMode,
		&pkg.Price,
		&pkg.IsActive,
		pq.Array(&pkg.Locations),
		pq.Array(&pkg.Photos),
		&pkg.CreatedAt,
		&pkg.UpdatedAt,
	)
	if err != nil {
		http.Error(w, "Failed to create travel package", http.StatusInternalServerError)
		return
	}
	pkg.AgencyID = agencyID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pkg)
}

func GetAgencyPackages(w http.ResponseWriter, r *http.Request) {
	agencyID, ok := r.Context().Value("agencyid").(int)
	if !ok || agencyID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := `SELECT package_id, title, description, location, initial_destination, duration_days, num_travelers, transport_mode, price, is_active, locations, photos, created_at, updated_at
			  FROM travel_packages
			  WHERE agency_id = $1
			  ORDER BY created_at DESC`

	rows, err := config.DB.Query(query, agencyID)
	if err != nil {
		http.Error(w, "Failed to fetch packages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var packages []models.TravelPackage
	for rows.Next() {
		var pkg models.TravelPackage
		if err := rows.Scan(
			&pkg.PackageID,
			&pkg.Title,
			&pkg.Description,
			&pkg.Location,
			&pkg.InitialDestination,
			&pkg.DurationDays,
			&pkg.NumTravelers,
			&pkg.TransportMode,
			&pkg.Price,
			&pkg.IsActive,
			pq.Array(&pkg.Locations),
			pq.Array(&pkg.Photos),
			&pkg.CreatedAt,
			&pkg.UpdatedAt,
		); err != nil {
			continue
		}
		pkg.AgencyID = agencyID
		packages = append(packages, pkg)
	}

	if packages == nil {
		packages = []models.TravelPackage{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(packages)
}

func UpdateTravelPackage(w http.ResponseWriter, r *http.Request) {
	agencyID, ok := r.Context().Value("agencyid").(int)
	if !ok || agencyID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	packageID, err := strconv.Atoi(vars["packageid"])
	if err != nil {
		http.Error(w, "Invalid package ID", http.StatusBadRequest)
		return
	}
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		http.Error(w, "Error parsing form data: "+err.Error(), http.StatusBadRequest)
		return
	}
	getStr := func(key string) string { return r.FormValue(key) }
	getInt := func(key string) int {
		val, _ := strconv.Atoi(r.FormValue(key))
		return val
	}
	getFloat := func(key string) float64 {
		val, _ := strconv.ParseFloat(r.FormValue(key), 64)
		return val
	}
	getBool := func(key string) bool {
		v := r.FormValue(key)
		return v == "true" || v == "1" || v == "on"
	}
	title := getStr("title")
	description := getStr("description")
	location := getStr("location")
	initialDestination := getStr("initial_destination")
	durationDays := getInt("duration_days")
	numTravelers := getInt("num_travelers")
	transportMode := getStr("transport_mode")
	price := getFloat("price")
	isActive := getBool("is_active")
	if title == "" || description == "" || location == "" || initialDestination == "" ||
		durationDays <= 0 || price <= 0 || numTravelers <= 0 || transportMode == "" {
		http.Error(w, "All fields are required and must be valid", http.StatusBadRequest)
		return
	}
	// Parse locations array (as JSON string in form value)
	locations := []string{}
	locStr := getStr("locations")
	if locStr != "" {
		if err := json.Unmarshal([]byte(locStr), &locations); err != nil {
			http.Error(w, "Invalid locations format", http.StatusBadRequest)
			return
		}
	}
	photos := []string{}
	files := r.MultipartForm.File["photos"]
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			continue
		}
		defer file.Close()
		filename := fmt.Sprintf("%d_%d_%s", agencyID, time.Now().UnixNano(), fileHeader.Filename)
		filepath := fmt.Sprintf("uploads/packages/%s", filename)
		out, err := os.Create(filepath)
		if err != nil {
			continue
		}
		defer out.Close()
		_, err = io.Copy(out, file)
		if err == nil {
			photos = append(photos, filename)
		}
	}
	query := `UPDATE travel_packages
			  SET title = $1, description = $2, location = $3, initial_destination = $4, duration_days = $5,
		    num_travelers = $6, transport_mode = $7, price = $8, is_active = $9, updated_at = $10,
		    locations = $11, photos = $12
		WHERE package_id = $13 AND agency_id = $14
			  RETURNING package_id`
	result := config.DB.QueryRow(query,
		title, description, location, initialDestination, durationDays, numTravelers, transportMode, price, isActive, time.Now(), pq.Array(locations), pq.Array(photos), packageID, agencyID,
	)
	if err := result.Scan(&packageID); err != nil {
		http.Error(w, "Package not found or not owned by agency", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Package updated successfully"})
}

func DeleteTravelPackage(w http.ResponseWriter, r *http.Request) {
	agencyID, ok := r.Context().Value("agencyid").(int)
	if !ok || agencyID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	packageID, err := strconv.Atoi(vars["packageid"])
	if err != nil {
		http.Error(w, "Invalid package ID", http.StatusBadRequest)
		return
	}

	query := `DELETE FROM travel_packages WHERE package_id = $1 AND agency_id = $2`
	result, err := config.DB.Exec(query, packageID, agencyID)
	if err != nil {
		http.Error(w, "Failed to delete package", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Package not found or not owned by agency", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Package deleted successfully",
	})
}

func GetPublicTravelPackages(w http.ResponseWriter, r *http.Request) {
	query := `SELECT p.package_id,
					 p.title,
					 p.description,
					 p.location,
					 p.initial_destination,
					 p.duration_days,
					 p.num_travelers,
					 p.transport_mode,
					 p.price,
					 p.is_active,
					 p.locations,
					 p.photos,
					 p.created_at,
					 p.updated_at,
					 a.agency_id,
					 a.name
			  FROM travel_packages p
			  INNER JOIN travel_agencies a ON p.agency_id = a.agency_id
			  WHERE p.is_active = TRUE
			  ORDER BY p.created_at DESC`

	rows, err := config.DB.Query(query)
	if err != nil {
		http.Error(w, "Failed to load travel packages", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var packages []models.TravelPackage
	for rows.Next() {
		var pkg models.TravelPackage
		if err := rows.Scan(
			&pkg.PackageID,
			&pkg.Title,
			&pkg.Description,
			&pkg.Location,
			&pkg.InitialDestination,
			&pkg.DurationDays,
			&pkg.NumTravelers,
			&pkg.TransportMode,
			&pkg.Price,
			&pkg.IsActive,
			pq.Array(&pkg.Locations),
			pq.Array(&pkg.Photos),
			&pkg.CreatedAt,
			&pkg.UpdatedAt,
			&pkg.AgencyID,
			&pkg.AgencyName,
		); err != nil {
			continue
		}
		packages = append(packages, pkg)
	}

	if packages == nil {
		packages = []models.TravelPackage{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(packages)
}
