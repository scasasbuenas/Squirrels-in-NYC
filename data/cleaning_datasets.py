import pandas as pd
import numpy as np
import re
import os

def clean_squirrel_dataset():
    """Clean the squirrel dataset according to specifications, extracting proper coordinates."""
    print("\n" + "="*50)
    print("CLEANING SQUIRREL DATASET")
    print("="*50)

    # Load the Squirrel Dataset
    print("Loading Squirrel Dataset...")
    squirrel_df = pd.read_csv(
        '2018_Central_Park_Squirrel_Census_-_Squirrel_Data_20250916.csv', sep=';'
    )

    print(f"Dataset shape: {squirrel_df.shape}")
    print(f"Columns: {list(squirrel_df.columns)}")
    print("\nFirst few rows:")
    print(squirrel_df.head())
    print("\nMissing values per column:")
    print(squirrel_df.isnull().sum())

    # Step 1: Select relevant columns (keeping Lat/Long to extract coordinates)
    columns_to_keep = [
        'Unique Squirrel ID', 'Hectare', 'Shift', 'Date', 'Age', 'Primary Fur Color',
        'Running', 'Chasing', 'Climbing', 'Eating', 'Foraging', 
        'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 
        'Approaches', 'Indifferent', 'Runs from', 'Lat/Long'
    ]
    cleaned_squirrel_df = squirrel_df[columns_to_keep].copy()
    print(f"After column selection - Shape: {cleaned_squirrel_df.shape}")

    # Step 2: Handle missing Age and Fur Color
    cleaned_squirrel_df['Age'] = cleaned_squirrel_df['Age'].fillna('Unknown')
    cleaned_squirrel_df['Primary Fur Color'] = cleaned_squirrel_df['Primary Fur Color'].fillna('Unknown')

    # Step 3: Convert behavioral columns to boolean
    behavioral_cols = ['Running', 'Chasing', 'Climbing', 'Eating', 'Foraging',
                       'Kuks', 'Quaas', 'Tail flags', 'Tail twitches',
                       'Approaches', 'Indifferent', 'Runs from']
    for col in behavioral_cols:
        cleaned_squirrel_df[col] = cleaned_squirrel_df[col].fillna(False).astype(bool)

    # Step 4: Extract X/Y coordinates from Lat/Long column
    def extract_latlong(point_str):
        """Convert 'POINT (-73.9674285955293 40.7829723919744)' to (X, Y) floats"""
        if pd.isna(point_str):
            return (None, None)
        match = re.search(r'POINT \((-?\d+\.\d+) (-?\d+\.\d+)\)', point_str)
        if match:
            x = float(match.group(1))
            y = float(match.group(2))
            return (x, y)
        return (None, None)

    cleaned_squirrel_df[['X', 'Y']] = cleaned_squirrel_df['Lat/Long'].apply(lambda s: pd.Series(extract_latlong(s)))
    cleaned_squirrel_df = cleaned_squirrel_df.drop('Lat/Long', axis=1)

    # Step 5: Save cleaned dataset
    os.makedirs('cleaned_data', exist_ok=True)
    output_filename = 'cleaned_squirrel_data.csv'
    cleaned_squirrel_df.to_csv(f'cleaned_data/{output_filename}', index=False)
    print(f"\n✅ Cleaned squirrel dataset saved to: cleaned_data/{output_filename}")

    return cleaned_squirrel_df

def clean_hectare_dataset():
    """Clean the hectare dataset according to specifications."""
    print("\n" + "="*50)
    print("CLEANING HECTARE DATASET")
    print("="*50)

    hectare_df = pd.read_csv('2018_Central_Park_Squirrel_Census_-_Hectare_Data_20250916.csv', sep=';')

    # Step 1: Select relevant columns
    hectare_columns_to_keep = [
        'Hectare', 'Shift', 'Date', 'Sighter Observed Weather Data', 
        'Other Animal Sightings', 'Hectare Conditions', 'Number of Squirrels'
    ]
    cleaned_hectare_df = hectare_df[hectare_columns_to_keep].copy()

    # Step 2: Extract temperature from weather data
    def extract_temperature(weather_str):
        if pd.isna(weather_str) or weather_str == '':
            return np.nan
        temp_patterns = [r'(\d+)º?\s*F', r'(\d+)°\s*F', r'(\d+)º?\s*C', r'(\d+)°\s*C', r'^(\d+)\s*$']
        for pattern in temp_patterns:
            match = re.search(pattern, str(weather_str), re.IGNORECASE)
            if match:
                return float(match.group(1))
        return np.nan
    cleaned_hectare_df['Weather'] = cleaned_hectare_df['Sighter Observed Weather Data'].apply(extract_temperature)
    cleaned_hectare_df = cleaned_hectare_df.drop('Sighter Observed Weather Data', axis=1)

    # Step 3: Transform Other Animal Sightings to Dogs (binary)
    def extract_dogs(animal_str):
        if pd.isna(animal_str) or animal_str == '':
            return 0
        return 1 if re.search(r'\bdog(s)?\b', str(animal_str), re.IGNORECASE) else 0
    cleaned_hectare_df['Dogs'] = cleaned_hectare_df['Other Animal Sightings'].apply(extract_dogs)
    cleaned_hectare_df = cleaned_hectare_df.drop('Other Animal Sightings', axis=1)

    # Step 4: Fill NaN Weather values with date-based averages
    date_avg = cleaned_hectare_df.groupby('Date')['Weather'].mean()
    overall_avg = cleaned_hectare_df['Weather'].mean()
    def fill_weather(row):
        if pd.isna(row['Weather']):
            if row['Date'] in date_avg and not pd.isna(date_avg[row['Date']]):
                return round(date_avg[row['Date']], 1)
            else:
                return round(overall_avg, 1) if not pd.isna(overall_avg) else np.nan
        return round(row['Weather'], 1)
    cleaned_hectare_df['Weather'] = cleaned_hectare_df.apply(fill_weather, axis=1)

    # Save cleaned hectare dataset
    os.makedirs('cleaned_data', exist_ok=True)
    hectare_output_filename = 'cleaned_hectare_data.csv'
    cleaned_hectare_df.to_csv(f'cleaned_data/{hectare_output_filename}', index=False)
    print(f"\n✅ Cleaned hectare dataset saved to: cleaned_data/{hectare_output_filename}")

    return cleaned_hectare_df

