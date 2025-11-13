package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"trip-planner-backend/config"
	"trip-planner-backend/models"
	"trip-planner-backend/utils"

	"github.com/gorilla/mux"
)

func GenerateTrip(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userid").(int)

	var tripReq models.TripRequest
	if err := json.NewDecoder(r.Body).Decode(&tripReq); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	tripDetails, err := utils.GenerateTripWithGroq(tripReq)
	if err != nil {
		http.Error(w, "Error generating trip: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var tripID int
	query := `INSERT INTO trips (tripdetails) VALUES ($1) RETURNING tripid`
	err = config.DB.QueryRow(query, tripDetails).Scan(&tripID)
	if err != nil {
		http.Error(w, "Error saving trip", http.StatusInternalServerError)
		return
	}

	saveQuery := `INSERT INTO saved (userid, tripid) VALUES ($1, $2)`
	_, err = config.DB.Exec(saveQuery, userID, tripID)
	if err != nil {
		// Trip was created but not saved
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tripid":      tripID,
		"tripdetails": tripDetails,
		"message":     "Trip generated successfully",
	})
}

func GetSavedTrips(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userid").(int)

	query := `
		SELECT t.tripid, t.tripdetails, s.saved_at
		FROM trips t
		INNER JOIN saved s ON t.tripid = s.tripid
		WHERE s.userid = $1
		ORDER BY s.saved_at DESC
	`

	rows, err := config.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "Error fetching trips", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var trips []models.SavedTripResponse
	for rows.Next() {
		var trip models.SavedTripResponse
		if err := rows.Scan(&trip.TripID, &trip.TripDetails, &trip.SavedAt); err != nil {
			continue
		}
		trips = append(trips, trip)
	}

	if trips == nil {
		trips = []models.SavedTripResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trips)
}

func SaveTrip(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userid").(int)

	var request struct {
		TripID int `json:"tripid"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var exists bool
	err := config.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM trips WHERE tripid = $1)", request.TripID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Trip not found", http.StatusNotFound)
		return
	}

	query := `INSERT INTO saved (userid, tripid) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err = config.DB.Exec(query, userID, request.TripID)
	if err != nil {
		http.Error(w, "Error saving trip", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Trip saved successfully",
	})
}

func DeleteSavedTrip(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userid").(int)
	vars := mux.Vars(r)
	tripID, err := strconv.Atoi(vars["tripid"])
	if err != nil {
		http.Error(w, "Invalid trip ID", http.StatusBadRequest)
		return
	}

	query := `DELETE FROM saved WHERE userid = $1 AND tripid = $2`
	result, err := config.DB.Exec(query, userID, tripID)
	if err != nil {
		http.Error(w, "Error deleting trip", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Trip not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Trip deleted successfully",
	})
}

// Add this function to handlers/trip.go

func GetWeather(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	destination := vars["destination"]

	if destination == "" {
		http.Error(w, "Destination is required", http.StatusBadRequest)
		return
	}

	weather, err := utils.GetWeatherForecast(destination)
	if err != nil {
		log.Printf("Weather error: %v", err)
		// Don't fail the request, just return empty weather
		weather = utils.WeatherData{
			ErrorMsg: "Weather data not available",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(weather)
}
