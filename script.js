// Global Variables
const API_BASE_URL = 'http://localhost:5000/api';
let feedbackData = JSON.parse(localStorage.getItem('feedbackData')) || [];
let currentRating = 0;
let selectedProblems = [];
let currentLocation = null;
let uploadedFile = null;
let uploadedFileData = null; // Store file data for display
let isAdminLoggedIn = false;

// Admin credentials (in production, this should be server-side)
const ADMIN_CREDENTIALS = {
    username: 'shriii257',
    password: 'Shri@123'
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeStarRating();
    initializeProblemSelection();
    initializeLocationService();
    initializeFormSubmission();
    initializeFileUpload();
    initializeAdminLogin();
    
    // Load sample data if none exists
    if (feedbackData.length === 0) {
        loadSampleData();
    }
    
    // Check if admin is already logged in
    checkAdminSession();
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
        if (!isAdminLoggedIn) {
            document.getElementById('adminLogin').style.display = 'block';
            document.getElementById('adminDashboard').style.display = 'none';
        } else {
            document.getElementById('adminLogin').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'block';
            setTimeout(() => {
                loadAdminDashboard();
            }, 100);
        }
    } else if (tabName === 'public') {
        setTimeout(() => {
            loadPublicDashboard();
        }, 100);
    }
}

// File Upload Handling
function initializeFileUpload() {
    const fileInput = document.getElementById('ticketUpload');
    const fileName = document.getElementById('fileName');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                fileInput.value = '';
                fileName.textContent = 'No file selected';
                return;
            }
            
            // Check file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                alert('Please upload only JPG, PNG, or PDF files');
                fileInput.value = '';
                fileName.textContent = 'No file selected';
                return;
            }
            
            uploadedFile = file;
            fileName.textContent = file.name;
            
            // Convert file to base64 for storage
            const reader = new FileReader();
            reader.onload = function(e) {
                uploadedFileData = {
                    name: file.name,
                    type: file.type,
                    data: e.target.result,
                    size: file.size
                };
            };
            reader.readAsDataURL(file);
        }
    });
}

// Admin Authentication
function initializeAdminLogin() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('loginError');
        
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            isAdminLoggedIn = true;
            sessionStorage.setItem('adminLoggedIn', 'true');
            loginError.style.display = 'none';
            
            document.getElementById('adminLogin').style.display = 'none';
            document.getElementById('adminDashboard').style.display = 'block';
            
            // Clear form
            document.getElementById('loginForm').reset();
            
            // Load dashboard
            setTimeout(() => {
                loadAdminDashboard();
            }, 100);
        } else {
            loginError.style.display = 'block';
        }
    });
}

function checkAdminSession() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        isAdminLoggedIn = true;
    }
}

function adminLogout() {
    isAdminLoggedIn = false;
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
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
                status: 'active',
                priority: determinePriority(currentRating, selectedProblems),
                hasTicket: uploadedFile ? true : false,
                ticketName: uploadedFile ? uploadedFile.name : null,
                ticketData: uploadedFileData ? uploadedFileData : null,
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
    uploadedFile = null;
    uploadedFileData = null;
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
    
    document.getElementById('fileName').textContent = 'No file selected';
    document.getElementById('ticketUpload').value = '';
}

// Public Dashboard Functions
async function loadPublicDashboard() {
    try {
        updatePublicDashboardStats();
        createPublicCharts();
        loadPublicComplaints();
    } catch (error) {
        console.error('Error loading public dashboard:', error);
    }
}

function updatePublicDashboardStats() {
    const totalFeedbacks = feedbackData.length;
    const avgRating = totalFeedbacks > 0 ? 
        (feedbackData.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks).toFixed(1) : '0.0';
    const activeIssues = feedbackData.filter(f => f.status === 'active').length;
    const resolvedIssues = feedbackData.filter(f => f.status === 'resolved').length;
    
    document.getElementById('publicTotalFeedbacks').textContent = totalFeedbacks;
    document.getElementById('publicAvgRating').textContent = avgRating;
    document.getElementById('publicActiveIssues').textContent = activeIssues;
    document.getElementById('publicResolvedIssues').textContent = resolvedIssues;
}

