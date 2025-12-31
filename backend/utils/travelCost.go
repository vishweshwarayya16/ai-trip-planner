package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
)

type LocationCoordinates struct {
	Lat float64
	Lon float64
}

type TravelCostCalculation struct {
	Distance      float64 `json:"distance"`
	BusCost       float64 `json:"bus_cost"`
	TrainCost     float64 `json:"train_cost"`
	CarCost       float64 `json:"car_cost"`
	BusDuration   string  `json:"bus_duration"`
	TrainDuration string  `json:"train_duration"`
	CarDuration   string  `json:"car_duration"`
}

// District coordinates (longitude, latitude) for Karnataka districts
var districtCoordinates = map[string][]float64{
	"Bagalkot":                {75.6615, 16.1691},
	"Ballari (Bellary)":       {76.9214, 15.1394},
	"Belagavi (Belgaum)":      {74.4977, 15.8497},
	"Bengaluru Rural":         {77.3910, 13.2257},
	"Bengaluru Urban":         {77.5946, 12.9716},
	"Bidar":                   {77.5199, 17.9104},
	"Chamarajanagar":          {76.9398, 11.9261},
	"Chikkaballapur":          {77.7278, 13.4355},
	"Chikkamagaluru":          {75.7747, 13.3161},
	"Chitradurga":             {76.3980, 14.2251},
	"Dakshina Kannada":        {74.8560, 12.9141},
	"Davanagere":              {75.9218, 14.4644},
	"Dharwad":                 {75.0078, 15.4589},
	"Gadag":                   {75.6290, 15.4166},
	"Hassan":                  {76.0996, 13.0068},
	"Haveri":                  {75.3990, 14.7951},
	"Kalaburagi (Gulbarga)":   {76.8343, 17.3297},
	"Kodagu (Coorg)":          {75.7382, 12.4244},
	"Kolar":                   {78.1290, 13.1360},
	"Koppal":                  {76.1548, 15.3550},
	"Mandya":                  {76.8958, 12.5218},
	"Mysuru (Mysore)":         {76.6394, 12.2958},
	"Raichur":                 {77.3566, 16.2120},
	"Ramanagara":              {77.2826, 12.7159},
	"Shivamogga (Shimoga)":    {75.5681, 13.9299},
	"Tumakuru (Tumkur)":       {77.1010, 13.3379},
	"Udupi":                   {74.7421, 13.3409},
	"Uttara Kannada (Karwar)": {74.1240, 14.8182},
	"Vijayapura (Bijapur)":    {75.7100, 16.8302},
	"Yadgir":                  {77.1383, 16.7700},
	"Vijayanagara":            {76.4700, 15.3350},
}

// OpenRouteService response structure
type OpenRouteResponse struct {
	Routes []struct {
		Summary struct {
			Distance float64 `json:"distance"`
			Duration float64 `json:"duration"`
		} `json:"summary"`
	} `json:"routes"`
}

