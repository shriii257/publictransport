from flask import Flask, request, jsonify, render_template_string, send_file
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os
import uuid
import sqlite3
from contextlib import contextmanager
import logging
import base64
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Database configuration
DATABASE = 'transport_feedback.db'
UPLOAD_FOLDER = 'uploads'

# Ensure upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def init_db():
    """Initialize the database with required tables"""
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        
        # Feedback table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                transport_type TEXT NOT NULL,
                route TEXT NOT NULL,
                journey TEXT NOT NULL,
                rating INTEGER NOT NULL,
                problems TEXT,
                comments TEXT,
                status TEXT DEFAULT 'new',
                priority TEXT DEFAULT 'low',
                location_lat REAL,
                location_lng REAL,
                user_id TEXT,
                has_ticket BOOLEAN DEFAULT FALSE,
                ticket_name TEXT,
                ticket_path TEXT,
                ticket_type TEXT,
                ticket_size INTEGER
            )
        ''')
        
        # Route hotspots table for map data
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS route_hotspots (
                id TEXT PRIMARY KEY,
                route TEXT NOT NULL,
                transport_type TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                issue_count INTEGER DEFAULT 0,
                avg_rating REAL DEFAULT 0,
                last_updated TEXT
            )
        ''')
        
        # Files table for ticket storage
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ticket_files (
                id TEXT PRIMARY KEY,
                feedback_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                file_data BLOB NOT NULL,
                upload_time TEXT NOT NULL,
                FOREIGN KEY (feedback_id) REFERENCES feedback (id)
            )
        ''')
        
        # Insert sample hotspot data for demonstration
        sample_hotspots = [
            ('pune_station', 'Pune Railway Station', 'train', 18.5284, 73.8741, 15, 2.3),
            ('shivaji_nagar', 'Shivaji Nagar Bus Station', 'bus', 18.5309, 73.8520, 12, 2.8),
            ('kothrud', 'Kothrud Bus Stop', 'bus', 18.5074, 73.8077, 8, 3.2),
            ('camp_bus', 'Camp Bus Station', 'bus', 18.5089, 73.8938, 18, 2.1),
            ('hadapsar', 'Hadapsar Metro Station', 'metro', 18.5089, 73.9260, 5, 4.1),
            ('magarpatta', 'Magarpatta Metro Station', 'metro', 18.5158, 73.9298, 3, 4.5),
            ('pcmc', 'PCMC Bus Station', 'bus', 18.6298, 73.7997, 10, 2.9),
            ('pimpri', 'Pimpri Bus Stop', 'bus', 18.6298, 73.7997, 9, 3.1)
        ]
        
        for hotspot in sample_hotspots:
            cursor.execute('''
                INSERT OR IGNORE INTO route_hotspots 
                (id, route, transport_type, lat, lng, issue_count, avg_rating, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (*hotspot, datetime.now().isoformat()))
        
        conn.commit()
        logger.info("Database initialized successfully")

