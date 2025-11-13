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

	// Get travel information with costs
	travelInfo := FormatTravelCostsForTripINR(tripReq.InitialDestination, tripReq.FinalDestination, tripReq.NumTravelers)

	// Get weather info (we'll add it after the itinerary)
	weatherInfo := FormatWeatherForTrip(tripReq.FinalDestination)

	prompt := fmt.Sprintf(`Create a personalized %d-day trip itinerary for %s from %s to %s.
This is for a %s trip focusing on these activities: %s.

TRAVEL INFORMATION:
%s

Please include:
1. A brief introduction to %s highlighting why it's perfect for this type of trip
2. A day-by-day itinerary with clear Morning, Afternoon, and Evening sections for each day
3. At least 5-7 specific attraction recommendations (within 100km of %s) with brief descriptions
4. 3-5 restaurant recommendations that match the traveler's interests with specific dishes
5. 2-3 insider tips that most tourists might not know about

IMPORTANT STRUCTURE:

Day 1 should be: Journey from %s to %s
- Include travel details and arrival
- Hotel check-in
- Light evening activities

Days 2 to %d should be: Exploration days
Each day must have:
- **Best place for Breakfast:** (restaurant name, famous dishes, cost)
- **Morning Activities:** (specific attraction with what it's famous for and what you can do)
- **Best place for Lunch:** (restaurant name, famous dishes, cost)
- **Afternoon Activities:** (another attraction)
- **Best place for Dinner:** (restaurant name, famous dishes, cost)
- **Day's estimated cost per person:** ₹[amount]

Day %d should be: Return journey from %s back to %s
- Breakfast recommendation
- Checkout and departure
- Return travel details

Format the response with clear markdown formatting:
- Use # for main title (Trip to %s)
- Use ## for day headers (Day 1: Journey to %s, Day 2: Explore [Location], etc.)
- Use ### for section headers (Morning, Afternoon, Evening, Travel Expenses, Accommodation, Budget)
- Use **bold** for restaurant names, costs, hotel names, and important information
- Use bullet points (- ) for lists
- Use --- for section dividers
- Prefix insider tips with "💡 **Insider Tip:**"
- Highlight all monetary amounts with **₹[amount]**

TRAVEL EXPENSES SECTION (After itinerary):
## 💰 Travel Expenses

### Transportation Options from %s to %s:

**🚌 Bus Transportation:**
- Cost per person: **₹[amount]**
- **Total cost for %d persons: ₹[total]**
- Duration: [X hours]
- Comfort level: Budget-friendly

**🚂 Train Transportation:**
- Cost per person: **₹[amount]**
- **Total cost for %d persons: ₹[total]**
- Duration: [X hours]
- Comfort level: Recommended for balance of cost and comfort

**🚗 Car/Taxi Transportation:**
- Total cost for group: **₹[amount]**
- **Cost split among %d persons: ₹[amount] per person**
- Duration: [X hours]
- Comfort level: Most convenient, door-to-door

**✈️ Flight Transportation (if available):**
- Cost per person: **₹[amount]**
- **Total cost for %d persons: ₹[total]**
- Duration: [X hours]
- Comfort level: Fastest option

**Recommended Transportation:** [Specify the best option]

---

ACCOMMODATION EXPENSES SECTION:
## 🏨 Accommodation Expenses

For **%d nights** stay in %s:

### 🌟 Luxury Hotels

**1. [Real luxury hotel name like Taj/Oberoi/ITC]**
- Location: [Specific area in %s]
- Cost per night: **₹[amount]**
- Total for %d nights: **₹[amount]**
- **Total cost for %d persons: ₹[amount]**
- Amenities: [List key amenities]
- Why stay here: [Brief description]

**2. [Another luxury hotel]**
[Same format]

### 🏨 Mid-Range Hotels

**1. [Real mid-range hotel like Lemon Tree/Treebo/FabHotels]**
- Location: [Area]
- Cost per night: **₹[amount]**
- Total for %d nights: **₹[amount]**
- **Total cost for %d persons: ₹[amount]**
- Amenities: [List]

**2. [Another mid-range hotel]**
[Same format]

### 💼 Budget-Friendly Hotels

**1. [Real budget hotel like OYO/Zostel/Backpacker hostels]**
- Location: [Area]
- Cost per night: **₹[amount]**
- Total for %d nights: **₹[amount]**
- **Total cost for %d persons: ₹[amount]**
- Amenities: [List]

**2. [Another budget hotel]**
[Same format]

---

COMPLETE BUDGET BREAKDOWN:
## 📊 Complete Trip Budget for %d Persons

### 🏷️ LUXURY PACKAGE
**Total Trip Cost: ₹[amount]**
**Per Person: ₹[amount]**

Breakdown:
- **Transportation:** ₹[amount]
- **Accommodation (%d nights):** ₹[amount]
- **Food & Dining:** ₹[amount] (₹[amount] per person per day × %d days)
- **Attractions & Entry Fees:** ₹[amount]
- **Local Transportation:** ₹[amount]
- **Miscellaneous (Shopping, etc):** ₹[amount]

Includes: Luxury hotels, premium dining, private transport, all activities

---

### 🏷️ MID-RANGE PACKAGE
**Total Trip Cost: ₹[amount]**
**Per Person: ₹[amount]**

Breakdown:
- **Transportation:** ₹[amount]
- **Accommodation (%d nights):** ₹[amount]
- **Food & Dining:** ₹[amount]
- **Attractions & Entry Fees:** ₹[amount]
- **Local Transportation:** ₹[amount]
- **Miscellaneous:** ₹[amount]

Includes: Comfortable hotels, good restaurants, recommended transport, most activities

---

### 🏷️ BUDGET-FRIENDLY PACKAGE
**Total Trip Cost: ₹[amount]**
**Per Person: ₹[amount]**

Breakdown:
- **Transportation:** ₹[amount]
- **Accommodation (%d nights):** ₹[amount]
- **Food & Dining:** ₹[amount]
- **Attractions & Entry Fees:** ₹[amount]
- **Local Transportation:** ₹[amount]
- **Miscellaneous:** ₹[amount]

Includes: Budget hotels, local eateries, public transport, essential activities

---

## 💡 Money-Saving Tips
- Book transportation and accommodation at least 15-30 days in advance
- Travel during off-peak season for better rates
- Use public transport for local travel
- Eat at local restaurants instead of tourist spots
- Look for combo tickets for multiple attractions
- Bargain at local markets
- Carry reusable water bottle

---

## 📝 Important Notes
- All prices are approximate and in Indian Rupees (₹)
- Prices may vary based on season, availability, and booking time
- Keep 10-15%% extra budget for emergencies and unexpected expenses
- Check attraction timings and closed days before visiting
- Book popular attractions in advance during peak season
- Carry valid ID proofs and necessary documents

IMPORTANT: 
- Make the content detailed and specific to %s
- Use real hotel names and restaurant names in %s
- Attractions should be within 100km of %s
- Each exploration day must have breakfast, lunch, and dinner recommendations
- Day 1 is arrival/journey, last day is departure/return
- Include realistic prices for Indian destinations
- Match the travel preferences: %s
- DO NOT use HTML tags, use markdown formatting only
- Use ** for bold, # for headers, - for bullets
- Make sure all costs are clearly highlighted with **₹[amount]**

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
		tripReq.InitialDestination,
		tripReq.FinalDestination,
		tripReq.NumTravelers,
		tripReq.NumTravelers,
		tripReq.NumTravelers,
		tripReq.NumTravelers,
		duration-1,
		tripReq.FinalDestination,
		tripReq.FinalDestination,
		duration-1,
		tripReq.NumTravelers,
		duration-1,
		tripReq.NumTravelers,
		duration-1,
		tripReq.NumTravelers,
		tripReq.NumTravelers,
		duration-1,
		duration,
		duration-1,
		duration,
		duration-1,
		tripReq.FinalDestination,
		tripReq.FinalDestination,
		tripReq.FinalDestination,
		activities,
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
- Use real Indian hotel names: Taj, Oberoi, ITC, Leela for luxury; Lemon Tree, Treebo, FabHotels for mid-range; OYO, Zostel for budget
- Use real restaurant names in %s with specific dishes
- All prices in Indian Rupees (₹)
- Attractions within 100km of %s
- Focus on %s activities
- Day 1 is journey/arrival day with travel details
- Middle days are full exploration with morning/afternoon/evening structure
- Each exploration day MUST have specific breakfast, lunch, dinner places with restaurant names and costs
- Last day is return journey with breakfast and departure
- Include realistic Indian pricing
- Use markdown formatting: # for titles, ## for day headers, ### for subsections, ** for bold, - for bullets
- DO NOT use HTML tags like <h1>, <p>, <div>, <strong> etc.
- Use only plain text with markdown symbols
- Highlight all costs with **₹[amount]**`, tripReq.FinalDestination, tripReq.FinalDestination, activities),
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

	// Get the trip content
	tripContent := groqResp.Choices[0].Message.Content

	// Append weather information at the end
	tripContent += fmt.Sprintf(`

---

## 🌤️ Weather Information

%s

**Packing Recommendations:**
Based on the weather forecast above, make sure to pack appropriate clothing and gear. Check the weather closer to your travel dates for the most accurate information.
`, weatherInfo)

	return tripContent, nil
}
