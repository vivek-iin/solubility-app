import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showStructures, setShowStructures] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError('');
    setSuccess('');
    setPredictions([]);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a CSV file first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      // Handle different possible response structures
      let predictionsArray;
      if (Array.isArray(data)) {
        predictionsArray = data;
      } else if (data.predictions && Array.isArray(data.predictions)) {
        predictionsArray = data.predictions;
      } else if (data.results && Array.isArray(data.results)) {
        predictionsArray = data.results;
      } else {
        // If it's an object, try to convert it to an array
        predictionsArray = Object.values(data);
      }
      
      setPredictions(predictionsArray);
      setSuccess('Successfully predicted solubility for ' + predictionsArray.length + ' molecules');
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get predictions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Component to display molecular structure
  const MoleculeStructure = ({ smiles, index }) => {
    const [imageError, setImageError] = useState(false);
    
    if (!smiles || smiles === 'N/A' || imageError) {
      return (
        <div className="w-48 h-32 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
          <span className="text-gray-500 text-sm">Structure not available</span>
        </div>
      );
    }

    // Using PubChem REST API for structure visualization
    const structureUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=200x150`;
    
    return (
      <div className="w-48 h-32 border border-gray-300 rounded overflow-hidden bg-white">
        <img 
          src={structureUrl}
          alt={`Molecular structure for ${smiles}`}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  };

  const getSolubilityCategory = (logSolubility) => {
    if (logSolubility >= -1) {
      return {
        category: 'Highly Soluble',
        color: 'text-green-600 bg-green-50'
      };
    } else if (logSolubility >= -3) {
      return {
        category: 'Moderately Soluble',
        color: 'text-yellow-600 bg-yellow-50'
      };
    } else if (logSolubility >= -5) {
      return {
        category: 'Poorly Soluble',
        color: 'text-orange-600 bg-orange-50'
      };
    } else {
      return {
        category: 'Very Poorly Soluble',
        color: 'text-red-600 bg-red-50'
      };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Solubility Prediction App</h1>
          </div>
          
          <p className="text-gray-600 mb-8">
            Upload a CSV file containing SMILES strings to predict molecular solubility values.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {file ? file.name : 'Click to upload CSV file'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !file}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Predict Solubility'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-green-700">{success}</p>
            </div>
          )}
        </div>

        {predictions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Prediction Results</h2>
              <button
                onClick={() => setShowStructures(!showStructures)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {showStructures ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showStructures ? 'Hide Structures' : 'Show Structures'}
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">
                <strong>Debug Info:</strong> Found {predictions.length} predictions. 
                First item structure: {JSON.stringify(predictions[0], null, 2)}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-indigo-50">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Index
                    </th>
                    {showStructures && (
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                        Structure
                      </th>
                    )}
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      SMILES
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Predicted log(solubility:mol/L)
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      Solubility Category
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((prediction, idx) => {
                    // Handle different possible data structures
                    const smiles = prediction.SMILES || prediction.smiles || prediction.molecule || 'N/A';
                    
                    // Fixed: Check for the correct field name from your Python script
                    const logSolubility = prediction['Predicted_log_solubility_mol_per_L'] || 
                                        prediction['Predicted log(solubility:mol/L)'] || 
                                        prediction.prediction || 
                                        prediction.solubility || 
                                        prediction.value || 0;
                    
                    const solubilityInfo = getSolubilityCategory(logSolubility);

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="border border-gray-300 px-4 py-3 text-sm">
                          {idx + 1}
                        </td>
                        {showStructures && (
                          <td className="border border-gray-300 px-4 py-3">
                            <MoleculeStructure smiles={smiles} index={idx} />
                          </td>
                        )}
                        <td className="border border-gray-300 px-4 py-3 text-sm font-mono">
                          <div className="max-w-xs break-all">
                            {smiles}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm font-semibold">
                          {typeof logSolubility === 'number' ? logSolubility.toFixed(3) : logSolubility}
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <span className={'px-2 py-1 rounded-full text-xs font-medium ' + solubilityInfo.color}>
                            {solubilityInfo.category}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p className="font-semibold mb-2">Solubility Categories:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>
                  <span>Highly Soluble (≥ -1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></span>
                  <span>Moderately Soluble (-1 to -3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></span>
                  <span>Poorly Soluble (-3 to -5)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
                  <span>Very Poorly Soluble (&lt; -5)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;