@contextmanager
def get_db():
    """Get database connection with automatic cleanup"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def determine_priority(rating, problems):
    """Determine priority based on rating and problems"""
    problem_list = problems.split(',') if problems else []
    if rating <= 2 or 'safety' in problem_list:
        return 'high'
    elif rating <= 3 or len(problem_list) >= 3:
        return 'medium'
    return 'low'

def save_ticket_file(feedback_id, ticket_data):
    """Save ticket file to database"""
    if not ticket_data:
        return None
    
    try:
        # Extract base64 data
        if ',' in ticket_data['data']:
            header, base64_data = ticket_data['data'].split(',', 1)
        else:
            base64_data = ticket_data['data']
        
        # Decode base64
        file_data = base64.b64decode(base64_data)
        
        # Generate file ID
        file_id = str(uuid.uuid4())
        
        # Save to database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ticket_files 
                (id, feedback_id, filename, file_type, file_size, file_data, upload_time)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                file_id,
                feedback_id,
                ticket_data['name'],
                ticket_data['type'],
                ticket_data['size'],
                file_data,
                datetime.now().isoformat()
            ))
            conn.commit()
        
        return file_id
    
    except Exception as e:
        logger.error(f"Error saving ticket file: {e}")
        return None

@app.route('/')
def index():
    """Serve a simple API status page"""
    html_template = '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Smart Transport Feedback API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; text-align: center; }
            .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
            .method { background: #007bff; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; }
            .status { text-align: center; padding: 20px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; color: #155724; margin-bottom: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status">
                <h2>🚀 Smart Transport Feedback API is running!</h2>
                <p>Backend server is active and ready to handle requests</p>
            </div>
            
            <h1>API Endpoints</h1>
            
            <div class="endpoint">
                <span class="method">POST</span> <strong>/api/feedback</strong>
                <p>Submit new feedback from passengers (with file upload support)</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/api/feedback</strong>
                <p>Get all feedback with optional filters (transport_type, priority, status, limit)</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/api/stats</strong>
                <p>Get dashboard statistics and analytics data</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/api/hotspots</strong>
                <p>Get route hotspots for map visualization</p>
            </div>
            
            <div class="endpoint">
                <span class="method">PUT</span> <strong>/api/feedback/{id}/status</strong>
                <p>Update feedback status (new, in_progress, resolved)</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/api/ticket/{feedback_id}</strong>
                <p>Download/view uploaded ticket file</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/api/analytics/routes</strong>
                <p>Get analytics for problematic routes</p>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <strong>/api/export/csv</strong>
                <p>Export feedback data as CSV file</p>
            </div>
        </div>
    </body>
    </html>
    '''
    return render_template_string(html_template)

@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """Submit new feedback"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['transportType', 'route', 'journey', 'rating']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Generate unique ID
        feedback_id = str(uuid.uuid4())
        
        # Process data
        problems = ','.join(data.get('problems', []))
        priority = determine_priority(data['rating'], problems)
        
        # Handle ticket upload
        ticket_file_id = None
        if data.get('ticketData'):
            ticket_file_id = save_ticket_file(feedback_id, data['ticketData'])
        
        # Insert into database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO feedback 
                (id, timestamp, transport_type, route, journey, rating, problems, 
                 comments, status, priority, location_lat, location_lng, user_id,
                 has_ticket, ticket_name, ticket_path, ticket_type, ticket_size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                feedback_id,
                datetime.now().isoformat(),
                data['transportType'],
                data['route'],
                data['journey'],
                int(data['rating']),
                problems,
                data.get('comments', ''),
                'new',
                priority,
                data.get('latitude'),
                data.get('longitude'),
                data.get('userId', 'anonymous'),
                bool(data.get('hasTicket', False)),
                data.get('ticketName'),
                ticket_file_id,
                data.get('ticketData', {}).get('type') if data.get('ticketData') else None,
                data.get('ticketData', {}).get('size') if data.get('ticketData') else None
            ))
            conn.commit()
        
        # Update route hotspot data if location provided
        if data.get('latitude') and data.get('longitude'):
            update_route_hotspot(data['route'], data['transportType'], 
                               data.get('latitude'), data.get('longitude'), 
                               int(data['rating']))
        
        logger.info(f"Feedback submitted successfully: {feedback_id}")
        return jsonify({
            'success': True,
            'message': 'Feedback submitted successfully',
            'id': feedback_id
        })
    
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    """Get all feedback with optional filters"""
    try:
        # Get query parameters
        transport_type = request.args.get('transport_type')
        priority = request.args.get('priority')
        status = request.args.get('status')
        limit = int(request.args.get('limit', 50))
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Build query
            query = 'SELECT * FROM feedback WHERE 1=1'
            params = []
            
            if transport_type:
                query += ' AND transport_type = ?'
                params.append(transport_type)
            
            if priority:
                query += ' AND priority = ?'
                params.append(priority)
            
            if status:
                query += ' AND status = ?'
                params.append(status)
            
            query += ' ORDER BY timestamp DESC LIMIT ?'
            params.append(limit)
            
            cursor.execute(query, params)
            feedback = [dict(row) for row in cursor.fetchall()]
        
        # Process problems field and add ticket info
        for item in feedback:
            item['problems'] = item['problems'].split(',') if item['problems'] else []
            # Add ticket URL if ticket exists
            if item['has_ticket'] and item['ticket_path']:
                item['ticket_url'] = f'/api/ticket/{item["id"]}'
        
        return jsonify({'feedback': feedback})
    
    except Exception as e:
        logger.error(f"Error getting feedback: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ticket/<feedback_id>', methods=['GET'])
def get_ticket(feedback_id):
    """Get ticket file for feedback"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT tf.filename, tf.file_type, tf.file_data, tf.file_size
                FROM ticket_files tf
                WHERE tf.feedback_id = ?
            ''', (feedback_id,))
            
            result = cursor.fetchone()
            if not result:
                return jsonify({'error': 'Ticket not found'}), 404
            
            # Return file as response
            return send_file(
                io.BytesIO(result['file_data']),
                mimetype=result['file_type'],
                as_attachment=False,
                download_name=result['filename']
            )
    
    except Exception as e:
        logger.error(f"Error getting ticket: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Total feedback
            cursor.execute('SELECT COUNT(*) as total FROM feedback')
            total_feedback = cursor.fetchone()['total']
            
            # Average rating
            cursor.execute('SELECT AVG(CAST(rating as FLOAT)) as avg_rating FROM feedback')
            avg_rating = cursor.fetchone()['avg_rating'] or 0
            
            # Active issues
            cursor.execute('SELECT COUNT(*) as active FROM feedback WHERE status = "new"')
            active_issues = cursor.fetchone()['active']
            
            # Resolved issues
            cursor.execute('SELECT COUNT(*) as resolved FROM feedback WHERE status = "resolved"')
            resolved_issues = cursor.fetchone()['resolved']
            
            # Problem distribution
            cursor.execute('SELECT problems FROM feedback WHERE problems != ""')
            all_problems = []
            for row in cursor.fetchall():
                if row['problems']:
                    all_problems.extend(row['problems'].split(','))
            
            from collections import Counter
            problem_counts = dict(Counter(all_problems))
            
            # Daily trend (last 7 days)
            daily_trends = []
            for i in range(7):
                date = datetime.now() - timedelta(days=i)
                date_str = date.strftime('%Y-%m-%d')
                cursor.execute('''
                    SELECT COUNT(*) as count 
                    FROM feedback 
                    WHERE DATE(timestamp) = ?
                ''', (date_str,))
                count = cursor.fetchone()['count']
                daily_trends.append({
                    'date': date.strftime('%a'),
                    'count': count
                })
            
            daily_trends.reverse()
            
            # Transport type distribution
            cursor.execute('''
                SELECT transport_type, COUNT(*) as count 
                FROM feedback 
                GROUP BY transport_type
            ''')
            transport_distribution = {row['transport_type']: row['count'] 
                                    for row in cursor.fetchall()}
            
            # Files statistics
            cursor.execute('SELECT COUNT(*) as files_count FROM ticket_files')
            files_count = cursor.fetchone()['files_count']
            
            cursor.execute('SELECT SUM(file_size) as total_size FROM ticket_files')
            total_file_size = cursor.fetchone()['total_size'] or 0
        
        return jsonify({
            'total_feedback': total_feedback,
            'avg_rating': round(avg_rating, 1),
            'active_issues': active_issues,
            'resolved_issues': resolved_issues,
            'problem_distribution': problem_counts,
            'daily_trends': daily_trends,
            'transport_distribution': transport_distribution,
            'files_uploaded': files_count,
            'total_file_size': total_file_size
        })
    
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/hotspots', methods=['GET'])
def get_hotspots():
    """Get route hotspots for map visualization"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM route_hotspots ORDER BY issue_count DESC')
            hotspots = [dict(row) for row in cursor.fetchall()]
        
        return jsonify({'hotspots': hotspots})
    
    except Exception as e:
        logger.error(f"Error getting hotspots: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback/<feedback_id>/status', methods=['PUT'])
def update_feedback_status(feedback_id):
    """Update feedback status"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['new', 'in_progress', 'resolved']:
            return jsonify({'error': 'Invalid status'}), 400
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE feedback 
                SET status = ? 
                WHERE id = ?
            ''', (new_status, feedback_id))
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Feedback not found'}), 404
            
            conn.commit()
        
        logger.info(f"Feedback status updated: {feedback_id} -> {new_status}")
        return jsonify({'success': True, 'message': 'Status updated successfully'})
    
    except Exception as e:
        logger.error(f"Error updating feedback status: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/routes', methods=['GET'])
def get_route_analytics():
    """Get analytics for specific routes"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Top problematic routes
            cursor.execute('''
                SELECT route, transport_type, 
                       COUNT(*) as complaint_count,
                       AVG(CAST(rating as FLOAT)) as avg_rating,
                       GROUP_CONCAT(DISTINCT problems) as common_problems
                FROM feedback 
                WHERE rating <= 3
                GROUP BY route, transport_type
                ORDER BY complaint_count DESC, avg_rating ASC
                LIMIT 10
            ''')
            
            problematic_routes = []
            for row in cursor.fetchall():
                problems_set = set()
                if row['common_problems']:
                    for problems in row['common_problems'].split(','):
                        if problems:
                            problems_set.update(problems.split(','))
                
                problematic_routes.append({
                    'route': row['route'],
                    'transport_type': row['transport_type'],
                    'complaint_count': row['complaint_count'],
                    'avg_rating': round(row['avg_rating'], 1),
                    'common_problems': list(problems_set)[:3]  # Top 3 problems
                })
        
        return jsonify({'problematic_routes': problematic_routes})
    
    except Exception as e:
        logger.error(f"Error getting route analytics: {e}")
        return jsonify({'error': str(e)}), 500

def update_route_hotspot(route, transport_type, lat, lng, rating):
    """Update or create route hotspot data"""
    if not lat or not lng:
        return
    
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Check if hotspot exists
            cursor.execute('''
                SELECT id, issue_count, avg_rating 
                FROM route_hotspots 
                WHERE route = ? AND transport_type = ?
            ''', (route, transport_type))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing hotspot
                new_issue_count = existing['issue_count'] + 1
                new_avg_rating = ((existing['avg_rating'] * existing['issue_count']) + rating) / new_issue_count
                
                cursor.execute('''
                    UPDATE route_hotspots 
                    SET issue_count = ?, avg_rating = ?, last_updated = ?
                    WHERE id = ?
                ''', (new_issue_count, new_avg_rating, datetime.now().isoformat(), existing['id']))
            else:
                # Create new hotspot
                hotspot_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO route_hotspots 
                    (id, route, transport_type, lat, lng, issue_count, avg_rating, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (hotspot_id, route, transport_type, lat, lng, 1, rating, datetime.now().isoformat()))
            
            conn.commit()
    
    except Exception as e:
        logger.error(f"Error updating hotspot: {e}")

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    """Export feedback data as CSV"""
    try:
        import csv
        from io import StringIO
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM feedback ORDER BY timestamp DESC')
            feedback = cursor.fetchall()
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['ID', 'Timestamp', 'Transport Type', 'Route', 'Journey', 
                        'Rating', 'Problems', 'Comments', 'Status', 'Priority', 
                        'Has Ticket', 'Ticket Name'])
        
        # Write data
        for row in feedback:
            writer.writerow([
                row['id'], row['timestamp'], row['transport_type'], 
                row['route'], row['journey'], row['rating'], 
                row['problems'], row['comments'], row['status'], row['priority'],
                'Yes' if row['has_ticket'] else 'No', row['ticket_name'] or 'N/A'
            ])
        
        output.seek(0)
        response = app.response_class(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=transport_feedback.csv'}
        )
        
        logger.info("CSV export completed")
        return response
    
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/stats', methods=['GET'])
def get_file_stats():
    """Get file upload statistics"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Total files
            cursor.execute('SELECT COUNT(*) as total_files FROM ticket_files')
            total_files = cursor.fetchone()['total_files']
            
            # Total size
            cursor.execute('SELECT SUM(file_size) as total_size FROM ticket_files')
            total_size = cursor.fetchone()['total_size'] or 0
            
            # File types distribution
            cursor.execute('''
                SELECT file_type, COUNT(*) as count 
                FROM ticket_files 
                GROUP BY file_type
            ''')
            file_types = {row['file_type']: row['count'] for row in cursor.fetchall()}
            
            # Recent uploads
            cursor.execute('''
                SELECT tf.filename, tf.file_type, tf.upload_time, f.route, f.transport_type
                FROM ticket_files tf
                JOIN feedback f ON tf.feedback_id = f.id
                ORDER BY tf.upload_time DESC
                LIMIT 10
            ''')
            recent_uploads = [dict(row) for row in cursor.fetchall()]
        
        return jsonify({
            'total_files': total_files,
            'total_size': total_size,
            'file_types': file_types,
            'recent_uploads': recent_uploads
        })
    
    except Exception as e:
        logger.error(f"Error getting file stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 5MB.'}), 413

if __name__ == '__main__':
    # Set maximum file size (5MB)
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
    
    # Initialize database
    init_db()
    
    print("=" * 60)
    print("🚀 Smart Transport Feedback API Server Starting...")
    print("=" * 60)
    print("📊 Dashboard: http://localhost:5000")
    print("🔗 API Base URL: http://localhost:5000/api")
    print("📋 Endpoints:")
    print("   POST /api/feedback - Submit feedback (with file upload)")
    print("   GET  /api/feedback - Get all feedback")
    print("   GET  /api/ticket/<id> - View uploaded ticket")
    print("   GET  /api/stats - Get statistics")
    print("   GET  /api/hotspots - Get map hotspots")
    print("   PUT  /api/feedback/{id}/status - Update status")
    print("   GET  /api/files/stats - File upload statistics")
    print("=" * 60)
    print("✅ Server ready with full ticket support!")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)