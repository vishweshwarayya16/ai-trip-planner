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
