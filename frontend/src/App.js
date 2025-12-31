import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './components/Home';
import About from './components/About';
import Contact from './components/Contact';
import Login from './components/Login';
import Register from './components/Register';
import AdminLogin from './components/AdminLogin';
import AgencyLogin from './components/AgencyLogin';
import AgencyRegister from './components/AgencyRegister';
import GenerateTrip from './components/GenerateTrip';
import SavedTrips from './components/SavedTrips';
import ResetPassword from './components/ResetPassword';
import UserManagement from './components/UserManagement';
import MessageManagement from './components/MessageManagement';
import AgencyManagement from './components/AgencyManagement';
import AgencyPackages from './components/AgencyPackages';
import TravelPackages from './components/TravelPackages';
import PackageDetails from './components/PackageDetails';
import Feedback from './components/Feedback';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/agency/login" element={<AgencyLogin />} />
            <Route path="/agency/register" element={<AgencyRegister />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/generate-trip" element={<GenerateTrip />} />
            <Route path="/saved-trips" element={<SavedTrips />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/messages" element={<MessageManagement />} />
            <Route path="/admin/agencies" element={<AgencyManagement />} />
            <Route path="/agency/packages" element={<AgencyPackages />} />
            <Route path="/packages" element={<TravelPackages />} />
            <Route path="/packages/:id" element={<PackageDetails />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;