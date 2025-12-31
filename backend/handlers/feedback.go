package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"trip-planner-backend/config"
	"trip-planner-backend/models"
)

type FeedbackRequest struct {
	FeedbackType  string `json:"feedback_type"`
	DistrictName  string `json:"district_name,omitempty"`
	AgencyID      *int   `json:"agency_id,omitempty"`
	FeedbackText  string `json:"feedback_text"`
	Rating        int    `json:"rating"`
	HotelName     string `json:"hotel_name,omitempty"`
	HotelFeedback string `json:"hotel_feedback,omitempty"`
	HotelRating   *int   `json:"hotel_rating,omitempty"`
}

// SubmitFeedback handles user feedback submission
func SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := r.Context().Value("userid").(int)

	var req FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate feedback type
	if req.FeedbackType != "trip_plan" && req.FeedbackType != "travel_agency" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid feedback type. Must be 'trip_plan' or 'travel_agency'"})
		return
	}

	// Validate rating
	if req.Rating < 0 || req.Rating > 5 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Rating must be between 0 and 5"})
		return
	}

	// Validate feedback text length (0-25 words for both types)
	wordCount := len(splitWords(req.FeedbackText))
	if wordCount > 25 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Feedback must be 0-25 words"})
		return
	}

	// District name is required for trip_plan
	if req.FeedbackType == "trip_plan" && req.DistrictName == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "District name is required for trip plan feedback"})
		return
	}

	// Validate hotel rating if provided
	if req.HotelRating != nil && (*req.HotelRating < 0 || *req.HotelRating > 5) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Hotel rating must be between 0 and 5"})
		return
	}

	// If travel_agency feedback, agency_id is required
	if req.FeedbackType == "travel_agency" && req.AgencyID == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Agency ID is required for travel agency feedback"})
		return
	}

	// Default feedback text if empty (for trip_plan where it's optional)
	feedbackText := req.FeedbackText
	if feedbackText == "" {
		feedbackText = "No additional comments"
	}

	var feedback models.Feedback
	var err error

	if req.FeedbackType == "travel_agency" && req.AgencyID != nil {
		err = config.DB.QueryRow(`
			INSERT INTO feedbacks (user_id, feedback_type, agency_id, feedback_text, rating, hotel_name, hotel_feedback, hotel_rating)
			VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''), $8)
			RETURNING feedback_id, created_at
		`, userID, req.FeedbackType, req.AgencyID, feedbackText, req.Rating,
			req.HotelName, req.HotelFeedback, nullInt(req.HotelRating)).Scan(
			&feedback.FeedbackID, &feedback.CreatedAt,
		)
		feedback.UserID = userID
		feedback.FeedbackType = req.FeedbackType
		feedback.AgencyID = req.AgencyID
		feedback.FeedbackText = feedbackText
		feedback.Rating = req.Rating
		feedback.HotelName = req.HotelName
		feedback.HotelFeedback = req.HotelFeedback
		feedback.HotelRating = req.HotelRating
	} else {
		// Trip plan feedback - includes district_name
		err = config.DB.QueryRow(`
			INSERT INTO feedbacks (user_id, feedback_type, district_name, feedback_text, rating, hotel_name, hotel_feedback, hotel_rating)
			VALUES ($1, $2, NULLIF($3, ''), $4, $5, NULLIF($6, ''), NULLIF($7, ''), $8)
			RETURNING feedback_id, created_at
		`, userID, req.FeedbackType, req.DistrictName, feedbackText, req.Rating,
			req.HotelName, req.HotelFeedback, nullInt(req.HotelRating)).Scan(
			&feedback.FeedbackID, &feedback.CreatedAt,
		)
		feedback.UserID = userID
		feedback.FeedbackType = req.FeedbackType
		feedback.DistrictName = req.DistrictName
		feedback.FeedbackText = feedbackText
		feedback.Rating = req.Rating
		feedback.HotelName = req.HotelName
		feedback.HotelFeedback = req.HotelFeedback
		feedback.HotelRating = req.HotelRating
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save feedback: " + err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Feedback submitted successfully",
		"feedback": feedback,
	})
}

// GetUserFeedbacks retrieves all feedbacks submitted by a user
func GetUserFeedbacks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := r.Context().Value("userid").(int)

	rows, err := config.DB.Query(`
		SELECT f.feedback_id, f.user_id, f.feedback_type, f.agency_id, 
			   COALESCE(a.name, '') as agency_name, COALESCE(f.district_name, '') as district_name,
			   f.feedback_text, f.rating, COALESCE(f.hotel_name, '') as hotel_name, 
			   COALESCE(f.hotel_feedback, '') as hotel_feedback, f.hotel_rating, f.created_at
		FROM feedbacks f
		LEFT JOIN travel_agencies a ON f.agency_id = a.agency_id
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC
	`, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch feedbacks"})
		return
	}
	defer rows.Close()

	var feedbacks []models.Feedback
	for rows.Next() {
		var f models.Feedback
		var agencyID sql.NullInt64
		var hotelRating sql.NullInt64
		err := rows.Scan(
			&f.FeedbackID, &f.UserID, &f.FeedbackType, &agencyID, &f.AgencyName, &f.DistrictName,
			&f.FeedbackText, &f.Rating, &f.HotelName, &f.HotelFeedback, &hotelRating, &f.CreatedAt,
		)
		if err != nil {
			continue
		}
		if agencyID.Valid {
			id := int(agencyID.Int64)
			f.AgencyID = &id
		}
		if hotelRating.Valid {
			rating := int(hotelRating.Int64)
			f.HotelRating = &rating
		}
		feedbacks = append(feedbacks, f)
	}

	json.NewEncoder(w).Encode(feedbacks)
}

