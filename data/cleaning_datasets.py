import pandas as pd
import numpy as np
import re

def clean_squirrel_dataset():
    """Clean the squirrel dataset according to specifications."""
    print("\n" + "="*50)
    print("CLEANING SQUIRREL DATASET")
    print("="*50)

    # Load the Squirrel Dataset
    print("Loading Squirrel Dataset...")
    squirrel_df = pd.read_csv('2018_Central_Park_Squirrel_Census_-_Squirrel_Data_20250916.csv', sep=';')

    # Examine the dataset structure
    print(f"Dataset shape: {squirrel_df.shape}")
    print(f"Column names: {list(squirrel_df.columns)}")
    print("\nFirst few rows:")
    print(squirrel_df.head())
    print("\nData types:")
    print(squirrel_df.dtypes)
    print("\nMissing values per column:")
    print(squirrel_df.isnull().sum())

    # Step 1: Select only the required columns
    columns_to_keep = [
        'Hectare', 'Shift', 'Date', 'Age', 'Primary Fur Color', 
        'Running', 'Chasing', 'Climbing', 'Eating', 'Foraging', 
        'Kuks', 'Quaas', 'Tail flags', 'Tail twitches', 'Approaches', 
        'Indifferent', 'Runs from'
    ]

    print(f"\nStep 1: Selecting columns to keep: {columns_to_keep}")
    cleaned_squirrel_df = squirrel_df[columns_to_keep].copy()
    print(f"After column selection - Shape: {cleaned_squirrel_df.shape}")

    # Step 2: Handle missing values in Age column (replace with 'Unknown')
    print(f"\nStep 2: Handling missing values in Age column")
    print(f"Missing values in Age before: {cleaned_squirrel_df['Age'].isnull().sum()}")
    cleaned_squirrel_df['Age'] = cleaned_squirrel_df['Age'].fillna('Unknown')
    print(f"Missing values in Age after: {cleaned_squirrel_df['Age'].isnull().sum()}")

    # Step 3: Handle missing values in Primary Fur Color column (replace with 'Unknown')
    print(f"\nStep 3: Handling missing values in Primary Fur Color column")
    print(f"Missing values in Primary Fur Color before: {cleaned_squirrel_df['Primary Fur Color'].isnull().sum()}")
    cleaned_squirrel_df['Primary Fur Color'] = cleaned_squirrel_df['Primary Fur Color'].fillna('Unknown')
    print(f"Missing values in Primary Fur Color after: {cleaned_squirrel_df['Primary Fur Color'].isnull().sum()}")

    # Step 4: Handle behavioral columns - ensure they are properly encoded as NaN where missing
    # Note: Kuks, Quaas, Tail flags, Tail twitches should have NaN for missing values
    print(f"\nStep 4: Handling behavioral columns")
    behavioral_columns = ['Kuks', 'Quaas', 'Tail flags', 'Tail twitches']
    for col in behavioral_columns:
        missing_before = cleaned_squirrel_df[col].isnull().sum()
        print(f"Missing values in {col}: {missing_before} (keeping as NaN)")

    print(f"\nFinal cleaned dataset shape: {cleaned_squirrel_df.shape}")
    print(f"\nFinal missing values per column:")
    print(cleaned_squirrel_df.isnull().sum())

    # Step 5: Show summary of cleaned dataset
    print(f"\nSummary of cleaned Squirrel dataset:")
    print(f"- Total rows: {len(cleaned_squirrel_df)}")
    print(f"- Total columns: {len(cleaned_squirrel_df.columns)}")
    print(f"\nAge values: {cleaned_squirrel_df['Age'].value_counts()}")
    print(f"\nPrimary Fur Color values: {cleaned_squirrel_df['Primary Fur Color'].value_counts()}")

    # Step 6: Save the cleaned dataset
    output_filename = 'cleaned_squirrel_data.csv'
    cleaned_squirrel_df.to_csv(f'cleaned_data/{output_filename}', index=False)
    print(f"\nCleaned dataset saved as: {output_filename}")
    
    return cleaned_squirrel_df

