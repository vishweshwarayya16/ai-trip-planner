package main

import (
	"log"
	"net/http"
	"os"
	"trip-planner-backend/config"
	"trip-planner-backend/handlers"
	"trip-planner-backend/middleware"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	config.InitDB()
	defer config.CloseDB()

	router := mux.NewRouter()

	// Public routes
	router.HandleFunc("/api/register", handlers.Register).Methods("POST")
	router.HandleFunc("/api/login", handlers.Login).Methods("POST")
	router.HandleFunc("/api/forgot-password", handlers.ForgotPassword).Methods("POST")
	router.HandleFunc("/api/verify-reset-code", handlers.VerifyResetCode).Methods("POST")
	router.HandleFunc("/api/reset-password", handlers.ResetPassword).Methods("POST")

	// Protected routes
	protected := router.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)
	protected.HandleFunc("/user", handlers.GetUser).Methods("GET")
	protected.HandleFunc("/generate-trip", handlers.GenerateTrip).Methods("POST")
	protected.HandleFunc("/saved-trips", handlers.GetSavedTrips).Methods("GET")
	protected.HandleFunc("/save-trip", handlers.SaveTrip).Methods("POST")
	protected.HandleFunc("/saved-trips/{tripid}", handlers.DeleteSavedTrip).Methods("DELETE")

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