// GetAllAgencies returns all travel agencies for the dropdown
func GetAllAgencies(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := config.DB.Query(`
		SELECT agency_id, name FROM travel_agencies ORDER BY name
	`)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch agencies"})
		return
	}
	defer rows.Close()

	var agencies []map[string]interface{}
	for rows.Next() {
		var agencyID int
		var name string
		if err := rows.Scan(&agencyID, &name); err != nil {
			continue
		}
		agencies = append(agencies, map[string]interface{}{
			"agency_id": agencyID,
			"name":      name,
		})
	}

	json.NewEncoder(w).Encode(agencies)
}

// GetAllFeedbacks retrieves all feedbacks (admin only)
func GetAllFeedbacks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := config.DB.Query(`
		SELECT f.feedback_id, f.user_id, u.username, f.feedback_type, f.agency_id, 
			   COALESCE(a.name, '') as agency_name, COALESCE(f.district_name, '') as district_name,
			   f.feedback_text, f.rating, COALESCE(f.hotel_name, '') as hotel_name, 
			   COALESCE(f.hotel_feedback, '') as hotel_feedback, f.hotel_rating, f.created_at
		FROM feedbacks f
		JOIN users u ON f.user_id = u.userid
		LEFT JOIN travel_agencies a ON f.agency_id = a.agency_id
		ORDER BY f.created_at DESC
	`)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch feedbacks"})
		return
	}
	defer rows.Close()

	var feedbacks []models.Feedback
	for rows.Next() {
		var f models.Feedback
		var agencyID sql.NullInt64
		var hotelRating sql.NullInt64
		err := rows.Scan(
			&f.FeedbackID, &f.UserID, &f.Username, &f.FeedbackType, &agencyID, &f.AgencyName, &f.DistrictName,
			&f.FeedbackText, &f.Rating, &f.HotelName, &f.HotelFeedback, &hotelRating, &f.CreatedAt,
		)
		if err != nil {
			continue
		}
		if agencyID.Valid {
			id := int(agencyID.Int64)
			f.AgencyID = &id
		}
		if hotelRating.Valid {
			rating := int(hotelRating.Int64)
			f.HotelRating = &rating
		}
		feedbacks = append(feedbacks, f)
	}

	json.NewEncoder(w).Encode(feedbacks)
}

// GetAgencyFeedbacks retrieves all feedbacks for a specific agency
func GetAgencyFeedbacks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	agencyID := r.Context().Value("agencyid").(int)

	rows, err := config.DB.Query(`
		SELECT f.feedback_id, f.user_id, u.username, f.feedback_type, f.agency_id, 
			   f.feedback_text, f.rating, COALESCE(f.hotel_name, '') as hotel_name, 
			   COALESCE(f.hotel_feedback, '') as hotel_feedback, f.hotel_rating, f.created_at
		FROM feedbacks f
		JOIN users u ON f.user_id = u.userid
		WHERE f.agency_id = $1
		ORDER BY f.created_at DESC
	`, agencyID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch feedbacks"})
		return
	}
	defer rows.Close()

	var feedbacks []models.Feedback
	for rows.Next() {
		var f models.Feedback
		var dbAgencyID sql.NullInt64
		var hotelRating sql.NullInt64
		err := rows.Scan(
			&f.FeedbackID, &f.UserID, &f.Username, &f.FeedbackType, &dbAgencyID,
			&f.FeedbackText, &f.Rating, &f.HotelName, &f.HotelFeedback, &hotelRating, &f.CreatedAt,
		)
		if err != nil {
			continue
		}
		if dbAgencyID.Valid {
			id := int(dbAgencyID.Int64)
			f.AgencyID = &id
		}
		if hotelRating.Valid {
			rating := int(hotelRating.Int64)
			f.HotelRating = &rating
		}
		feedbacks = append(feedbacks, f)
	}

	// Calculate average rating
	var totalRating int
	for _, f := range feedbacks {
		totalRating += f.Rating
	}
	avgRating := 0.0
	if len(feedbacks) > 0 {
		avgRating = float64(totalRating) / float64(len(feedbacks))
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"feedbacks":      feedbacks,
		"average_rating": avgRating,
		"total_reviews":  len(feedbacks),
	})
}

