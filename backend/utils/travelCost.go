package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
)

type TravelCost struct {
	Transportation string  `json:"transportation"`
	EstimatedCost  float64 `json:"estimated_cost"`
	Currency       string  `json:"currency"`
	Duration       string  `json:"duration"`
	Details        string  `json:"details"`
}

type LocationCoordinates struct {
	Lat float64
	Lon float64
}

// Get coordinates for a location using Nominatim
func getCoordinates(location string) (LocationCoordinates, error) {
	url := fmt.Sprintf("https://nominatim.openstreetmap.org/search?q=%s&format=json&limit=1", location)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return LocationCoordinates{}, err
	}
	req.Header.Set("User-Agent", "TripPlannerApp/1.0")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return LocationCoordinates{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return LocationCoordinates{}, err
	}

	var results []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}

	if err := json.Unmarshal(body, &results); err != nil {
		return LocationCoordinates{}, err
	}

	if len(results) == 0 {
		return LocationCoordinates{}, fmt.Errorf("location not found")
	}

	var coords LocationCoordinates
	fmt.Sscanf(results[0].Lat, "%f", &coords.Lat)
	fmt.Sscanf(results[0].Lon, "%f", &coords.Lon)

	return coords, nil
}

// Calculate distance between two coordinates (Haversine formula)
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
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

// Estimate travel costs based on distance
func EstimateTravelCost(from, to string, numTravelers int) []TravelCost {
	// Get coordinates
	fromCoords, err1 := getCoordinates(from)
	toCoords, err2 := getCoordinates(to)

	if err1 != nil || err2 != nil {
		return getDefaultCosts(numTravelers)
	}

	// Calculate distance
	distance := calculateDistance(fromCoords.Lat, fromCoords.Lon, toCoords.Lat, toCoords.Lon)

	costs := []TravelCost{}

	// Flight estimation (for distances > 300km)
	if distance > 300 {
		flightCostPerPerson := estimateFlightCost(distance)
		flightDuration := estimateFlightDuration(distance)
		costs = append(costs, TravelCost{
			Transportation: "Flight",
			EstimatedCost:  flightCostPerPerson * float64(numTravelers),
			Currency:       "USD",
			Duration:       flightDuration,
			Details:        fmt.Sprintf("$%.2f per person × %d travelers", flightCostPerPerson, numTravelers),
		})
	}

	// Train estimation
	trainCostPerPerson := estimateTrainCost(distance)
	trainDuration := estimateTrainDuration(distance)
	costs = append(costs, TravelCost{
		Transportation: "Train",
		EstimatedCost:  trainCostPerPerson * float64(numTravelers),
		Currency:       "USD",
		Duration:       trainDuration,
		Details:        fmt.Sprintf("$%.2f per person × %d travelers", trainCostPerPerson, numTravelers),
	})

	// Bus estimation
	busCostPerPerson := estimateBusCost(distance)
	busDuration := estimateBusDuration(distance)
	costs = append(costs, TravelCost{
		Transportation: "Bus",
		EstimatedCost:  busCostPerPerson * float64(numTravelers),
		Currency:       "USD",
		Duration:       busDuration,
		Details:        fmt.Sprintf("$%.2f per person × %d travelers", busCostPerPerson, numTravelers),
	})

	// Car/Taxi estimation (for shorter distances)
	if distance < 500 {
		carCost := estimateCarCost(distance)
		carDuration := estimateCarDuration(distance)
		costs = append(costs, TravelCost{
			Transportation: "Car/Taxi",
			EstimatedCost:  carCost,
			Currency:       "USD",
			Duration:       carDuration,
			Details:        fmt.Sprintf("Shared cost for group of %d", numTravelers),
		})
	}

	return costs
}

func estimateFlightCost(distance float64) float64 {
	// Basic flight cost estimation
	baseCost := 100.0
	perKmCost := 0.15
	return baseCost + (distance * perKmCost)
}

func estimateTrainCost(distance float64) float64 {
	baseCost := 30.0
	perKmCost := 0.10
	return baseCost + (distance * perKmCost)
}

func estimateBusCost(distance float64) float64 {
	baseCost := 20.0
	perKmCost := 0.06
	return baseCost + (distance * perKmCost)
}

func estimateCarCost(distance float64) float64 {
	// Fuel + tolls + parking
	perKmCost := 0.40
	return distance * perKmCost
}

func estimateFlightDuration(distance float64) string {
	avgSpeed := 800.0 // km/h
	hours := distance / avgSpeed
	if hours < 1 {
		return fmt.Sprintf("%.0f minutes", hours*60)
	}
	return fmt.Sprintf("%.1f hours", hours)
}

