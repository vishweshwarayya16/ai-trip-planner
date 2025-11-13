package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type WeatherResponse struct {
	City struct {
		Name    string `json:"name"`
		Country string `json:"country"`
	} `json:"city"`
	List []struct {
		Dt   int64 `json:"dt"`
		Main struct {
			Temp      float64 `json:"temp"`
			FeelsLike float64 `json:"feels_like"`
			TempMin   float64 `json:"temp_min"`
			TempMax   float64 `json:"temp_max"`
			Humidity  int     `json:"humidity"`
		} `json:"main"`
		Weather []struct {
			Main        string `json:"main"`
			Description string `json:"description"`
			Icon        string `json:"icon"`
		} `json:"weather"`
		Wind struct {
			Speed float64 `json:"speed"`
		} `json:"wind"`
		Pop float64 `json:"pop"` // Probability of precipitation
	} `json:"list"`
}

type WeatherData struct {
	City      string     `json:"city"`
	Country   string     `json:"country"`
	Forecasts []Forecast `json:"forecasts"`
	ErrorMsg  string     `json:"error_msg,omitempty"`
}

type Forecast struct {
	Date        string  `json:"date"`
	Temp        float64 `json:"temp"`
	FeelsLike   float64 `json:"feels_like"`
	TempMin     float64 `json:"temp_min"`
	TempMax     float64 `json:"temp_max"`
	Humidity    int     `json:"humidity"`
	Description string  `json:"description"`
	Icon        string  `json:"icon"`
	WindSpeed   float64 `json:"wind_speed"`
	RainChance  float64 `json:"rain_chance"`
}

func GetWeatherForecast(destination string) (WeatherData, error) {
	apiKey := os.Getenv("OPENWEATHER_API_KEY")
	if apiKey == "" {
		return WeatherData{ErrorMsg: "Weather API key not configured"}, fmt.Errorf("OPENWEATHER_API_KEY not set")
	}

	// API endpoint for 5-day forecast
	url := fmt.Sprintf("https://api.openweathermap.org/data/2.5/forecast?q=%s&appid=%s&units=metric", destination, apiKey)

	resp, err := http.Get(url)
	if err != nil {
		return WeatherData{ErrorMsg: "Failed to fetch weather data"}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return WeatherData{ErrorMsg: "Failed to read weather data"}, err
	}

	if resp.StatusCode != http.StatusOK {
		return WeatherData{ErrorMsg: "Weather data not available for this location"}, fmt.Errorf("weather API error: %s", string(body))
	}

	var weatherResp WeatherResponse
	if err := json.Unmarshal(body, &weatherResp); err != nil {
		return WeatherData{ErrorMsg: "Failed to parse weather data"}, err
	}

	// Process forecasts - group by day and take midday forecast
	weatherData := WeatherData{
		City:      weatherResp.City.Name,
		Country:   weatherResp.City.Country,
		Forecasts: []Forecast{},
	}

	processedDates := make(map[string]bool)

	for _, item := range weatherResp.List {
		date := time.Unix(item.Dt, 0).Format("2006-01-02")
		hour := time.Unix(item.Dt, 0).Hour()

		// Take forecast around noon (12:00) for each day
		if hour >= 11 && hour <= 14 && !processedDates[date] {
			forecast := Forecast{
				Date:        date,
				Temp:        item.Main.Temp,
				FeelsLike:   item.Main.FeelsLike,
				TempMin:     item.Main.TempMin,
				TempMax:     item.Main.TempMax,
				Humidity:    item.Main.Humidity,
				Description: item.Weather[0].Description,
				Icon:        item.Weather[0].Icon,
				WindSpeed:   item.Wind.Speed,
				RainChance:  item.Pop * 100, // Convert to percentage
			}
			weatherData.Forecasts = append(weatherData.Forecasts, forecast)
			processedDates[date] = true
		}
	}

	return weatherData, nil
}

func FormatWeatherForTrip(destination string) string {
	weather, err := GetWeatherForecast(destination)
	if err != nil {
		return fmt.Sprintf("\n⚠️ Weather information not available for %s\n", destination)
	}

	if weather.ErrorMsg != "" {
		return fmt.Sprintf("\n⚠️ %s\n", weather.ErrorMsg)
	}

	weatherInfo := fmt.Sprintf("\n🌤️ **Weather Forecast for %s, %s**\n\n", weather.City, weather.Country)

	for _, forecast := range weather.Forecasts {
		weatherInfo += fmt.Sprintf("**%s:**\n", forecast.Date)
		weatherInfo += fmt.Sprintf("- Temperature: %.1f°C (Feels like: %.1f°C)\n", forecast.Temp, forecast.FeelsLike)
		weatherInfo += fmt.Sprintf("- High/Low: %.1f°C / %.1f°C\n", forecast.TempMax, forecast.TempMin)
		weatherInfo += fmt.Sprintf("- Condition: %s\n", forecast.Description)
		weatherInfo += fmt.Sprintf("- Humidity: %d%%\n", forecast.Humidity)
		weatherInfo += fmt.Sprintf("- Wind Speed: %.1f m/s\n", forecast.WindSpeed)
		weatherInfo += fmt.Sprintf("- Rain Chance: %.0f%%\n\n", forecast.RainChance)
	}

	weatherInfo += "💡 **Weather Tips:**\n"
	weatherInfo += "- Check weather updates closer to your travel dates\n"
	weatherInfo += "- Pack accordingly based on the forecast\n"
	weatherInfo += "- Consider weather when planning outdoor activities\n\n"

	return weatherInfo
}
