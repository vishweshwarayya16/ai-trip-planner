package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
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

	prompt := fmt.Sprintf(`
You are an expert travel planner specializing in creating personalized, realistic, and budget-friendly itineraries.

Generate a detailed travel plan based on the following details:

🏁 Initial Destination: %s
🎯 Final Destination: %s
📅 Travel Dates: %s → %s
🚗 Travel Type: %s
🎭 Mood / Interests: %s

---

### 🧳 Instructions
Create a detailed itinerary that includes:

1. **Day-wise Itinerary**
   - Clearly label each day (e.g., Day 1, Day 2, etc.).
   - Include main attractions, travel timing, and recommended activities.
   - Add brief descriptions or tips for each spot.

2. **Nearby Attractions**
   - Suggest 3–5 popular or hidden-gem attractions near the main destinations.
   - Include best time of day to visit each.

3. **Travel Durations**
   - Estimate travel time between destinations or major stops.

4. **Accommodation**
   - Recommend 2–3 hotels/lodges per city with approximate price ranges (budget, mid-range, luxury).

5. **Budget Summary**
   - Provide an estimated total budget (in INR) including accommodation, food, and transportation.

6. **Local Cuisine**
   - Recommend 3–5 must-try local dishes or restaurants.

7. **Best Time Tips**
   - Mention optimal visiting months, local climate conditions, or festivals.

8. **Transportation**
   - Suggest practical local transport options (e.g., metro, taxi, rental, bus, etc.).

---

### 📝 Output Format
Respond in **structured markdown** with clear headings and bullet points:

Example:
#### 🗓️ Day 1: Arrival and City Tour
- Morning: ...
- Afternoon: ...
- Evening: ...
---

Make sure the tone is friendly, informative, and easy to read. Keep details realistic and concise.
`,
		tripReq.InitialDestination,
		tripReq.FinalDestination,
		tripReq.StartDate,
		tripReq.EndDate,
		tripReq.TravelType,
		tripReq.Mood,
	)

	groqReq := GroqRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []Message{
			{
				Role:    "system",
				Content: "You are a professional travel planner. Create detailed, practical, and budget-conscious travel itineraries.",
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

	return groqResp.Choices[0].Message.Content, nil
}
