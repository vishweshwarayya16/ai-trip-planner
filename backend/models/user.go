package models

import "time"

type User struct {
	UserID    int       `json:"userid"`
	Username  string    `json:"username"`
	FirstName string    `json:"firstname"`
	LastName  string    `json:"lastname"`
	Email     string    `json:"email"`
	Password  string    `json:"password,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Trip struct {
	TripID      int       `json:"tripid"`
	TripDetails string    `json:"tripdetails"`
	CreatedAt   time.Time `json:"created_at"`
}

type Saved struct {
	ID      int       `json:"id"`
	UserID  int       `json:"userid"`
	TripID  int       `json:"tripid"`
	SavedAt time.Time `json:"saved_at"`
}

type TripRequest struct {
	InitialDestination string `json:"initial_destination"`
	FinalDestination   string `json:"final_destination"`
	StartDate          string `json:"start_date"`
	EndDate            string `json:"end_date"`
	NumTravelers       int    `json:"num_travelers"` // Changed from TravelType
	Mood               string `json:"mood"`
}

type SavedTripResponse struct {
	TripID      int       `json:"tripid"`
	TripDetails string    `json:"tripdetails"`
	SavedAt     time.Time `json:"saved_at"`
}

type TravelAgency struct {
	AgencyID  int       `json:"agency_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone,omitempty"`
	Website   string    `json:"website,omitempty"`
	Password  string    `json:"password,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type TravelPackage struct {
	PackageID          int       `json:"package_id"`
	AgencyID           int       `json:"agency_id"`
	AgencyName         string    `json:"agency_name"`
	AgencyEmail        string    `json:"agency_email"`
	AgencyPhone        string    `json:"agency_phone"`
	Title              string    `json:"title"`
	Description        string    `json:"description"`
	Location           string    `json:"location"`
	InitialDestination string    `json:"initial_destination"`
	DurationDays       int       `json:"duration_days"`
	NumTravelers       int       `json:"num_travelers"`
	TransportMode      string    `json:"transport_mode"`
	Price              float64   `json:"price"`
	IsActive           bool      `json:"is_active"`
	Locations          []string  `json:"locations"`
	Photos             []string  `json:"photos"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type Feedback struct {
	FeedbackID    int       `json:"feedback_id"`
	UserID        int       `json:"user_id"`
	Username      string    `json:"username"`
	FeedbackType  string    `json:"feedback_type"`           // "trip_plan" or "travel_agency"
	DistrictName  string    `json:"district_name,omitempty"` // For trip_plan feedback
	AgencyID      *int      `json:"agency_id,omitempty"`
	AgencyName    string    `json:"agency_name,omitempty"`
	FeedbackText  string    `json:"feedback_text"`
	Rating        int       `json:"rating"` // 0-5 stars
	HotelName     string    `json:"hotel_name,omitempty"`
	HotelFeedback string    `json:"hotel_feedback,omitempty"`
	HotelRating   *int      `json:"hotel_rating,omitempty"` // 0-5 stars
	CreatedAt     time.Time `json:"created_at"`
}
