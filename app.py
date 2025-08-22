from flask import Flask, render_template, request, jsonify
import math
import random
import time

app = Flask(__name__)

# Mock data for hotspots
def generate_mock_hotspots(lat, lon, count=15):
    hotspots = []
    for i in range(count):
        # Generate points within ~50km radius
        angle = random.uniform(0, 2 * math.pi)
        distance = random.uniform(2, 50)
        
        # Convert distance to latitude and longitude offsets
        lat_offset = (distance / 111) * math.cos(angle)
        lon_offset = (distance / 111) * math.sin(angle)
        
        hotspots.append({
            'id': f"Spot {i+1}",
            'lat': lat + lat_offset,
            'lon': lon + lon_offset,
            'distance_km': round(distance, 1)
        })
    
    return hotspots

# Mock fish data
def generate_fish_data():
    fish_types = ['Bass', 'Trout', 'Pike', 'Salmon', 'Carp', 'Catfish']
    probabilities = [35, 25, 15, 10, 10, 5]
    
    details = {
        'Best time': random.choice(['Morning', 'Afternoon', 'Evening', 'Night']),
        'Bait recommended': random.choice(['Worms', 'Lures', 'Flies', 'Corn', 'Shrimp']),
        'Depth': f"{random.randint(1, 10)}-{random.randint(11, 20)}m",
        'Technique': random.choice(['Bottom fishing', 'Float fishing', 'Spinning', 'Trolling'])
    }
    
    return {
        'probability': random.randint(10, 95),
        'details': details,
        'fish_type': random.choices(fish_types, weights=probabilities, k=1)[0]
    }

# Mock weather data
def generate_weather_data():
    conditions = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Foggy']
    return {
        'wind_speed': round(random.uniform(0, 15), 1),
        'temp': random.randint(5, 30),
        'condition': random.choice(conditions),
        'source': 'OpenWeatherMap'
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/hotspots', methods=['POST'])
def get_hotspots():
    data = request.get_json()
    if not data or 'origin' not in data:
        return jsonify({'error': 'Origin required'}), 400
    
    origin = data['origin']
    hotspots = generate_mock_hotspots(origin['lat'], origin['lon'])
    
    # Generate a token for this session
    token = str(int(time.time()))
    
    return jsonify({
        'token': token,
        'spots': hotspots
    })

@app.route('/api/spot/<token>/<spot_id>')
def get_spot_details(token, spot_id):
    # In a real app, we would validate the token and fetch actual data
    return jsonify({
        'fish_card': generate_fish_data(),
        'weather_card': generate_weather_data()
    })

if __name__ == '__main__':
    app.run(debug=True)