def clean_hectare_dataset():
    """Clean the hectare dataset according to specifications."""
    print("\n" + "="*50)
    print("CLEANING HECTARE DATASET")
    print("="*50)

    # Load the Hectare Dataset
    print("\nLoading Hectare Dataset...")
    hectare_df = pd.read_csv('2018_Central_Park_Squirrel_Census_-_Hectare_Data_20250916.csv', sep=';')

    # Examine the dataset structure
    print(f"Dataset shape: {hectare_df.shape}")
    print(f"Column names: {list(hectare_df.columns)}")
    print("\nFirst few rows:")
    print(hectare_df.head())
    print("\nMissing values per column:")
    print(hectare_df.isnull().sum())

    # Step 1: Select only the required columns for hectare dataset
    hectare_columns_to_keep = [
        'Hectare', 'Shift', 'Date', 'Sighter Observed Weather Data', 
        'Other Animal Sightings', 'Hectare Conditions', 'Number of Squirrels'
    ]

    print(f"\nStep 1: Selecting columns to keep: {hectare_columns_to_keep}")
    cleaned_hectare_df = hectare_df[hectare_columns_to_keep].copy()
    print(f"After column selection - Shape: {cleaned_hectare_df.shape}")

    # Step 2: Transform Weather column
    print(f"\nStep 2: Transforming 'Sighter Observed Weather Data' to 'Weather'")
    print(f"Missing values in weather before: {cleaned_hectare_df['Sighter Observed Weather Data'].isnull().sum()}")

    # Function to extract temperature from weather data
    def extract_temperature(weather_str):
        if pd.isna(weather_str) or weather_str == '':
            return np.nan
        
        # Look for temperature patterns like "65º F", "70° F", "18º C", etc.
        temp_patterns = [
            r'(\d+)º?\s*F',  # Fahrenheit patterns
            r'(\d+)°\s*F',   # Alternative Fahrenheit pattern
            r'(\d+)º?\s*C',  # Celsius patterns  
            r'(\d+)°\s*C',   # Alternative Celsius pattern
            r'^(\d+)\s*$'    # Just numbers
        ]
        
        for pattern in temp_patterns:
            match = re.search(pattern, str(weather_str), re.IGNORECASE)
            if match:
                return float(match.group(1))
        
        return np.nan

    # Apply transformation
    cleaned_hectare_df['Weather'] = cleaned_hectare_df['Sighter Observed Weather Data'].apply(extract_temperature)
    cleaned_hectare_df = cleaned_hectare_df.drop('Sighter Observed Weather Data', axis=1)
    print(f"Missing values in Weather after transformation: {cleaned_hectare_df['Weather'].isnull().sum()}")

    # Step 3: Transform Other Animal Sightings to Dogs (binary)
    print(f"\nStep 3: Transforming 'Other Animal Sightings' to 'Dogs' (binary)")
    print(f"Missing values in Other Animal Sightings before: {cleaned_hectare_df['Other Animal Sightings'].isnull().sum()}")

    def extract_dogs(animal_str):
        if pd.isna(animal_str) or animal_str == '':
            return 0  # No mention means no dogs
        
        # Check if "Dog" or "Dogs" is mentioned (case insensitive)
        if re.search(r'\bdog(s)?\b', str(animal_str), re.IGNORECASE):
            return 1
        else:
            return 0

    # Apply transformation
    cleaned_hectare_df['Dogs'] = cleaned_hectare_df['Other Animal Sightings'].apply(extract_dogs)
    cleaned_hectare_df = cleaned_hectare_df.drop('Other Animal Sightings', axis=1)
    print(f"Dogs column created - Values distribution:")
    print(cleaned_hectare_df['Dogs'].value_counts())

    # Step 4: Handle Hectare Conditions
    print(f"\nStep 4: Handling 'Hectare Conditions'")
    print(f"Missing values in Hectare Conditions before: {cleaned_hectare_df['Hectare Conditions'].isnull().sum()}")
    # Keep as-is, missing values are already NaN
    print(f"Missing values in Hectare Conditions after: {cleaned_hectare_df['Hectare Conditions'].isnull().sum()}")

    # Step 5: Fill NaN Weather values with date-based averages
    print(f"\nStep 5: Filling NaN Weather values with date-based averages")
    print(f"Missing values in Weather before imputation: {cleaned_hectare_df['Weather'].isnull().sum()}")
    
    # Strategy: For missing weather values, use date-based average (ignoring hectare)
    # 1. Average of the same date across all hectares
    # 2. Overall average as fallback
    
    # Calculate averages
    date_avg = cleaned_hectare_df.groupby('Date')['Weather'].mean()
    overall_avg = cleaned_hectare_df['Weather'].mean()
    
    # Fill NaN values using date-based average priority
    def fill_weather_with_hierarchy(row):
        if pd.isna(row['Weather']):
            # Try date average first (this is what you want!)
            if row['Date'] in date_avg and not pd.isna(date_avg[row['Date']]):
                return round(date_avg[row['Date']], 1)
            
            # Use overall average as fallback
            else:
                return round(overall_avg, 1) if not pd.isna(overall_avg) else np.nan
        else:
            # Round existing values to 1 decimal place
            return round(row['Weather'], 1)
    
    cleaned_hectare_df['Weather'] = cleaned_hectare_df.apply(fill_weather_with_hierarchy, axis=1)
    print(f"Missing values in Weather after date-based imputation: {cleaned_hectare_df['Weather'].isnull().sum()}")
    
    # Show some examples of the averages used
    print(f"\nImputation strategy summary:")
    print(f"� Dates with weather data: {len(date_avg.dropna())}")
    print(f"�️  Overall average temperature: {round(overall_avg, 1):.1f}°F")
    print(f"� Date-based averages calculated:")
    for date in sorted(date_avg.index):
        if not pd.isna(date_avg[date]):
            print(f"   Date {date}: {round(date_avg[date], 1):.1f}°F")

    print(f"\nFinal cleaned hectare dataset shape: {cleaned_hectare_df.shape}")
    print(f"\nFinal missing values per column:")
    print(cleaned_hectare_df.isnull().sum())

    # Step 6: Show summary of cleaned hectare dataset
    print(f"\nSummary of cleaned Hectare dataset:")
    print(f"- Total rows: {len(cleaned_hectare_df)}")
    print(f"- Total columns: {len(cleaned_hectare_df.columns)}")
    print(f"\nWeather (temperature) statistics after imputation:")
    print(cleaned_hectare_df['Weather'].describe())
    print(f"\nDogs distribution: {cleaned_hectare_df['Dogs'].value_counts()}")
    print(f"\nHectare Conditions values: {cleaned_hectare_df['Hectare Conditions'].value_counts()}")

    # Step 7: Save the cleaned hectare dataset
    hectare_output_filename = 'cleaned_hectare_data.csv'
    cleaned_hectare_df.to_csv(f'cleaned_data/{hectare_output_filename}', index=False)
    print(f"\nCleaned hectare dataset saved as: {hectare_output_filename}")

    return cleaned_hectare_df

