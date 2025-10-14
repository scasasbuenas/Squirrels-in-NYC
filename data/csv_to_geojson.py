import json
import pandas as pd

# Load cleaned squirrel data
df = pd.read_csv("cleaned_data/merged_squirrel_hectare_data.csv", sep=';')  # or '\t'

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
            "foraging": row["Foraging"],
            "kuks": row["Kuks"],
            "quaas": row["Quaas"],
            "tail flags": row ["Tail flags"],
            "tail twitches": row ["Tail twitches"],
            "approaches": row["Approaches"],
            "indifferent": row["Indifferent"],
            "runs from": row["Runs from"],
            "dogs": bool(row["Dogs"]) 
        }
    }
    features.append(feature)

geojson_data = {
    "type": "FeatureCollection",
    "features": features
}

with open("../dashboard/data/squirrels.geojson", "w") as f:
    json.dump(geojson_data, f, indent=2)
