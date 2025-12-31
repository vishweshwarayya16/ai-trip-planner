package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
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
	router.HandleFunc("/api/send-registration-otp", handlers.SendRegistrationOTP).Methods("POST")
	router.HandleFunc("/api/verify-registration-otp", handlers.VerifyRegistrationOTP).Methods("POST")
	router.HandleFunc("/api/register", handlers.Register).Methods("POST")
	router.HandleFunc("/api/login", handlers.Login).Methods("POST")
	router.HandleFunc("/api/admin-login", handlers.AdminLogin).Methods("POST")
	router.HandleFunc("/api/agency/send-registration-otp", handlers.SendAgencyRegistrationOTP).Methods("POST")
	router.HandleFunc("/api/agency/verify-registration-otp", handlers.VerifyAgencyRegistrationOTP).Methods("POST")
	router.HandleFunc("/api/agency/register", handlers.AgencyRegister).Methods("POST")
	router.HandleFunc("/api/agency/login", handlers.AgencyLogin).Methods("POST")
	router.HandleFunc("/api/forgot-password", handlers.ForgotPassword).Methods("POST")
	router.HandleFunc("/api/verify-reset-code", handlers.VerifyResetCode).Methods("POST")
	router.HandleFunc("/api/reset-password", handlers.ResetPassword).Methods("POST")
	router.HandleFunc("/api/weather/{destination}", handlers.GetWeather).Methods("GET")
	router.HandleFunc("/api/contact", handlers.SaveContactMessage).Methods("POST")
	router.HandleFunc("/uploads/packages/{filename}", func(w http.ResponseWriter, r *http.Request) {
		filename := mux.Vars(r)["filename"]
		filePath := filepath.Join("uploads", "packages", filename)
		http.ServeFile(w, r, filePath)
	}).Methods("GET")
	router.HandleFunc("/uploads/districts/{folder}/{filename}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		folder := vars["folder"]
		filename := vars["filename"]
		filePath := filepath.Join("uploads", "districts", folder, filename)
		http.ServeFile(w, r, filePath)
	}).Methods("GET")
	router.HandleFunc("/api/district-photos/{district}", handlers.GetDistrictPhotos).Methods("GET")
	router.HandleFunc("/api/packages", handlers.GetPublicTravelPackages).Methods("GET")
	router.HandleFunc("/api/agencies", handlers.GetAllAgencies).Methods("GET")
	router.HandleFunc("/api/feedbacks/district", handlers.GetFeedbacksByDistrict).Methods("GET")
	router.HandleFunc("/api/feedbacks/agency", handlers.GetPublicAgencyFeedbacks).Methods("GET")

	// Protected user routes
	protected := router.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)
	protected.Use(middleware.RequireRole("user"))
	protected.HandleFunc("/user", handlers.GetUser).Methods("GET")
	protected.HandleFunc("/generate-trip", handlers.GenerateTrip).Methods("POST")
	protected.HandleFunc("/saved-trips", handlers.GetSavedTrips).Methods("GET")
	protected.HandleFunc("/save-trip", handlers.SaveTrip).Methods("POST")
	protected.HandleFunc("/saved-trips/{tripid}", handlers.DeleteSavedTrip).Methods("DELETE")
	protected.HandleFunc("/feedback", handlers.SubmitFeedback).Methods("POST")
	protected.HandleFunc("/feedbacks", handlers.GetUserFeedbacks).Methods("GET")
	protected.HandleFunc("/feedback", handlers.DeleteFeedback).Methods("DELETE")

	// Admin routes (protected)
	admin := router.PathPrefix("/api/admin").Subrouter()
	admin.Use(middleware.AuthMiddleware)
	admin.Use(middleware.RequireRole("admin"))
	admin.HandleFunc("/users", handlers.GetAllUsers).Methods("GET")
	admin.HandleFunc("/users", handlers.AdminCreateUser).Methods("POST")
	admin.HandleFunc("/users/{userid}", handlers.AdminUpdateUser).Methods("PUT")
	admin.HandleFunc("/users/{userid}", handlers.AdminDeleteUser).Methods("DELETE")
	admin.HandleFunc("/messages", handlers.GetAllContactMessages).Methods("GET")
	admin.HandleFunc("/messages/{id}/reply", handlers.ReplyToContactMessage).Methods("POST")
	admin.HandleFunc("/feedbacks", handlers.GetAllFeedbacks).Methods("GET")
	admin.HandleFunc("/agencies", handlers.GetAllAgenciesAdmin).Methods("GET")
	admin.HandleFunc("/agencies", handlers.AdminCreateAgency).Methods("POST")
	admin.HandleFunc("/agencies/{agencyid}", handlers.AdminUpdateAgency).Methods("PUT")
	admin.HandleFunc("/agencies/{agencyid}", handlers.AdminDeleteAgency).Methods("DELETE")
	admin.HandleFunc("/agencies/{agencyid}/packages", handlers.GetAgencyPackagesAdmin).Methods("GET")

	// Agency routes (protected)
	agency := router.PathPrefix("/api/agency").Subrouter()
	agency.Use(middleware.AuthMiddleware)
	agency.Use(middleware.RequireRole("agency"))
	agency.HandleFunc("/packages", handlers.GetAgencyPackages).Methods("GET")
	agency.HandleFunc("/packages", handlers.CreateTravelPackage).Methods("POST")
	agency.HandleFunc("/packages/{packageid}", handlers.UpdateTravelPackage).Methods("PUT")
	agency.HandleFunc("/packages/{packageid}", handlers.DeleteTravelPackage).Methods("DELETE")
	agency.HandleFunc("/feedbacks", handlers.GetAgencyFeedbacks).Methods("GET")

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("Server starting on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
