# Central Park Squirrel Activity Dashboard

An interactive data visualization dashboard exploring squirrel behavior patterns in Central Park, NYC based on the 2018 Central Park Squirrel Census data.

## 🐿️ Features

- **Interactive Map**: Visualize squirrel sightings across Central Park
- **Behavioral Filters**: Filter squirrels by various behaviors (eating, foraging, climbing, etc.)
- **Activity Charts**: Analyze squirrel activity by fur color, time of day, and temperature
- **Color-coded Visualization**: Different squirrel fur colors (gray, cinnamon, black)
- **Dog Activity Overlay**: Toggle to see correlation with dog presence

## 🚀 Live Demo

Visit the live dashboard: [https://scasasbuenas.github.io/Squirrels-in-NYC/](https://scasasbuenas.github.io/Squirrels-in-NYC/)

## 🛠️ Technologies Used

- **D3.js** - Data visualization and interaction
- **HTML5/CSS3** - Structure and styling
- **JavaScript** - Interactive functionality
- **GeoJSON** - Geographic data representation

## 📊 Data Source

Based on the [2018 Central Park Squirrel Census](https://data.cityofnewyork.us/Environment/2018-Central-Park-Squirrel-Census-Squirrel-Data/vfnx-vebw) conducted by the Squirrel Census team.

## 🏃‍♂️ Running Locally

1. Clone this repository
2. Navigate to the project directory
3. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```
4. Open your browser to `http://localhost:8000`

## 📁 Project Structure

- `index.html` - Main dashboard page
- `style.css` - Dashboard styling
- `script.js` - Main application logic
- `idioms/` - Visualization components (map, charts, filters)
- `data/` - Processed squirrel census data
- `images/` - Squirrel icons and assets

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