function createPublicCharts() {
    createPublicProblemChart();
    createPublicTrendChart();
}

function createPublicProblemChart() {
    const ctx = document.getElementById('publicProblemChart').getContext('2d');
    
    // Clear existing chart
    if (window.publicProblemChartInstance) {
        window.publicProblemChartInstance.destroy();
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
    
    window.publicProblemChartInstance = new Chart(ctx, {
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
                }
            },
            cutout: '60%'
        }
    });
}

function createPublicTrendChart() {
    const ctx = document.getElementById('publicTrendChart').getContext('2d');
    
    // Clear existing chart
    if (window.publicTrendChartInstance) {
        window.publicTrendChartInstance.destroy();
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
    
    window.publicTrendChartInstance = new Chart(ctx, {
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
                }
            }
        }
    });
}

function loadPublicComplaints() {
    const complaintsList = document.getElementById('publicComplaintsList');
    
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
        const complaintDiv = createComplaintItem(feedback, false);
        complaintsList.appendChild(complaintDiv);
    });
}

// Admin Dashboard Functions
async function loadAdminDashboard() {
    try {
        updateDashboardStats();
        createCharts();
        loadComplaints();
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
    }
}

function updateDashboardStats() {
    const totalFeedbacks = feedbackData.length;
    const avgRating = totalFeedbacks > 0 ? 
        (feedbackData.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks).toFixed(1) : '0.0';
    const activeIssues = feedbackData.filter(f => f.status === 'active').length;
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
        const complaintDiv = createComplaintItem(feedback, true);
        complaintsList.appendChild(complaintDiv);
    });
}

