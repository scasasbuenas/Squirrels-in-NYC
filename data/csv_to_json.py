import pandas as pd
import json

def csv_to_json():
    """Convert the cleaned merged CSV to JSON for the dashboard."""
    print("Converting merged CSV to JSON...")
    
    # Read the merged CSV file
    df = pd.read_csv('cleaned_data/merged_squirrel_hectare_data.csv', sep=';')
    
    print(f"Loaded {len(df)} records from merged_squirrel_hectare_data.csv")
    print(f"Columns: {list(df.columns)}")
    
    # Convert to JSON
    json_data = df.to_json(orient='records', indent=2)
    
    # Save to dashboard data folder
    output_path = '../dashboard/data/squirrel_data.json'
    with open(output_path, 'w') as f:
        f.write(json_data)
    
    print(f"✅ JSON file saved to: {output_path}")
    print(f"📊 {len(df)} records with coordinates ready for the map!")
    
    # Show sample of the data
    print("\nSample records (first 3):")
    sample_records = df.head(3).to_dict('records')
    for i, record in enumerate(sample_records, 1):
        print(f"\nRecord {i}:")
        print(f"  - Coordinates: ({record['X']}, {record['Y']})")
        print(f"  - ID: {record['Unique Squirrel ID']}")
        print(f"  - Hectare: {record['Hectare']}")
        print(f"  - Activities: Running={record['Running']}, Eating={record['Eating']}")

if __name__ == "__main__":
    csv_to_json()