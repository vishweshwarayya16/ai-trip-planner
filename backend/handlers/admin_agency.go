package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"trip-planner-backend/config"
	"trip-planner-backend/models"

	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

// GetAllAgenciesAdmin retrieves all travel agencies for admin
func GetAllAgenciesAdmin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := config.DB.Query(`
		SELECT agency_id, name, email, phone, website, created_at 
		FROM travel_agencies 
		ORDER BY created_at DESC
	`)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch agencies"})
		return
	}
	defer rows.Close()

	var agencies []models.TravelAgency
	for rows.Next() {
		var agency models.TravelAgency
		err := rows.Scan(
			&agency.AgencyID, &agency.Name, &agency.Email,
			&agency.Phone, &agency.Website, &agency.CreatedAt,
		)
		if err != nil {
			continue
		}
		agencies = append(agencies, agency)
	}

	json.NewEncoder(w).Encode(agencies)
}

// AdminCreateAgency creates a new travel agency
func AdminCreateAgency(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var request struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Website  string `json:"website"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate required fields
	if request.Name == "" || request.Email == "" || request.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Name, email, and password are required"})
		return
	}

	// Check if email already exists
	var exists bool
	err := config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM travel_agencies WHERE email = $1)", request.Email).Scan(&exists)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}
	if exists {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Email already registered"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process password"})
		return
	}

	// Insert new agency
	var agency models.TravelAgency
	err = config.DB.QueryRow(`
		INSERT INTO travel_agencies (name, email, phone, website, password)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING agency_id, name, email, phone, website, created_at
	`, request.Name, request.Email, request.Phone, request.Website, string(hashedPassword)).Scan(
		&agency.AgencyID, &agency.Name, &agency.Email,
		&agency.Phone, &agency.Website, &agency.CreatedAt,
	)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create agency: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(agency)
}

// AdminUpdateAgency updates an existing travel agency
func AdminUpdateAgency(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	agencyID, err := strconv.Atoi(vars["agencyid"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid agency ID"})
		return
	}

	var request struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Phone   string `json:"phone"`
		Website string `json:"website"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Check if email belongs to another agency
	var existingID int
	err = config.DB.QueryRow("SELECT agency_id FROM travel_agencies WHERE email = $1 AND agency_id != $2", request.Email, agencyID).Scan(&existingID)
	if err == nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Email already used by another agency"})
		return
	}

	// Update agency
	result, err := config.DB.Exec(`
		UPDATE travel_agencies 
		SET name = $1, email = $2, phone = $3, website = $4
		WHERE agency_id = $5
	`, request.Name, request.Email, request.Phone, request.Website, agencyID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update agency"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Agency not found"})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Agency updated successfully"})
}

// AdminDeleteAgency deletes a travel agency
func AdminDeleteAgency(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	agencyID, err := strconv.Atoi(vars["agencyid"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid agency ID"})
		return
	}

	// Delete agency (this will cascade delete packages due to foreign key)
	result, err := config.DB.Exec("DELETE FROM travel_agencies WHERE agency_id = $1", agencyID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete agency"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Agency not found"})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Agency deleted successfully"})
}

// GetAgencyPackagesAdmin retrieves all packages for a specific agency (admin view)
func GetAgencyPackagesAdmin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	agencyID, err := strconv.Atoi(vars["agencyid"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid agency ID"})
		return
	}

	rows, err := config.DB.Query(`
		SELECT p.package_id, p.agency_id, a.name as agency_name, p.title, p.description,
			   p.location, p.initial_destination, p.duration_days, p.num_travelers,
			   p.transport_mode, p.price, p.is_active, p.created_at
		FROM travel_packages p
		JOIN travel_agencies a ON p.agency_id = a.agency_id
		WHERE p.agency_id = $1
		ORDER BY p.created_at DESC
	`, agencyID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch packages"})
		return
	}
	defer rows.Close()

	var packages []models.TravelPackage
	for rows.Next() {
		var pkg models.TravelPackage
		err := rows.Scan(
			&pkg.PackageID, &pkg.AgencyID, &pkg.AgencyName, &pkg.Title, &pkg.Description,
			&pkg.Location, &pkg.InitialDestination, &pkg.DurationDays, &pkg.NumTravelers,
			&pkg.TransportMode, &pkg.Price, &pkg.IsActive, &pkg.CreatedAt,
		)
		if err != nil {
			continue
		}
		packages = append(packages, pkg)
	}

	json.NewEncoder(w).Encode(packages)
}