func estimateTrainDuration(distance float64) string {
	avgSpeed := 120.0 // km/h
	hours := distance / avgSpeed
	if hours < 1 {
		return fmt.Sprintf("%.0f minutes", hours*60)
	}
	return fmt.Sprintf("%.1f hours", hours)
}

func estimateBusDuration(distance float64) string {
	avgSpeed := 80.0 // km/h
	hours := distance / avgSpeed
	if hours < 1 {
		return fmt.Sprintf("%.0f minutes", hours*60)
	}
	return fmt.Sprintf("%.1f hours", hours)
}

func estimateCarDuration(distance float64) string {
	avgSpeed := 90.0 // km/h
	hours := distance / avgSpeed
	if hours < 1 {
		return fmt.Sprintf("%.0f minutes", hours*60)
	}
	return fmt.Sprintf("%.1f hours", hours)
}

func getDefaultCosts(numTravelers int) []TravelCost {
	return []TravelCost{
		{
			Transportation: "Flight",
			EstimatedCost:  300.0 * float64(numTravelers),
			Currency:       "USD",
			Duration:       "2-4 hours",
			Details:        fmt.Sprintf("Average estimate for %d travelers", numTravelers),
		},
		{
			Transportation: "Train",
			EstimatedCost:  150.0 * float64(numTravelers),
			Currency:       "USD",
			Duration:       "4-6 hours",
			Details:        fmt.Sprintf("Average estimate for %d travelers", numTravelers),
		},
		{
			Transportation: "Bus",
			EstimatedCost:  80.0 * float64(numTravelers),
			Currency:       "USD",
			Duration:       "6-8 hours",
			Details:        fmt.Sprintf("Average estimate for %d travelers", numTravelers),
		},
	}
}
func FormatTravelCostsForTripINR(from, to string, numTravelers int) string {
	// Get coordinates
	fromCoords, err1 := getCoordinates(from)
	toCoords, err2 := getCoordinates(to)

	if err1 != nil || err2 != nil {
		return getDefaultCostsINR(numTravelers)
	}

	// Calculate distance
	distance := calculateDistance(fromCoords.Lat, fromCoords.Lon, toCoords.Lat, toCoords.Lon)

	costsINR := ""

	// Convert USD to INR (approximate rate: 1 USD = 83 INR)
	exchangeRate := 83.0

	// Flight estimation (for distances > 300km)
	if distance > 300 {
		flightCostPerPerson := estimateFlightCost(distance) * exchangeRate
		flightDuration := estimateFlightDuration(distance)
		costsINR += fmt.Sprintf("**Flight:** ₹%.0f per person, Total: ₹%.0f for %d persons (Duration: %s)\n",
			flightCostPerPerson, flightCostPerPerson*float64(numTravelers), numTravelers, flightDuration)
	}

	// Train estimation
	trainCostPerPerson := estimateTrainCost(distance) * exchangeRate
	trainDuration := estimateTrainDuration(distance)
	costsINR += fmt.Sprintf("**Train:** ₹%.0f per person, Total: ₹%.0f for %d persons (Duration: %s)\n",
		trainCostPerPerson, trainCostPerPerson*float64(numTravelers), numTravelers, trainDuration)

	// Bus estimation
	busCostPerPerson := estimateBusCost(distance) * exchangeRate
	busDuration := estimateBusDuration(distance)
	costsINR += fmt.Sprintf("**Bus:** ₹%.0f per person, Total: ₹%.0f for %d persons (Duration: %s)\n",
		busCostPerPerson, busCostPerPerson*float64(numTravelers), numTravelers, busDuration)

	// Car/Taxi estimation
	if distance < 500 {
		carCost := estimateCarCost(distance) * exchangeRate
		carDuration := estimateCarDuration(distance)
		costsINR += fmt.Sprintf("**Car/Taxi:** ₹%.0f total for group of %d (Duration: %s)\n",
			carCost, numTravelers, carDuration)
	}

	return costsINR
}

func getDefaultCostsINR(numTravelers int) string {
	return fmt.Sprintf(`**Flight:** ₹15,000 per person, Total: ₹%.0f for %d persons
**Train:** ₹5,000 per person, Total: ₹%.0f for %d persons
**Bus:** ₹3,000 per person, Total: ₹%.0f for %d persons`,
		15000.0*float64(numTravelers), numTravelers,
		5000.0*float64(numTravelers), numTravelers,
		3000.0*float64(numTravelers), numTravelers)
}