def main():
    """Main function to run both cleaning processes."""
    print("="*60)
    print("CENTRAL PARK SQUIRREL CENSUS - DATA CLEANING")
    print("="*60)
    
    # Clean both datasets
    squirrel_data = clean_squirrel_dataset()
    hectare_data = clean_hectare_dataset()
    
    print(f"\n" + "="*60)
    print("CLEANING COMPLETE!")
    print("="*60)
    print(f"✅ Squirrel dataset: {squirrel_data.shape[0]} rows, {squirrel_data.shape[1]} columns")
    print(f"✅ Hectare dataset: {hectare_data.shape[0]} rows, {hectare_data.shape[1]} columns")
    print(f"📁 Files saved in 'cleaned_data/' folder")
    
    return squirrel_data, hectare_data

def merge_datasets():
    """Merge cleaned squirrel and hectare datasets using Hectare as the key."""
    print("\n" + "="*60)
    print("MERGING SQUIRREL AND HECTARE DATASETS")
    print("="*60)
    
    # Load the cleaned datasets
    print("Loading cleaned datasets...")
    try:
        squirrel_df = pd.read_csv('cleaned_data/cleaned_squirrel_data.csv')
        hectare_df = pd.read_csv('cleaned_data/cleaned_hectare_data.csv')
        
        print(f"📊 Squirrel dataset loaded: {squirrel_df.shape[0]} rows, {squirrel_df.shape[1]} columns")
        print(f"📊 Hectare dataset loaded: {hectare_df.shape[0]} rows, {hectare_df.shape[1]} columns")
        
    except FileNotFoundError as e:
        print(f"❌ Error: Cleaned datasets not found. Please clean the datasets first.")
        print(f"Missing file: {e}")
        return None
    
    # Display merge key information
    print(f"\nMerge Key Analysis:")
    print(f"🔑 Using ['Hectare', 'Shift'] as composite key for joining datasets")
    
    # Check unique hectare+shift combinations in both datasets
    squirrel_keys = set(zip(squirrel_df['Hectare'], squirrel_df['Shift']))
    hectare_keys = set(zip(hectare_df['Hectare'], hectare_df['Shift']))
    
    print(f"📍 Unique hectare+shift combinations in squirrel dataset: {len(squirrel_keys)}")
    print(f"📍 Unique hectare+shift combinations in hectare dataset: {len(hectare_keys)}")
    print(f"🔗 Common hectare+shift combinations: {len(squirrel_keys.intersection(hectare_keys))}")
    print(f"🐿️  Squirrel-only combinations: {len(squirrel_keys - hectare_keys)}")
    print(f"🌳 Hectare-only combinations: {len(hectare_keys - squirrel_keys)}")
    
    # Perform the merge - left join to keep all squirrel observations
    print(f"\nPerforming left join on ['Hectare', 'Shift'] columns...")
    print(f"💡 This will keep all squirrel observations and add hectare information where available")
    
    merged_df = squirrel_df.merge(
        hectare_df, 
        on=['Hectare', 'Shift'], 
        how='left', 
        suffixes=('_squirrel', '_hectare')
    )
    
    print(f"✅ Merge completed!")
    print(f"📊 Combined dataset: {merged_df.shape[0]} rows, {merged_df.shape[1]} columns")
    
    # Handle duplicate columns (Date may appear in both datasets, but Hectare and Shift are now join keys)
    print(f"\nHandling duplicate columns...")
    
    # Since we joined on ['Hectare', 'Shift'], these columns should not have duplicates
    # Only check for Date duplicates
    if 'Date_squirrel' in merged_df.columns and 'Date_hectare' in merged_df.columns:
        print(f"🔄 Resolving Date column duplicates...")
        # Use squirrel dataset's date as primary, fill missing with hectare data  
        merged_df['Date'] = merged_df['Date_squirrel'].fillna(merged_df['Date_hectare'])
        merged_df.drop(['Date_squirrel', 'Date_hectare'], axis=1, inplace=True)
    else:
        print(f"✅ No duplicate columns found (Hectare and Shift were used as join keys)")
    
    # Reorder columns for better readability
    print(f"📋 Reordering columns for better organization...")
    
    # Define column order: location info, temporal info, squirrel details, hectare details
    column_order = []
    
    # Location and temporal columns first
    base_columns = ['Hectare', 'Shift', 'Date']
    for col in base_columns:
        if col in merged_df.columns:
            column_order.append(col)
    
    # Squirrel-specific columns
    squirrel_columns = ['Age', 'Primary Fur Color', 'Running', 'Chasing', 'Climbing', 
                       'Eating', 'Foraging', 'Kuks', 'Quaas', 'Tail flags', 
                       'Tail twitches', 'Approaches', 'Indifferent', 'Runs from']
    for col in squirrel_columns:
        if col in merged_df.columns:
            column_order.append(col)
    
    # Hectare-specific columns  
    hectare_columns = ['Hectare Conditions', 'Number of Squirrels', 'Weather', 'Dogs']
    for col in hectare_columns:
        if col in merged_df.columns:
            column_order.append(col)
    
    # Reorder the dataframe
    merged_df = merged_df[column_order]
    
    # Display summary statistics
    print(f"\n" + "="*50)
    print("MERGED DATASET SUMMARY")
    print("="*50)
    print(f"📊 Final shape: {merged_df.shape[0]} rows × {merged_df.shape[1]} columns")
    print(f"\nColumn breakdown:")
    print(f"🔹 Location/Temporal: Hectare, Shift, Date")  
    print(f"🐿️  Squirrel behavioral: {len(squirrel_columns)} columns")
    print(f"🌳 Hectare environmental: {len(hectare_columns)} columns")
    
    print(f"\nMissing values in key columns:")
    key_columns = ['Weather', 'Dogs', 'Hectare Conditions', 'Number of Squirrels']
    for col in key_columns:
        if col in merged_df.columns:
            missing_count = merged_df[col].isnull().sum()
            missing_pct = (missing_count / len(merged_df)) * 100
            print(f"📈 {col}: {missing_count:,} ({missing_pct:.1f}%)")
    
    # Save the merged dataset with semicolon delimiter
    import os
    os.makedirs('cleaned_data', exist_ok=True)
    output_file = 'cleaned_data/merged_squirrel_hectare_data.csv'
    merged_df.to_csv(output_file, index=False, sep=';')
    print(f"\n💾 Merged dataset saved as: {output_file} (with semicolon delimiters)")
    
    # Display basic analysis
    print(f"\n� MERGE SUMMARY")
    print("="*50)
    hectare_counts = merged_df.groupby('Hectare').size().sort_values(ascending=False)
    print(f"📊 Total unique hectares: {len(hectare_counts)}")
    print(f"🔝 Top 5 hectares by observations:")
    print(hectare_counts.head(5))
    
    # Display sample of merged data
    print(f"\nSample of merged dataset:")
    print(merged_df.head(3))
    
    return merged_df