def main():
    """Main function to run both cleaning processes."""
    print("="*60)
    print("CENTRAL PARK SQUIRREL CENSUS - DATA CLEANING")
    print("="*60)
    
    squirrel_data = clean_squirrel_dataset()
    hectare_data = clean_hectare_dataset()
    
    print(f"\nCleaning complete!")
    print(f"Squirrel dataset: {squirrel_data.shape[0]} rows, {squirrel_data.shape[1]} columns")
    print(f"Hectare dataset: {hectare_data.shape[0]} rows, {hectare_data.shape[1]} columns")
    print(f"Files saved in 'cleaned_data/' folder")
    
    return squirrel_data, hectare_data

def merge_datasets():
    """Merge cleaned squirrel and hectare datasets using Hectare as the key."""
    print("\nMERGING SQUIRREL AND HECTARE DATASETS")
    
    try:
        squirrel_df = pd.read_csv('cleaned_data/cleaned_squirrel_data.csv')
        hectare_df = pd.read_csv('cleaned_data/cleaned_hectare_data.csv')
    except FileNotFoundError as e:
        print(f"Error: Cleaned datasets not found. {e}")
        return None
    
    merged_df = squirrel_df.merge(
        hectare_df, 
        on=['Hectare', 'Shift'], 
        how='left', 
        suffixes=('_squirrel', '_hectare')
    )
    
    # Handle duplicate Date columns
    if 'Date_squirrel' in merged_df.columns and 'Date_hectare' in merged_df.columns:
        merged_df['Date'] = merged_df['Date_squirrel'].fillna(merged_df['Date_hectare'])
        merged_df.drop(['Date_squirrel', 'Date_hectare'], axis=1, inplace=True)
    
    # Reorder columns
    column_order = ['X', 'Y', 'Unique Squirrel ID', 'Hectare', 'Shift', 'Date',
                    'Age', 'Primary Fur Color', 'Running', 'Chasing', 'Climbing',
                    'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 'Tail twitches',
                    'Approaches', 'Indifferent', 'Runs from',
                    'Hectare Conditions', 'Number of Squirrels', 'Weather', 'Dogs']
    merged_df = merged_df[[col for col in column_order if col in merged_df.columns]]

    # Save merged dataset
    os.makedirs('cleaned_data', exist_ok=True)
    merged_df.to_csv('cleaned_data/merged_squirrel_hectare_data.csv', index=False, sep=';')
    print(f"Merged dataset saved to 'cleaned_data/merged_squirrel_hectare_data.csv'")

    print("\nSample of merged dataset:")
    print(merged_df.head(3))
    
    return merged_df

# ---------------- Interactive Menu ---------------- #

def display_menu():
    print("\n" + "="*60)
    print("CENTRAL PARK SQUIRREL CENSUS - DATA CLEANING")
    print("="*60)
    print("1. Clean Squirrel Dataset only")
    print("2. Clean Hectare Dataset only")
    print("3. Clean Both Datasets")
    print("4. Merge Cleaned Datasets")
    print("5. View Dataset Information")
    print("6. Exit")
    print("="*60)

def view_dataset_info():
    print("\nDATASET INFORMATION")
    try:
        squirrel_df = pd.read_csv('2018_Central_Park_Squirrel_Census_-_Squirrel_Data_20250916.csv', sep=';')
        print(f"Squirrel Dataset: {squirrel_df.shape[0]} rows, {squirrel_df.shape[1]} columns")
    except:
        print("Squirrel Dataset: Not found")
    try:
        hectare_df = pd.read_csv('2018_Central_Park_Squirrel_Census_-_Hectare_Data_20250916.csv', sep=';')
        print(f"Hectare Dataset: {hectare_df.shape[0]} rows, {hectare_df.shape[1]} columns")
    except:
        print("Hectare Dataset: Not found")
    print("\nCleaning outputs will be saved to 'cleaned_data/' folder")
    input("\nPress Enter to continue...")

def get_user_choice():
    while True:
        choice = input("\nEnter your choice (1-6): ").strip()
        if choice in ['1','2','3','4','5','6']:
            return int(choice)
        print("Invalid choice. Enter a number between 1 and 6.")

def run_interactive_menu():
    while True:
        display_menu()
        choice = get_user_choice()
        if choice == 1:
            clean_squirrel_dataset()
            input("Press Enter to continue...")
        elif choice == 2:
            clean_hectare_dataset()
            input("Press Enter to continue...")
        elif choice == 3:
            main()
            input("Press Enter to continue...")
        elif choice == 4:
            merge_datasets()
            input("Press Enter to continue...")
        elif choice == 5:
            view_dataset_info()
        elif choice == 6:
            print("Goodbye!")
            break

if __name__ == "__main__":
    run_interactive_menu()
