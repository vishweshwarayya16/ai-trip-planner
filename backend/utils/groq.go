package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
	"trip-planner-backend/models"
)

type GroqRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GroqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func GenerateTripWithGroq(tripReq models.TripRequest) (string, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY not set")
	}

	// Calculate trip duration
	startDate, _ := time.Parse("2006-01-02", tripReq.StartDate)
	endDate, _ := time.Parse("2006-01-02", tripReq.EndDate)
	duration := int(endDate.Sub(startDate).Hours()/24) + 1

	// Format dates
	startDateFormatted := startDate.Format("January 2, 2006")
	endDateFormatted := endDate.Format("January 2, 2006")

	// Determine companions description
	companions := ""
	if tripReq.NumTravelers == 1 {
		companions = "solo"
	} else if tripReq.NumTravelers == 2 {
		companions = "couple"
	} else if tripReq.NumTravelers <= 5 {
		companions = fmt.Sprintf("group of %d", tripReq.NumTravelers)
	} else {
		companions = fmt.Sprintf("large group of %d", tripReq.NumTravelers)
	}

	// Map mood to activities
	activities := ""
	switch tripReq.Mood {
	case "cultural":
		activities = "cultural exploration, museums, temples, local traditions, art galleries"
	case "natural_beauty":
		activities = "nature exploration, scenic viewpoints, parks, gardens, natural landscapes"
	case "historical":
		activities = "historical monuments, heritage sites, forts, palaces, ancient architecture"
	case "adventure":
		activities = "adventure activities, trekking, outdoor sports, thrilling experiences"
	case "relaxation":
		activities = "relaxation, spa, peaceful locations, wellness, serene environments"
	default:
		activities = "diverse tourist attractions and local experiences"
	}

	// Get distance info (no cost details passed to AI)
	travelInfo := FormatTravelCostsForTripINR(tripReq.InitialDestination, tripReq.FinalDestination, tripReq.NumTravelers)

	// Get weather info
	weatherInfo := FormatWeatherForTrip(tripReq.FinalDestination)

	prompt := fmt.Sprintf(`Create a personalized %d-day trip itinerary for %s from %s to %s.
This is for a %s trip focusing on these activities: %s.

TRAVEL INFORMATION:
%s

IMPORTANT: DO NOT include any cost estimates, budget breakdowns, or accommodation prices in your response. Only provide the itinerary, attractions, and restaurant recommendations.

Please include:
1. A brief introduction to %s highlighting why it's perfect for this type of trip
2. **TOP 5 MUST-VISIT PLACES** section (REQUIRED - place this right after the introduction)
3. A day-by-day itinerary with clear Morning, Afternoon, and Evening sections for each day
4. At least 5-7 specific attraction recommendations (within 100km of %s) with brief descriptions
5. 3-5 restaurant recommendations with specific dishes (DO NOT include prices)
6. 2-3 insider tips that most tourists might not know about

IMPORTANT STRUCTURE:

## 🌟 Top 5 Must-Visit Places

RIGHT AFTER the introduction, include this section with EXACTLY this format:
[MUSTVISIT]
1. **Place Name** - One line description of why it's unmissable
2. **Place Name** - One line description of why it's unmissable
3. **Place Name** - One line description of why it's unmissable
4. **Place Name** - One line description of why it's unmissable
5. **Place Name** - One line description of why it's unmissable
[/MUSTVISIT]

---

Day 1 should be: Journey from %s to %s
- Include travel details and arrival
- Hotel check-in
- Light evening activities

Days 2 to %d should be: Exploration days
Each day must have:
- **Best place for Breakfast:** (restaurant name, famous dishes - NO PRICES)
- **Morning Activities:** (specific attraction with what it's famous for and what you can do)
- **Best place for Lunch:** (restaurant name, famous dishes - NO PRICES)
- **Afternoon Activities:** (another attraction)
- **Best place for Dinner:** (restaurant name, famous dishes - NO PRICES)

Day %d should be: Return journey from %s back to %s
- Breakfast recommendation
- Checkout and departure
- Return travel details

Format the response with clear markdown formatting:
- Use # for main title (Trip to %s)
- Use ## for day headers (Day 1: Journey to %s, Day 2: Explore [Location], etc.)
- Use ### for section headers (Morning, Afternoon, Evening)
- Use **bold** for restaurant names, attraction names, and important information
- Use bullet points (- ) for lists
- Use --- for section dividers
- Prefix insider tips with "**Insider Tip:**"

DO NOT INCLUDE:
- Any prices or costs
- Budget breakdowns
- Accommodation costs
- Transportation costs
- Entry fees

IMPORTANT: 
- Make the content detailed and specific to %s
- Use real restaurant names in %s
- Attractions should be within 100km of %s
- Each exploration day must have breakfast, lunch, and dinner recommendations (NO PRICES)
- Day 1 is arrival/journey, last day is departure/return
- DO NOT use HTML tags, use markdown formatting only
- Use ** for bold, # for headers, - for bullets

This is a %d-day itinerary focused on %s for %d travelers.`,
		duration,
		tripReq.FinalDestination,
		startDateFormatted,
		endDateFormatted,
		companions,
		activities,
		travelInfo,
		tripReq.FinalDestination,
		tripReq.FinalDestination,
		tripReq.InitialDestination,
		tripReq.FinalDestination,
		duration-1,
		duration,
		tripReq.FinalDestination,
		tripReq.InitialDestination,
		tripReq.FinalDestination,
		tripReq.FinalDestination,
		tripReq.FinalDestination,
		tripReq.FinalDestination,
		tripReq.FinalDestination,
		duration,
		activities,
		tripReq.NumTravelers,
	)

	groqReq := GroqRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []Message{
			{
				Role: "system",
				Content: fmt.Sprintf(`You are a professional Indian travel planner. Create detailed itineraries using markdown formatting (NO HTML tags).
- Use real restaurant names in %s with specific dishes
- Attractions within 100km of %s
- Focus on %s activities
- Day 1 is journey/arrival day with travel details
- Middle days are full exploration with morning/afternoon/evening structure
- Each exploration day MUST have specific breakfast, lunch, dinner places (NO PRICES)
- Last day is return journey with breakfast and departure
- Use markdown formatting: # for titles, ## for day headers, ### for subsections, ** for bold, - for bullets
- DO NOT include any prices, costs, budget information, or accommodation costs
- DO NOT use HTML tags
- mention entry fees or ticket prices`, tripReq.FinalDestination, tripReq.FinalDestination, activities),
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(groqReq)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("groq API error: %s", string(body))
	}

	var groqResp GroqResponse
	if err := json.Unmarshal(body, &groqResp); err != nil {
		return "", err
	}

	if len(groqResp.Choices) == 0 {
		return "", fmt.Errorf("no response from Groq API")
	}

	// Get the trip content WITHOUT expenses
	tripContent := groqResp.Choices[0].Message.Content

	// Now ADD the manual travel expense calculation
	costs, _ := CalculateTravelCosts(tripReq.InitialDestination, tripReq.FinalDestination, tripReq.NumTravelers)

	travelExpenseSection := fmt.Sprintf(`

---

## Travel Expenses

**Route:** %s → %s | **Distance:** %.2f km | **Travelers:** %d

| Transport | Duration | Cost/Person (₹) | Total Cost (₹) |
|-----------|----------|-----------------|----------------|
| 🚗 Car    | %s       | %.0f            | %.0f           |
| 🚌 Bus    | %s       | %.0f            | %.0f           |
| 🚆 Train  | %s       | %.0f            | %.0f           |

**💡 Recommendation:** Train offers the best balance of cost and comfort for this journey.

---

## Weather Information

%s

**Packing Recommendations:**
Based on the weather forecast above, make sure to pack appropriate clothing and gear. Check the weather closer to your travel dates for the most accurate information.
`,
		tripReq.InitialDestination,
		tripReq.FinalDestination,
		costs.Distance,
		tripReq.NumTravelers,
		costs.CarDuration,
		costs.CarCost/float64(tripReq.NumTravelers),
		costs.CarCost,
		costs.BusDuration,
		costs.BusCost/float64(tripReq.NumTravelers),
		costs.BusCost,
		costs.TrainDuration,
		costs.TrainCost/float64(tripReq.NumTravelers),
		costs.TrainCost,
		weatherInfo,
	)

	// Append manual calculations to the AI-generated content
	tripContent += travelExpenseSection

	return tripContent, nil
}