def display_menu():
    """Display the main menu options."""
    print("\n" + "="*60)
    print("CENTRAL PARK SQUIRREL CENSUS - DATA CLEANING")
    print("="*60)
    print("Choose what you want to do:")
    print("1. Clean Squirrel Dataset only")
    print("2. Clean Hectare Dataset only") 
    print("3. Clean Both Datasets")
    print("4. Merge Cleaned Datasets")
    print("5. View Dataset Information")
    print("6. Exit")
    print("="*60)

def view_dataset_info():
    """Display information about the available datasets."""
    print("\n" + "="*50)
    print("DATASET INFORMATION")
    print("="*50)
    
    # Check squirrel dataset
    try:
        squirrel_df = pd.read_csv('2018_Central_Park_Squirrel_Census_-_Squirrel_Data_20250916.csv', sep=';')
        print(f"🐿️  Squirrel Dataset:")
        print(f"   - Rows: {squirrel_df.shape[0]:,}")
        print(f"   - Columns: {squirrel_df.shape[1]}")
        print(f"   - File: 2018_Central_Park_Squirrel_Census_-_Squirrel_Data_20250916.csv")
    except FileNotFoundError:
        print("🐿️  Squirrel Dataset: File not found")
    
    # Check hectare dataset
    try:
        hectare_df = pd.read_csv('2018_Central_Park_Squirrel_Census_-_Hectare_Data_20250916.csv', sep=';')
        print(f"🌳 Hectare Dataset:")
        print(f"   - Rows: {hectare_df.shape[0]:,}")
        print(f"   - Columns: {hectare_df.shape[1]}")
        print(f"   - File: 2018_Central_Park_Squirrel_Census_-_Hectare_Data_20250916.csv")
    except FileNotFoundError:
        print("🌳 Hectare Dataset: File not found")
    
    print("\nCleaning outputs will be saved to 'cleaned_data/' folder")
    input("\nPress Enter to continue...")