// Get driving distance using OpenRouteService API
func getOpenRouteDistance(fromCoords, toCoords []float64) (float64, float64, error) {
	apiKey := os.Getenv("OPENROUTE_API_KEY")
	if apiKey == "" {
		return 0, 0, fmt.Errorf("OPENROUTE_API_KEY not set")
	}

	requestBody := map[string]interface{}{
		"coordinates": [][]float64{
			{fromCoords[0], fromCoords[1]},
			{toCoords[0], toCoords[1]},
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return 0, 0, err
	}

	req, err := http.NewRequest("POST", "https://api.openrouteservice.org/v2/directions/driving-car", bytes.NewBuffer(jsonData))
	if err != nil {
		return 0, 0, err
	}

	req.Header.Set("Authorization", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0, 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, 0, err
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("OpenRouteService error: %s", string(body))
		return 0, 0, fmt.Errorf("OpenRouteService API error: %d", resp.StatusCode)
	}

	var orsResp OpenRouteResponse
	if err := json.Unmarshal(body, &orsResp); err != nil {
		return 0, 0, err
	}

	if len(orsResp.Routes) == 0 {
		return 0, 0, fmt.Errorf("no route found")
	}

	distanceKm := orsResp.Routes[0].Summary.Distance / 1000
	durationHours := orsResp.Routes[0].Summary.Duration / 3600

	return distanceKm, durationHours, nil
}

// Calculate travel costs using OpenRouteService for distance
func CalculateTravelCosts(from, to string, numTravelers int) (TravelCostCalculation, error) {
	// Get coordinates from our predefined map
	fromCoords, fromExists := districtCoordinates[from]
	toCoords, toExists := districtCoordinates[to]

	if !fromExists || !toExists {
		log.Printf("Coordinates not found for: %s or %s", from, to)
		// Return default values if coordinates not found
		return TravelCostCalculation{
			Distance:      500.0,
			BusCost:       750.0 * float64(numTravelers),
			TrainCost:     350.0 * float64(numTravelers),
			CarCost:       4583.33,
			BusDuration:   "8-10 hours",
			TrainDuration: "6-8 hours",
			CarDuration:   "7-9 hours",
		}, nil
	}

	// Get actual driving distance from OpenRouteService
	distance, durationHours, err := getOpenRouteDistance(fromCoords, toCoords)
	if err != nil {
		log.Printf("OpenRouteService error: %v, falling back to estimation", err)
		// Fallback: estimate distance based on coordinates (straight line * 1.3 for road factor)
		distance = calculateHaversineDistance(fromCoords[1], fromCoords[0], toCoords[1], toCoords[0]) * 1.3
		durationHours = distance / 60 // Assume 60 km/h average
	}

	// YOUR FORMULAS:
	// BUS: distance * 1.5 (per person)
	busCostPerPerson := distance * 1.5
	busTotalCost := busCostPerPerson * float64(numTravelers)

	// TRAIN: distance * 0.7 (per person)
	trainCostPerPerson := distance * 0.7
	trainTotalCost := trainCostPerPerson * float64(numTravelers)

	// CAR: (distance / 12) * 110 (total for group)
	carTotalCost := (distance / 12) * 110

	// Calculate durations based on actual driving time from API (or estimate)
	carDuration := formatDuration(durationHours)
	busDuration := formatDuration(durationHours * 1.2)   // Bus is ~20% slower than car
	trainDuration := formatDuration(durationHours * 0.9) // Train is ~10% faster than car

	return TravelCostCalculation{
		Distance:      math.Round(distance*10) / 10, // Round to 1 decimal
		BusCost:       math.Round(busTotalCost*100) / 100,
		TrainCost:     math.Round(trainTotalCost*100) / 100,
		CarCost:       math.Round(carTotalCost*100) / 100,
		BusDuration:   busDuration,
		TrainDuration: trainDuration,
		CarDuration:   carDuration,
	}, nil
}

// Calculate Haversine distance (straight line) as fallback
func calculateHaversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371 // km

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLon/2)*math.Sin(deltaLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

// Format duration in hours to readable string
func formatDuration(hours float64) string {
	if hours < 1 {
		return fmt.Sprintf("%.0f mins", hours*60)
	}
	h := int(hours)
	m := int((hours - float64(h)) * 60)
	if m > 0 {
		return fmt.Sprintf("%dh %dm", h, m)
	}
	return fmt.Sprintf("%dh", h)
}

// Format travel costs for trip plan (no expenses in main plan)
func FormatTravelCostsForTripINR(from, to string, numTravelers int) string {
	costs, err := CalculateTravelCosts(from, to, numTravelers)
	if err != nil {
		return ""
	}

	// Return formatted string with distance info only (no costs shown to Groq)
	return fmt.Sprintf(`Distance between %s and %s: %.2f km`, from, to, costs.Distance)
}
