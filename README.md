 Solubility Prediction Web App 🌟

This is a full-stack web application for predicting the **log solubility** of chemical compounds based on molecular descriptors. The project leverages **React** for the frontend, **Node.js** (Express) for the backend, and **Python** for the machine learning model.

---

## 🚀 Features

✅ Upload a CSV file with molecular descriptors  
✅ Predict log solubility using a pretrained ML model  
✅ View predictions in a structured table  
✅ Secure & robust backend for prediction requests  

---

## 🛠️ Tech Stack

**Frontend:**  
- React (Vite)  
- Axios for API calls  
- Tailwind CSS (optional, for styling)  

**Backend:**  
- Node.js (Express)  
- Python (with scikit-learn and RDKit for prediction)  

**Model:**  
- Random Forest Regressor trained on molecular descriptor data  

---

## 📁 Project Structure

```plaintext
solubility-app/
├── frontend/         # React app
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/          # Node.js API
│   ├── index.js
│   ├── package.json
│   ├── predict.py
│   └── random_forest_model.pkl
├── README.md         # Project documentation
└── .gitignore
````

---

## ⚡️ Quick Start

1️⃣ Clone the repo

```bash
git clone https://github.com/yourusername/solubility-app.git
cd solubility-app
```

2️⃣ Setup the Python environment

```bash
cd backend
# (Use conda or virtualenv)
pip install -r requirements.txt
```

3️⃣ Start the backend server

```bash
node index.js
# By default, runs on http://localhost:5000
```
4️⃣ Start the frontend

bash
cd ../frontend
npm install
npm run dev
# By default, runs on http://localhost:5173


📝 Example Prediction

The backend expects a CSV with columns like:

csv
SMILES,MolWt,LogP,NumRotatableBonds,NumHDonors,NumHAcceptors,AromaticProportion,TPSA
Cc1cccc(C)c1NC(=O)c2cc(c(Cl)cc2O)S(N)(=O)=O,354.815,2.56214,3,3,4,0.521739,109.49


The prediction output will be:

```json
[
  {
    "SMILES": "Cc1cccc(C)c1NC(=O)c2cc(c(Cl)cc2O)S(N)(=O)=O",
    "MolWt": 354.815,
    "LogP": 2.56214,
    "NumRotatableBonds": 3,
    "NumHDonors": 3,
    "NumHAcceptors": 4,
    "AromaticProportion": 0.521739,
    "TPSA": 109.49,
    "Predicted_log_solubility_mol_per_L": -3.82674
  },
  ...
]
```

⚙️ Improvements & Ideas

* Add visualization (e.g., plot solubility predictions)
* Better error handling & input validation
* Retrain model on larger dataset for better predictions
* Use Docker for deployment
* Add CI/CD for automated testing & deployment