def get_user_choice():
    """Get and validate user's menu choice."""
    while True:
        try:
            choice = input("\nEnter your choice (1-6): ").strip()
            if choice in ['1', '2', '3', '4', '5', '6']:
                return int(choice)
            else:
                print("❌ Invalid choice. Please enter a number between 1 and 6.")
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            return 6
        except Exception as e:
            print(f"❌ Error: {e}. Please try again.")

def run_interactive_menu():
    """Run the interactive terminal menu."""
    while True:
        display_menu()
        choice = get_user_choice()
        
        if choice == 1:
            print("\n🐿️  Starting Squirrel Dataset cleaning...")
            try:
                squirrel_df = clean_squirrel_dataset()
                print(f"\n✅ Squirrel dataset cleaning complete!")
                print(f"📊 Final dataset: {squirrel_df.shape[0]} rows, {squirrel_df.shape[1]} columns")
            except Exception as e:
                print(f"❌ Error cleaning squirrel dataset: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == 2:
            print("\n🌳 Starting Hectare Dataset cleaning...")
            try:
                hectare_df = clean_hectare_dataset()
                print(f"\n✅ Hectare dataset cleaning complete!")
                print(f"📊 Final dataset: {hectare_df.shape[0]} rows, {hectare_df.shape[1]} columns")
            except Exception as e:
                print(f"❌ Error cleaning hectare dataset: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == 3:
            print("\n🔄 Starting Both Datasets cleaning...")
            try:
                squirrel_df, hectare_df = main()
                print(f"\n✅ Both datasets cleaning complete!")
            except Exception as e:
                print(f"❌ Error cleaning datasets: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == 4:
            print("\n🔗 Starting Dataset Merge...")
            try:
                merged_df = merge_datasets()
                if merged_df is not None:
                    print(f"\n✅ Dataset merge complete!")
            except Exception as e:
                print(f"❌ Error merging datasets: {e}")
            input("\nPress Enter to continue...")
            
        elif choice == 5:
            view_dataset_info()
            
        elif choice == 6:
            print("\n👋 Thank you for using the Central Park Squirrel Census Data Cleaner!")
            print("🐿️  Happy analyzing!")
            break

if __name__ == "__main__":
    run_interactive_menu()