function createComplaintItem(feedback, isAdmin) {
    const complaintDiv = document.createElement('div');
    complaintDiv.className = 'complaint-item';
    complaintDiv.setAttribute('data-transport', feedback.transportType);
    complaintDiv.setAttribute('data-priority', feedback.priority);
    complaintDiv.setAttribute('data-status', feedback.status);
    
    const timeAgo = getTimeAgo(new Date(feedback.timestamp));
    const problemsText = feedback.problems && feedback.problems.length > 0 ? 
        feedback.problems.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') : 
        'No specific problems reported';
    
    const stars = '⭐'.repeat(feedback.rating);
    
    // Create ticket button for admin view
    const ticketButton = isAdmin && feedback.hasTicket ? 
        `<button class="view-ticket-btn" onclick="viewTicket('${feedback.id}')">
            <i class="fas fa-eye"></i> View Ticket
        </button>` : '';
    
    // Create resolve button for admin view
    const resolveButton = isAdmin && feedback.status === 'active' ? 
        `<button class="resolve-btn" onclick="resolveComplaint(${feedback.id})">
            <i class="fas fa-check"></i> Resolve
        </button>` : '';
    
    complaintDiv.innerHTML = `
        <div class="complaint-header">
            <div class="complaint-title">
                <strong>${feedback.transportType.toUpperCase()}: ${feedback.route}</strong>
                <span class="status-badge ${feedback.status}">${feedback.status}</span>
                ${feedback.hasTicket ? '<span style="color: #4caf50; margin-left: 10px;"><i class="fas fa-paperclip"></i> Ticket Attached</span>' : ''}
            </div>
            <div>
                <span class="priority ${feedback.priority}">${feedback.priority}</span>
                <small style="color: #999; margin-left: 10px;">${timeAgo}</small>
                ${ticketButton}
                ${resolveButton}
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
    
    return complaintDiv;
}

// Ticket Viewing Functions
function viewTicket(feedbackId) {
    const feedback = feedbackData.find(f => f.id == feedbackId);
    if (!feedback || !feedback.ticketData) {
        alert('Ticket not found or not available');
        return;
    }
    
    const modal = document.getElementById('ticketModal');
    const ticketViewer = document.getElementById('ticketViewer');
    
    // Create ticket info
    const ticketInfo = document.createElement('div');
    ticketInfo.className = 'ticket-info';
    ticketInfo.innerHTML = `
        <h4>Ticket Information</h4>
        <p><strong>Complaint ID:</strong> ${feedback.id}</p>
        <p><strong>Route:</strong> ${feedback.transportType.toUpperCase()} - ${feedback.route}</p>
        <p><strong>Journey:</strong> ${feedback.journey}</p>
        <p><strong>File Name:</strong> ${feedback.ticketData.name}</p>
        <p><strong>File Size:</strong> ${formatFileSize(feedback.ticketData.size)}</p>
        <p><strong>Upload Date:</strong> ${new Date(feedback.timestamp).toLocaleString()}</p>
    `;
    
    // Clear previous content
    ticketViewer.innerHTML = '';
    ticketViewer.appendChild(ticketInfo);
    
    // Display the file based on type
    if (feedback.ticketData.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = feedback.ticketData.data;
        img.alt = 'Uploaded ticket';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '10px';
        img.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
        ticketViewer.appendChild(img);
    } else if (feedback.ticketData.type === 'application/pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = feedback.ticketData.data;
        iframe.width = '100%';
        iframe.height = '600px';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '10px';
        iframe.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
        ticketViewer.appendChild(iframe);
    } else {
        const errorMsg = document.createElement('div');
        errorMsg.innerHTML = `
            <p style="text-align: center; color: #666; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
                Unable to preview this file type.<br>
                <strong>File:</strong> ${feedback.ticketData.name}
            </p>
        `;
        ticketViewer.appendChild(errorMsg);
    }
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('ticketModal');
    if (event.target === modal) {
        closeTicketModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeTicketModal();
    }
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function resolveComplaint(id) {
    const feedbackIndex = feedbackData.findIndex(f => f.id === id);
    if (feedbackIndex !== -1) {
        feedbackData[feedbackIndex].status = 'resolved';
        localStorage.setItem('feedbackData', JSON.stringify(feedbackData));
        
        // Reload the dashboard
        loadAdminDashboard();
        
        // Show success message
        alert('Complaint marked as resolved successfully!');
    }
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

// Filter Functions
function filterComplaints(filter) {
    const complaints = document.querySelectorAll('#complaintsList .complaint-item');
    const filterBtns = document.querySelectorAll('#admin .filter-btn');
    
    // Update active filter button
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    complaints.forEach(complaint => {
        let show = true;
        
        if (filter === 'high') {
            show = complaint.getAttribute('data-priority') === 'high';
        } else if (filter === 'resolved') {
            show = complaint.getAttribute('data-status') === 'resolved';
        } else if (['bus', 'train', 'metro', 'auto'].includes(filter)) {
            show = complaint.getAttribute('data-transport') === filter;
        }
        // 'all' shows everything
        
        complaint.style.display = show ? 'block' : 'none';
    });
}

function filterPublicComplaints(filter) {
    const complaints = document.querySelectorAll('#publicComplaintsList .complaint-item');
    const filterBtns = document.querySelectorAll('#public .filter-btn');
    
    // Update active filter button
    filterBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    complaints.forEach(complaint => {
        let show = true;
        
        if (filter === 'resolved') {
            show = complaint.getAttribute('data-status') === 'resolved';
        } else if (filter === 'active') {
            show = complaint.getAttribute('data-status') === 'active';
        } else if (filter === 'high') {
            show = complaint.getAttribute('data-priority') === 'high';
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
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            transportType: 'bus',
            route: 'Route 32',
            journey: 'Shivaji Nagar to Kothrud',
            rating: 2,
            problems: ['delay', 'overcrowding'],
            comments: 'Bus was 30 minutes late and extremely crowded. Very poor experience.',
            status: 'active',
            priority: 'high',
            hasTicket: true,
            ticketName: 'ticket_32.jpg',
            ticketData: {
                name: 'ticket_32.jpg',
                type: 'image/jpeg',
                data: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y4ZjlmYSIgc3Ryb2tlPSIjZGVlMmU2IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TYW1wbGUgVGlja2V0PC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iMTUwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlJvdXRlIDMyPC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJ1cyBUaWNrZXQgLSBTaGl2YWppIE5hZ2FyIHRvIEtvdGhydWQ8L3RleHQ+Cjwvc3ZnPg==',
                size: 15240
            }
        },
        {
            id: 2,
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            transportType: 'metro',
            route: 'Blue Line',
            journey: 'Civil Court to Ruby Hall Clinic',
            rating: 4,
            problems: ['cleanliness'],
            comments: 'Generally good service but station cleanliness could be improved.',
            status: 'resolved',
            priority: 'low',
            hasTicket: false,
            ticketData: null
        },
        {
            id: 3,
            timestamp: new Date(Date.now() - 259200000).toISOString(),
            transportType: 'train',
            route: 'Pune-Mumbai Local',
            journey: 'Pune Station to Dadar',
            rating: 3,
            problems: ['delay', 'maintenance'],
            comments: 'Train was delayed by 20 minutes. Seats need repair.',
            status: 'active',
            priority: 'medium',
            hasTicket: true,
            ticketName: 'train_receipt.pdf',
            ticketData: {
                name: 'train_receipt.pdf',
                type: 'application/pdf',
                data: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVGl0bGUgKFNhbXBsZSBUcmFpbiBSZWNlaXB0KQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAzIDAgUgovUmVzb3VyY2VzIDw8Cj4+Ci9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovTGVuZ3RoIDEwOQo+PgpzdHJlYW0KQVQKL0YxIDEyIFRmCjUwIDcwMCBUZApbKFNhbXBsZSBUcmFpbiBSZWNlaXB0KSBUagowIC0xNCBUZApbKFB1bmUgdG8gTXVtYmFpKSBUagowIC0xNCBUZApbKFRpY2tldCAjMTIzNDUpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNTMgMDAwMDAgbiAKMDAwMDAwMDEwMCAwMDAwMCBuIAowMDAwMDAwMTU3IDAwMDAwIG4gCjAwMDAwMDAyNjUgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDIgMCBSCi9JbmZvIDEgMCBSCj4+CnN0YXJ0eHJlZgo0MjUKJSVFT0Y=',
                size: 8450
            }
        },
        {
            id: 4,
            timestamp: new Date(Date.now() - 345600000).toISOString(),
            transportType: 'auto',
            route: 'Local Area',
            journey: 'FC Road to Koregaon Park',
            rating: 5,
            problems: [],
            comments: 'Excellent service! Driver was very polite and professional.',
            status: 'resolved',
            priority: 'low',
            hasTicket: false,
            ticketData: null
        },
        {
            id: 5,
            timestamp: new Date(Date.now() - 432000000).toISOString(),
            transportType: 'bus',
            route: 'Route 158',
            journey: 'Hadapsar to Swargate',
            rating: 1,
            problems: ['safety', 'staff', 'maintenance'],
            comments: 'Driver was rude, bus was not maintained properly, felt unsafe.',
            status: 'active',
            priority: 'high',
            hasTicket: true,
            ticketName: 'complaint_158.png',
            ticketData: {
                name: 'complaint_158.png',
                type: 'image/png',
                data: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2ZmZWJlZSIgc3Ryb2tlPSIjZmY1NzIyIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjgwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNkYzM1NDUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIj5DT01QTEFJTlQ8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIxMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Um91dGUgMTU4PC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNhZmV0eSAmIE1haW50ZW5hbmNlIElzc3VlczwvdGV4dD4KICA8dGV4dCB4PSIyMDAiIHk9IjIwMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjY2NjIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5IYWRhcHNhciB0byBTd2FyZ2F0ZTwvdGV4dD4KICA8Y2lyY2xlIGN4PSIzNTAiIGN5PSI1MCIgcj0iMjAiIGZpbGw9IiNkYzM1NDUiLz4KICA8dGV4dCB4PSIzNTAiIHk9IjU3IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+ITwvdGV4dD4KPC9zdmc+',
                size: 12800
            }
        }
    ];
    
    feedbackData = sampleData;
    localStorage.setItem('feedbackData', JSON.stringify(feedbackData));
}