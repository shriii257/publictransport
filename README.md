# 🚍 Public Transport Feedback & Monitoring Platform
A web application that lets commuters report real-time problems in public transport (delays, overcrowding, infrastructure issues) and helps authorities analyze complaints, spot hotspots, and improve services.

**🌐 Live Demo:** [https://publictransport-1.onrender.com](https://publictransport-1.onrender.com)

---

## 🌟 Problem Statement
Public transport users often face:

- Delays, overcrowding, broken infrastructure  
- Scattered or unheard complaints  
- No centralized way for authorities to analyze feedback and detect problem areas  

---

## 💡 Proposed Solution
This platform provides a central hub for collecting, storing, and visualizing complaints.

- Users submit issues via a simple web form.  
- System stores data, analyzes trends, and displays charts & hotspot maps for authorities.  

---

## ✨ Key Features
- **Complaint Submission:** Log issues by type, severity, and transport mode.  
- **Filtering:** View complaints by mode (bus, train, metro) or severity.  
- **Data Visualization:** Charts show problem distribution & daily trends (powered by Chart.js).  
- **Route Hotspot Map:** Google Maps integration highlights problem-prone areas.  
- **Admin Dashboard:** Manage and visualize complaints.  

---

## 🏗 Tech Stack
| Layer     | Technology                  |
|-----------|------------------------------|
| Frontend  | HTML, CSS, JavaScript, Chart.js |
| Backend   | Python (Flask)               |
| Database  | SQLite                        |
| Maps API  | Google Maps JavaScript API    |

---

## 📂 Project Structure
publictransport/
├─ static/ # CSS, JS, images
├─ templates/ # HTML templates
├─ app.py # Flask backend
├─ transport_feedback.db # SQLite database
└─ requirements.txt


---

## 🔮 Future Scope
- AI-based complaint categorization  
- Predictive analysis of recurring issues  
- Mobile app integration  
- Real-time crowd density & delay tracking  

---

## 🚀 Quick Start
1️⃣ **Clone the Repository**
```bash
git clone https://github.com/shriii257/publictransport.git
cd publictransport

