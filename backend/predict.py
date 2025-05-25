# predict.py
import pandas as pd
from rdkit import Chem
from rdkit.Chem import Descriptors
import joblib
import sys
import json
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_aromatic_proportion(mol):
    """Calculate the proportion of aromatic atoms in a molecule."""
    try:
        aromatic_atoms = sum([1 for atom in mol.GetAtoms() if atom.GetIsAromatic()])
        heavy_atoms = Descriptors.HeavyAtomCount(mol)
        return aromatic_atoms / heavy_atoms if heavy_atoms > 0 else 0
    except Exception as e:
        logger.warning(f"Error calculating aromatic proportion: {e}")
        return None

def calculate_descriptors(smiles_list):
    """Calculate molecular descriptors for a list of SMILES strings."""
    descriptors_data = {
        'MolWt': [],
        'LogP': [],
        'NumRotatableBonds': [],
        'NumHDonors': [],
        'NumHAcceptors': [],
        'AromaticProportion': []
    }
    
    valid_indices = []
    
    for idx, smiles in enumerate(smiles_list):
        try:
            if pd.isna(smiles) or not smiles.strip():
                logger.warning(f"Empty or NaN SMILES at index {idx}")
                continue
                
            mol = Chem.MolFromSmiles(smiles.strip())
            
            if mol is None:
                logger.warning(f"Invalid SMILES at index {idx}: {smiles}")
                continue
            
            # Calculate descriptors
            descriptors_data['MolWt'].append(Descriptors.MolWt(mol))
            descriptors_data['LogP'].append(Descriptors.MolLogP(mol))
            descriptors_data['NumRotatableBonds'].append(Descriptors.NumRotatableBonds(mol))
            descriptors_data['NumHDonors'].append(Descriptors.NumHDonors(mol))
            descriptors_data['NumHAcceptors'].append(Descriptors.NumHAcceptors(mol))
            descriptors_data['AromaticProportion'].append(get_aromatic_proportion(mol))
            
            valid_indices.append(idx)
            
        except Exception as e:
            logger.error(f"Error processing SMILES at index {idx} ({smiles}): {e}")
            continue
    
    if not valid_indices:
        raise ValueError("No valid SMILES strings found in input")
    
    descriptors_df = pd.DataFrame(descriptors_data)
    descriptors_df.index = valid_indices
    
    # Remove rows with any NaN values
    initial_count = len(descriptors_df)
    descriptors_df = descriptors_df.dropna()
    final_count = len(descriptors_df)
    
    if final_count < initial_count:
        logger.info(f"Removed {initial_count - final_count} rows due to calculation errors")
    
    return descriptors_df

def load_models():
    """Load the trained model and scaler."""
    try:
        model_path = 'random_forest_model.pkl'
        scaler_path = 'scaler.pkl'
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        logger.info("Successfully loaded model and scaler")
        return model, scaler
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        raise

def main():
    try:
        # Validate command line arguments
        if len(sys.argv) != 2:
            raise ValueError("Usage: python predict.py <input_csv_file>")
        
        input_file = sys.argv[1]
        
        # Validate input file
        if not os.path.exists(input_file):
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        logger.info(f"Processing input file: {input_file}")
        
        # Read input CSV
        try:
            input_df = pd.read_csv(input_file)
        except Exception as e:
            raise ValueError(f"Error reading CSV file: {e}")
        
        # Validate CSV structure
        if 'SMILES' not in input_df.columns:
            raise ValueError("Input CSV must contain a 'SMILES' column")
        
        if len(input_df) == 0:
            raise ValueError("Input CSV is empty")
        
        logger.info(f"Loaded {len(input_df)} rows from input file")
        
        # Calculate molecular descriptors
        smiles_list = input_df['SMILES']
        descriptors_df = calculate_descriptors(smiles_list)
        
        if len(descriptors_df) == 0:
            raise ValueError("No valid molecular descriptors could be calculated")
        
        logger.info(f"Calculated descriptors for {len(descriptors_df)} molecules")
        
        # Load models
        model, scaler = load_models()
        
        # Scale features and make predictions
        try:
            X_scaled = scaler.transform(descriptors_df)
            predictions = model.predict(X_scaled)
        except Exception as e:
            raise ValueError(f"Error during prediction: {e}")
        
        # Prepare results
        result_df = input_df.loc[descriptors_df.index].copy()
        result_df['Predicted_log_solubility_mol_per_L'] = predictions
        
        # Convert to JSON and output
        result_json = result_df.to_json(orient='records', double_precision=6)
        print(result_json)
        
        logger.info(f"Successfully predicted solubility for {len(result_df)} molecules")
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        error_response = {
            "error": str(e),
            "type": type(e).__name__
        }
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    main()