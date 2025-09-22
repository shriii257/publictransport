// Global Variables
const API_BASE_URL = 'http://localhost:5000/api';
let feedbackData = JSON.parse(localStorage.getItem('feedbackData')) || [];
let currentRating = 0;
let selectedProblems = [];
let currentLocation = null;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeStarRating();
    initializeProblemSelection();
    initializeLocationService();
    initializeFormSubmission();
    
    // Load sample data if none exists
    if (feedbackData.length === 0) {
        loadSampleData();
    }
});

// Tab Management
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'admin') {
        setTimeout(() => {
            loadDashboard();
        }, 100);
    }
}

// Star Rating System
function initializeStarRating() {
    const stars = document.querySelectorAll('.star');
    const ratingText = document.getElementById('ratingText');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1;
            updateStarDisplay();
            updateRatingText();
        });
        
        star.addEventListener('mouseenter', () => {
            highlightStars(index + 1);
        });
    });
    
    document.getElementById('starRating').addEventListener('mouseleave', () => {
        updateStarDisplay();
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

function updateStarDisplay() {
    highlightStars(currentRating);
}

function updateRatingText() {
    const ratingText = document.getElementById('ratingText');
    const texts = ['', 'Poor Experience', 'Fair Experience', 'Good Experience', 'Very Good Experience', 'Excellent Experience'];
    ratingText.textContent = texts[currentRating] || 'Click stars to rate';
}

// Problem Selection
function initializeProblemSelection() {
    const problemTypes = document.querySelectorAll('.problem-type');
    
    problemTypes.forEach(type => {
        type.addEventListener('click', () => {
            const problem = type.dataset.problem;
            
            if (selectedProblems.includes(problem)) {
                selectedProblems = selectedProblems.filter(p => p !== problem);
                type.classList.remove('selected');
            } else {
                selectedProblems.push(problem);
                type.classList.add('selected');
            }
        });
    });
}

// Location Services
function initializeLocationService() {
    const getLocationBtn = document.getElementById('getLocationBtn');
    const locationStatus = document.getElementById('locationStatus');
    
    getLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            locationStatus.textContent = ' Location not supported';
            return;
        }
        
        getLocationBtn.disabled = true;
        getLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                locationStatus.textContent = ' Location captured';
                getLocationBtn.innerHTML = '<i class="fas fa-check"></i> Location Added';
                getLocationBtn.style.background = '#4caf50';
            },
            (error) => {
                locationStatus.textContent = ' Location failed';
                getLocationBtn.disabled = false;
                getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Add Location (Optional)';
            }
        );
    });
}

