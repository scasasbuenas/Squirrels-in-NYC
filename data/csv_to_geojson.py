import json
import pandas as pd

# Load cleaned squirrel data
df = pd.read_csv("cleaned_data/cleaned_squirrel_data.csv")

features = []
for _, row in df.iterrows():
    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [row["X"], row["Y"]]
        },
        "properties": {
            "id": row["Unique Squirrel ID"],
            "date": row["Date"],
            "age": row["Age"],
            "furColor": row["Primary Fur Color"],
            "running": row["Running"],
            "chasing": row["Chasing"],
            "climbing": row["Climbing"],
            "eating": row["Eating"],
            "foraging": row["Foraging"]
        }
    }
    features.append(feature)

geojson_data = {
    "type": "FeatureCollection",
    "features": features
}

with open("../dashboard/data/squirrels.geojson", "w") as f:
    json.dump(geojson_data, f, indent=2)