// DeleteFeedback allows a user to delete their own feedback
func DeleteFeedback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := r.Context().Value("userid").(int)

	// Get feedback ID from URL
	feedbackIDStr := r.URL.Query().Get("id")
	if feedbackIDStr == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Feedback ID is required"})
		return
	}

	feedbackID, err := strconv.Atoi(feedbackIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid feedback ID"})
		return
	}

	// Verify ownership and delete
	result, err := config.DB.Exec(`
		DELETE FROM feedbacks WHERE feedback_id = $1 AND user_id = $2
	`, feedbackID, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete feedback"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Feedback not found or you don't have permission to delete it"})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Feedback deleted successfully"})
}

// Helper function to count words
func splitWords(s string) []string {
	var words []string
	word := ""
	for _, r := range s {
		if r == ' ' || r == '\n' || r == '\t' {
			if word != "" {
				words = append(words, word)
				word = ""
			}
		} else {
			word += string(r)
		}
	}
	if word != "" {
		words = append(words, word)
	}
	return words
}

// GetFeedbacksByDistrict retrieves all feedbacks for a specific district (public endpoint)
func GetFeedbacksByDistrict(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	district := r.URL.Query().Get("district")
	if district == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "District name is required"})
		return
	}

	rows, err := config.DB.Query(`
		SELECT f.feedback_id, f.user_id, u.username, f.feedback_type, f.district_name,
			   f.feedback_text, f.rating, COALESCE(f.hotel_name, '') as hotel_name, 
			   COALESCE(f.hotel_feedback, '') as hotel_feedback, f.hotel_rating, f.created_at
		FROM feedbacks f
		JOIN users u ON f.user_id = u.userid
		WHERE f.feedback_type = 'trip_plan' AND LOWER(f.district_name) = LOWER($1)
		ORDER BY f.created_at DESC
		LIMIT 10
	`, district)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch feedbacks"})
		return
	}
	defer rows.Close()

	var feedbacks []models.Feedback
	var totalRating int
	for rows.Next() {
		var f models.Feedback
		var hotelRating sql.NullInt64
		err := rows.Scan(
			&f.FeedbackID, &f.UserID, &f.Username, &f.FeedbackType, &f.DistrictName,
			&f.FeedbackText, &f.Rating, &f.HotelName, &f.HotelFeedback, &hotelRating, &f.CreatedAt,
		)
		if err != nil {
			continue
		}
		if hotelRating.Valid {
			rating := int(hotelRating.Int64)
			f.HotelRating = &rating
		}
		totalRating += f.Rating
		feedbacks = append(feedbacks, f)
	}

	avgRating := 0.0
	if len(feedbacks) > 0 {
		avgRating = float64(totalRating) / float64(len(feedbacks))
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"feedbacks":      feedbacks,
		"average_rating": avgRating,
		"total_reviews":  len(feedbacks),
	})
}

// GetPublicAgencyFeedbacks retrieves all feedbacks for a specific agency (public endpoint)
func GetPublicAgencyFeedbacks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	agencyIDStr := r.URL.Query().Get("agency_id")
	if agencyIDStr == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Agency ID is required"})
		return
	}

	agencyID, err := strconv.Atoi(agencyIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid agency ID"})
		return
	}

	rows, err := config.DB.Query(`
		SELECT f.feedback_id, f.user_id, u.username, f.feedback_type, f.agency_id,
			   f.feedback_text, f.rating, COALESCE(f.hotel_name, '') as hotel_name, 
			   COALESCE(f.hotel_feedback, '') as hotel_feedback, f.hotel_rating, f.created_at
		FROM feedbacks f
		JOIN users u ON f.user_id = u.userid
		WHERE f.feedback_type = 'travel_agency' AND f.agency_id = $1
		ORDER BY f.created_at DESC
		LIMIT 10
	`, agencyID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch feedbacks"})
		return
	}
	defer rows.Close()

	var feedbacks []models.Feedback
	var totalRating int
	for rows.Next() {
		var f models.Feedback
		var dbAgencyID sql.NullInt64
		var hotelRating sql.NullInt64
		err := rows.Scan(
			&f.FeedbackID, &f.UserID, &f.Username, &f.FeedbackType, &dbAgencyID,
			&f.FeedbackText, &f.Rating, &f.HotelName, &f.HotelFeedback, &hotelRating, &f.CreatedAt,
		)
		if err != nil {
			continue
		}
		if dbAgencyID.Valid {
			id := int(dbAgencyID.Int64)
			f.AgencyID = &id
		}
		if hotelRating.Valid {
			rating := int(hotelRating.Int64)
			f.HotelRating = &rating
		}
		totalRating += f.Rating
		feedbacks = append(feedbacks, f)
	}

	avgRating := 0.0
	if len(feedbacks) > 0 {
		avgRating = float64(totalRating) / float64(len(feedbacks))
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"feedbacks":      feedbacks,
		"average_rating": avgRating,
		"total_reviews":  len(feedbacks),
	})
}

// Helper function to convert string to sql.NullString
func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

// Helper function to convert *int to sql.NullInt64
func nullInt(i *int) sql.NullInt64 {
	if i == nil || *i == 0 {
		return sql.NullInt64{Valid: false}
	}
	return sql.NullInt64{Int64: int64(*i), Valid: true}
}