// Form Submission
function initializeFormSubmission() {
    document.getElementById('feedbackForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Validate form
            if (!validateForm()) {
                return;
            }
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            
            // Prepare form data
            const formData = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                transportType: document.getElementById('transportType').value,
                route: document.getElementById('route').value,
                journey: document.getElementById('journey').value,
                rating: currentRating,
                problems: selectedProblems.slice(),
                comments: document.getElementById('comments').value,
                status: 'new',
                priority: determinePriority(currentRating, selectedProblems),
                ...currentLocation
            };
            
            // Try to submit to backend, fallback to localStorage
            try {
                const response = await fetch(`${API_BASE_URL}/feedback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                if (!response.ok) throw new Error('Backend not available');
            } catch (backendError) {
                console.log('Backend not available, using local storage');
            }
            
            // Save to localStorage (always)
            feedbackData.push(formData);
            localStorage.setItem('feedbackData', JSON.stringify(feedbackData));
            
            // Show success message
            showSuccessMessage();
            resetForm();
            
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('Error submitting feedback: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

function validateForm() {
    const transportType = document.getElementById('transportType').value;
    const route = document.getElementById('route').value;
    const journey = document.getElementById('journey').value;
    
    if (!transportType || !route || !journey || !currentRating) {
        alert('Please fill in all required fields and provide a rating.');
        return false;
    }
    
    return true;
}

function determinePriority(rating, problems) {
    if (rating <= 2 || problems.includes('safety')) return 'high';
    if (rating <= 3 || problems.length >= 3) return 'medium';
    return 'low';
}

function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'block';
    
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 4000);
}

function resetForm() {
    document.getElementById('feedbackForm').reset();
    currentRating = 0;
    selectedProblems = [];
    currentLocation = null;
    updateStarDisplay();
    updateRatingText();
    
    document.querySelectorAll('.problem-type').forEach(type => {
        type.classList.remove('selected');
    });
    
    const getLocationBtn = document.getElementById('getLocationBtn');
    const locationStatus = document.getElementById('locationStatus');
    getLocationBtn.disabled = false;
    getLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Add Location (Optional)';
    getLocationBtn.style.background = '';
    locationStatus.textContent = '';
}

// Dashboard Functions
async function loadDashboard() {
    try {
        updateDashboardStats();
        createCharts();
        loadComplaints();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateDashboardStats() {
    const totalFeedbacks = feedbackData.length;
    const avgRating = totalFeedbacks > 0 ? 
        (feedbackData.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks).toFixed(1) : '0.0';
    const activeIssues = feedbackData.filter(f => f.status === 'new').length;
    const resolvedIssues = feedbackData.filter(f => f.status === 'resolved').length;
    
    document.getElementById('totalFeedbacks').textContent = totalFeedbacks;
    document.getElementById('avgRating').textContent = avgRating;
    document.getElementById('activeIssues').textContent = activeIssues;
    document.getElementById('resolvedIssues').textContent = resolvedIssues;
}

function createCharts() {
    createProblemChart();
    createTrendChart();
}

function createProblemChart() {
    const ctx = document.getElementById('problemChart').getContext('2d');
    
    // Clear existing chart
    if (window.problemChartInstance) {
        window.problemChartInstance.destroy();
    }
    
    // Count problem occurrences
    const problemCounts = {};
    feedbackData.forEach(feedback => {
        feedback.problems.forEach(problem => {
            problemCounts[problem] = (problemCounts[problem] || 0) + 1;
        });
    });
    
    const labels = Object.keys(problemCounts).map(label => 
        label.charAt(0).toUpperCase() + label.slice(1)
    );
    const data = Object.values(problemCounts);
    
    window.problemChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
                borderWidth: 0,
                hoverBorderWidth: 3,
                hoverBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8
                }
            },
            cutout: '60%'
        }
    });
}

function createTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // Clear existing chart
    if (window.trendChartInstance) {
        window.trendChartInstance.destroy();
    }
    
    // Create last 7 days data
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        const dayCount = feedbackData.filter(f => {
            const feedbackDate = new Date(f.timestamp);
            return feedbackDate >= dayStart && feedbackDate <= dayEnd;
        }).length;
        
        data.push(dayCount);
    }
    
    window.trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Feedbacks',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    cornerRadius: 8
                }
            }
        }
    });
}

function loadComplaints() {
    const complaintsList = document.getElementById('complaintsList');
    
    // Sort feedbacks by timestamp (newest first)
    const sortedFeedbacks = [...feedbackData].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    complaintsList.innerHTML = '';
    
    if (sortedFeedbacks.length === 0) {
        complaintsList.innerHTML = `
            <div class="complaint-item" style="text-align: center; color: #666;">
                <h3>No feedback received yet</h3>
                <p>Complaints will appear here as passengers submit feedback.</p>
            </div>
        `;
        return;
    }
    
    sortedFeedbacks.forEach(feedback => {
        const complaintDiv = document.createElement('div');
        complaintDiv.className = 'complaint-item';
        complaintDiv.setAttribute('data-transport', feedback.transportType);
        complaintDiv.setAttribute('data-priority', feedback.priority);
        
        const timeAgo = getTimeAgo(new Date(feedback.timestamp));
        const problemsText = feedback.problems && feedback.problems.length > 0 ? 
            feedback.problems.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') : 
            'No specific problems reported';
        
        const stars = '⭐'.repeat(feedback.rating);
        
        complaintDiv.innerHTML = `
            <div class="complaint-header">
                <div class="complaint-title">
                    <strong>${feedback.transportType.toUpperCase()}: ${feedback.route}</strong>
                </div>
                <div>
                    <span class="priority ${feedback.priority}">${feedback.priority}</span>
                    <small style="color: #999; margin-left: 10px;">${timeAgo}</small>
                </div>
            </div>
            <div class="complaint-meta">
                <strong>Journey:</strong> ${feedback.journey}
            </div>
            <div class="complaint-details">
                <strong>Rating:</strong> ${stars} (${feedback.rating}/5) | 
                <strong>Issues:</strong> ${problemsText}
            </div>
            ${feedback.comments ? `<div class="complaint-comment">"${feedback.comments}"</div>` : ''}
        `;
        
        complaintsList.appendChild(complaintDiv);
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Filter Complaints
function filterComplaints(filter) {
    const complaints = document.querySelectorAll('.complaint-item');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // Update active filter button
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    complaints.forEach(complaint => {
        let show = true;
        
        if (filter === 'high') {
            show = complaint.getAttribute('data-priority') === 'high';
        } else if (['bus', 'train', 'metro', 'auto'].includes(filter)) {
            show = complaint.getAttribute('data-transport') === filter;
        }
        // 'all' shows everything
        
        complaint.style.display = show ? 'block' : 'none';
    });
}

// Load Sample Data
function loadSampleData() {
    const sampleData = [
        {
            id: 1,
            timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            transportType: 'bus',
            route: 'Route 32',
            journey: 'Shivaji Nagar to Kothrud',
            rating: 2,
            problems: ['delay', 'overcrowding'],
            comments: 'Bus was 30 minutes late and extremely crowded. Very poor experience.',
            status: 'new',
            priority: 'high'
        },
        {
            id: 2,
            timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            transportType: 'metro',
            route: 'Blue Line',
            journey: 'Civil Court to Ruby Hall Clinic',
            rating: 4,
            problems: ['cleanliness'],
            comments: 'Generally good service but station cleanliness could be improved.',
            status: 'new',
            priority: 'low'
        },
        {
            id: 3,
            timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
            transportType: 'train',
            route: 'Pune-Mumbai Local',
            journey: 'Pune Station to Dadar',
            rating: 3,
            problems: ['delay', 'maintenance'],
            comments: 'Train was delayed by 20 minutes. Seats need repair.',
            status: 'new',
            priority: 'medium'
        },
        {
            id: 4,
            timestamp: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
            transportType: 'auto',
            route: 'Local Area',
            journey: 'FC Road to Koregaon Park',
            rating: 5,
            problems: [],
            comments: 'Excellent service! Driver was very polite and professional.',
            status: 'new',
            priority: 'low'
        },
        {
            id: 5,
            timestamp: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
            transportType: 'bus',
            route: 'Route 158',
            journey: 'Hadapsar to Swargate',
            rating: 1,
            problems: ['safety', 'staff', 'maintenance'],
            comments: 'Driver was rude, bus was not maintained properly, felt unsafe.',
            status: 'new',
            priority: 'high'
        }
    ];
    
    feedbackData = sampleData;
    localStorage.setItem('feedbackData', JSON.stringify(feedbackData));
}

// Initialize Google Maps (if API key is available)
function initializeMap() {
    // This function will be called when Google Maps API is loaded
    // For demo purposes, we'll show placeholder
    console.log('Map initialization ready - add your Google Maps API key');
}