#!/usr/bin/env python3
"""
Script to generate test Excel files for importing medical devices, diagnostic devices,
accessories, and spare parts into the Espace irissystem.
"""

import pandas as pd
import random
from datetime import datetime, timedelta
import os

# Configuration
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
STOCK_LOCATION = "bureau pricipale"  # Default stock location for all items (matches DB)

# Medical device models (Yuwell brand)
YUWELL_MODELS = {
    "CPAP": ["YH-450", "YH-550", "YH-560", "YH-580", "YH-660"],
    "VNI": ["YH-720ST", "YH-730", "YH-825", "YH-830"],
    "Concentrateur O²": ["YU300", "YU500", "7F-3", "7F-5", "7F-8", "7F-10"],
    "Vi": ["YH-450V", "YH-550V"],
    "Bouteil O²": ["BO-5L", "BO-10L", "BO-15L", "BO-20L"]
}

# Diagnostic device brands and models
DIAGNOSTIC_BRANDS = ["Omron", "Beurer", "Philips", "Medtronic", "GE Healthcare"]
DIAGNOSTIC_TYPES = {
    "Tensiomètre": ["M3", "M7", "X7", "BM 58", "HEM-7361T"],
    "Oxymètre": ["PO30", "PO60", "PO80", "OXY-100", "OXY-200"],
    "Glucomètre": ["GL44", "GL50", "GL50 evo", "Contour Plus", "OneTouch"],
    "Thermomètre": ["FT90", "FT95", "TH-100", "TH-200", "Digital Pro"],
    "ECG": ["ECG-100", "ECG-200", "ECG-300", "CardioTouch", "HeartView"]
}

# Accessory types and brands
ACCESSORY_TYPES = {
    "Masque CPAP": ["Nasal", "Facial", "Narinaire"],
    "Circuit Patient": ["Standard", "Chauffant", "Antibactérien"],
    "Filtre": ["Standard", "Antibactérien", "HEPA"],
    "Humidificateur": ["H4i", "H5i", "HumidAir"],
    "Batterie": ["12V", "24V", "Portable"],
    "Câble": ["Alimentation", "USB", "Données"],
    "Sac de Transport": ["Standard", "Premium", "Compact"]
}

ACCESSORY_BRANDS = ["ResMed", "Philips", "Fisher & Paykel", "DeVilbiss", "Yuwell"]

# Spare part types
SPARE_PART_CATEGORIES = {
    "Moteur": ["Turbine", "Compresseur", "Ventilateur"],
    "Carte Électronique": ["Carte Mère", "Carte Alimentation", "Carte Contrôle"],
    "Capteur": ["Pression", "Débit", "Température", "O2"],
    "Valve": ["Expiratoire", "Inspiratoire", "Sécurité"],
    "Joint": ["Torique", "Plat", "Conique"],
    "Connecteur": ["Électrique", "Pneumatique", "USB"],
    "Écran": ["LCD", "LED", "Tactile"],
    "Bouton": ["Power", "Navigation", "Urgence"]
}

SPARE_PART_BRANDS = ["Generic", "OEM", "Yuwell", "Philips", "ResMed"]

def generate_serial_number(prefix, index):
    """Generate a unique serial number"""
    year = datetime.now().year
    return f"{prefix}{year}{index:05d}"

def generate_medical_devices(count=100):
    """Generate medical devices data"""
    devices = []
    
    for i in range(count):
        device_type = random.choice(list(YUWELL_MODELS.keys()))
        model = random.choice(YUWELL_MODELS[device_type])
        
        # Calculate prices based on device type
        base_prices = {
            "CPAP": (800, 1200, 50),  # (purchase, selling, rental)
            "VNI": (1500, 2200, 80),
            "Concentrateur O²": (1000, 1500, 60),
            "Vi": (2000, 2800, 100),
            "Bouteil O²": (200, 350, 20)
        }
        
        purchase_base, selling_base, rental_base = base_prices[device_type]
        
        device = {
            "Nom": device_type,
            "Type": "MEDICAL_DEVICE",
            "Marque": "Yuwell",
            "Modèle": model,
            "Numéro de Série": generate_serial_number("YW", i),
            "Emplacement de Stock": STOCK_LOCATION,
            "Quantité en Stock": random.randint(1, 5),
            "Prix d'Achat": purchase_base + random.randint(-100, 200),
            "Prix de Vente": selling_base + random.randint(-100, 300),
            "Prix de Location": rental_base + random.randint(-10, 20),
            "Spécifications Techniques": f"Appareil médical {device_type} - Modèle {model}",
            "Configuration": f"Config standard {model}",
            "Statut": random.choice(["ACTIVE", "ACTIVE", "ACTIVE", "MAINTENANCE"]),  # Mostly active
            "Destination": random.choice(["FOR_RENT", "FOR_SALE"]),
            "Nécessite Maintenance": random.choice(["true", "false"])
        }
        devices.append(device)
    
    return pd.DataFrame(devices)

def generate_diagnostic_devices(count=100):
    """Generate diagnostic devices data"""
    devices = []
    
    for i in range(count):
        device_type = random.choice(list(DIAGNOSTIC_TYPES.keys()))
        brand = random.choice(DIAGNOSTIC_BRANDS)
        models = DIAGNOSTIC_TYPES[device_type]
        model = random.choice(models)
        
        # Calculate prices based on device type
        base_prices = {
            "Tensiomètre": (50, 80),
            "Oxymètre": (30, 50),
            "Glucomètre": (40, 65),
            "Thermomètre": (20, 35),
            "ECG": (500, 750)
        }
        
        purchase_base, selling_base = base_prices[device_type]
        
        # Generate parameters based on device type
        parameters = []
        if device_type == "Tensiomètre":
            parameters = [
                {"name": "Pression Systolique", "unit": "mmHg", "min": 60, "max": 200},
                {"name": "Pression Diastolique", "unit": "mmHg", "min": 40, "max": 130},
                {"name": "Fréquence Cardiaque", "unit": "bpm", "min": 40, "max": 180}
            ]
        elif device_type == "Oxymètre":
            parameters = [
                {"name": "SpO2", "unit": "%", "min": 70, "max": 100},
                {"name": "Pouls", "unit": "bpm", "min": 40, "max": 200}
            ]
        elif device_type == "Glucomètre":
            parameters = [
                {"name": "Glycémie", "unit": "mg/dL", "min": 20, "max": 600}
            ]
        elif device_type == "Thermomètre":
            parameters = [
                {"name": "Température", "unit": "°C", "min": 34, "max": 42}
            ]
        elif device_type == "ECG":
            parameters = [
                {"name": "Fréquence Cardiaque", "unit": "bpm", "min": 30, "max": 250},
                {"name": "Intervalle PR", "unit": "ms", "min": 120, "max": 200},
                {"name": "QRS", "unit": "ms", "min": 60, "max": 120},
                {"name": "QT", "unit": "ms", "min": 350, "max": 450}
            ]
        
        device = {
            "Nom": device_type,
            "Type": "DIAGNOSTIC_DEVICE",
            "Marque": brand,
            "Modèle": model,
            "Numéro de Série": generate_serial_number(brand[:2].upper(), i),
            "Emplacement de Stock": STOCK_LOCATION,
            "Prix d'Achat": purchase_base + random.randint(-10, 20),
            "Prix de Vente": selling_base + random.randint(-10, 30),
            "Spécifications Techniques": f"Appareil de diagnostic {device_type} - {brand} {model}",
            "Configuration": f"Config {model}",
            "Statut": "ACTIVE",
            "Paramètres": str(parameters) if parameters else ""
        }
        devices.append(device)
    
    return pd.DataFrame(devices)

def generate_accessories(count=200):
    """Generate accessories data with different quantities"""
    accessories = []
    
    for i in range(count):
        accessory_type = random.choice(list(ACCESSORY_TYPES.keys()))
        sub_type = random.choice(ACCESSORY_TYPES[accessory_type])
        brand = random.choice(ACCESSORY_BRANDS)
        
        # Price ranges based on accessory type
        price_ranges = {
            "Masque CPAP": (30, 80),
            "Circuit Patient": (15, 40),
            "Filtre": (5, 20),
            "Humidificateur": (50, 120),
            "Batterie": (80, 200),
            "Câble": (10, 30),
            "Sac de Transport": (25, 60)
        }
        
        purchase_base, selling_base = price_ranges[accessory_type]
        
        # Generate varied quantities
        quantity = random.choices(
            [random.randint(5, 20), random.randint(21, 50), random.randint(51, 100), random.randint(101, 200)],
            weights=[0.4, 0.3, 0.2, 0.1]  # More items with lower quantities
        )[0]
        
        accessory = {
            "Nom": f"{accessory_type} {sub_type}",
            "Marque": brand,
            "Modèle": f"{brand[:3]}-{sub_type[:3]}-{i:03d}",
            "Lieu de Stockage": STOCK_LOCATION,
            "Quantité en Stock": quantity,
            "Prix d'Achat": max(1, purchase_base + random.randint(-5, 10)),  # Ensure minimum price of 1
            "Prix de Vente": max(2, selling_base + random.randint(-5, 15)),  # Ensure minimum price of 2
            "Fin de Garantie": f"2025-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "Statut": "FOR_SALE"  # Changed to match valid status values
        }
        accessories.append(accessory)
    
    return pd.DataFrame(accessories)

def generate_spare_parts(count=300):
    """Generate spare parts data with different quantities"""
    spare_parts = []
    
    for i in range(count):
        part_category = random.choice(list(SPARE_PART_CATEGORIES.keys()))
        part_type = random.choice(SPARE_PART_CATEGORIES[part_category])
        brand = random.choice(SPARE_PART_BRANDS)
        
        # Price ranges based on part category
        price_ranges = {
            "Moteur": (100, 300),
            "Carte Électronique": (80, 250),
            "Capteur": (30, 100),
            "Valve": (20, 60),
            "Joint": (2, 10),
            "Connecteur": (5, 25),
            "Écran": (50, 150),
            "Bouton": (3, 15)
        }
        
        purchase_base, selling_base = price_ranges[part_category]
        
        # Generate varied quantities with more variation for spare parts
        quantity = random.choices(
            [random.randint(10, 30), random.randint(31, 60), random.randint(61, 100), random.randint(101, 250), random.randint(251, 500)],
            weights=[0.3, 0.3, 0.2, 0.15, 0.05]  # Distribution favoring moderate quantities
        )[0]
        
        # Compatible devices
        compatible_devices = random.sample(list(YUWELL_MODELS.keys()), k=random.randint(1, 3))
        
        spare_part = {
            "Nom": f"{part_category} - {part_type}",
            "Marque": brand,
            "Modèle": f"{brand[:3]}{part_category[:3]}{i:04d}",
            "Lieu de Stockage": STOCK_LOCATION,
            "Quantité en Stock": quantity,
            "Prix d'Achat": max(1, purchase_base + random.randint(-10, 20)),  # Ensure minimum price of 1
            "Prix de Vente": max(2, selling_base + random.randint(-10, 30)),  # Ensure minimum price of 2
            "Garantie": f"{random.randint(6, 24)} mois",
            "Statut": "FOR_SALE"  # Changed to match valid status values
        }
        spare_parts.append(spare_part)
    
    return pd.DataFrame(spare_parts)

def main():
    """Main function to generate all Excel files"""
    print("Génération des fichiers Excel de test pour l'importation...")
    print(f"Répertoire de sortie: {OUTPUT_DIR}")
    
    # Generate medical devices
    print("\n1. Génération de 100 appareils médicaux (Marque: Yuwell)...")
    medical_devices_df = generate_medical_devices(100)
    medical_devices_file = os.path.join(OUTPUT_DIR, "import_medical_devices_yuwell.xlsx")
    medical_devices_df.to_excel(medical_devices_file, index=False, engine='openpyxl')
    print(f"   ✓ Fichier créé: {medical_devices_file}")
    print(f"   - Nombre d'appareils: {len(medical_devices_df)}")
    print(f"   - Types: {medical_devices_df['Nom'].value_counts().to_dict()}")
    
    # Generate diagnostic devices
    print("\n2. Génération de 100 appareils de diagnostic...")
    diagnostic_devices_df = generate_diagnostic_devices(100)
    diagnostic_devices_file = os.path.join(OUTPUT_DIR, "import_diagnostic_devices.xlsx")
    diagnostic_devices_df.to_excel(diagnostic_devices_file, index=False, engine='openpyxl')
    print(f"   ✓ Fichier créé: {diagnostic_devices_file}")
    print(f"   - Nombre d'appareils: {len(diagnostic_devices_df)}")
    print(f"   - Types: {diagnostic_devices_df['Nom'].value_counts().to_dict()}")
    
    # Generate accessories
    print("\n3. Génération de 200 accessoires avec quantités variées...")
    accessories_df = generate_accessories(200)
    accessories_file = os.path.join(OUTPUT_DIR, "import_accessories.xlsx")
    accessories_df.to_excel(accessories_file, index=False, engine='openpyxl')
    print(f"   ✓ Fichier créé: {accessories_file}")
    print(f"   - Nombre d'accessoires: {len(accessories_df)}")
    print(f"   - Quantité totale en stock: {accessories_df['Quantité en Stock'].sum()}")
    print(f"   - Quantité moyenne: {accessories_df['Quantité en Stock'].mean():.1f}")
    print(f"   - Quantité min/max: {accessories_df['Quantité en Stock'].min()}/{accessories_df['Quantité en Stock'].max()}")
    
    # Generate spare parts
    print("\n4. Génération de 300 pièces de rechange avec quantités variées...")
    spare_parts_df = generate_spare_parts(300)
    spare_parts_file = os.path.join(OUTPUT_DIR, "import_spare_parts.xlsx")
    spare_parts_df.to_excel(spare_parts_file, index=False, engine='openpyxl')
    print(f"   ✓ Fichier créé: {spare_parts_file}")
    print(f"   - Nombre de pièces: {len(spare_parts_df)}")
    print(f"   - Quantité totale en stock: {spare_parts_df['Quantité en Stock'].sum()}")
    print(f"   - Quantité moyenne: {spare_parts_df['Quantité en Stock'].mean():.1f}")
    print(f"   - Quantité min/max: {spare_parts_df['Quantité en Stock'].min()}/{spare_parts_df['Quantité en Stock'].max()}")
    
    # Summary
    print("\n" + "="*60)
    print("RÉSUMÉ DE LA GÉNÉRATION")
    print("="*60)
    print(f"✓ 4 fichiers Excel générés avec succès")
    print(f"✓ Total d'éléments créés: {100 + 100 + 200 + 300} items")
    print(f"✓ Emplacement de stock: '{STOCK_LOCATION}' (correspond à la DB)")
    print("\nFichiers générés:")
    print(f"  1. {os.path.basename(medical_devices_file)}")
    print(f"  2. {os.path.basename(diagnostic_devices_file)}")
    print(f"  3. {os.path.basename(accessories_file)}")
    print(f"  4. {os.path.basename(spare_parts_file)}")
    print("\n⚠️  IMPORTANT: L'emplacement de stock utilisé est")
    print(f"   '{STOCK_LOCATION}' (tel qu'il existe dans la base de données)")
    print("\nPour utiliser ces fichiers:")
    print("1. Allez sur http://localhost:3000/roles/admin/appareils")
    print("2. Sélectionnez l'onglet approprié (Appareils Médicaux, Diagnostic, etc.)")
    print("3. Cliquez sur le bouton d'importation")
    print("4. Sélectionnez le fichier Excel correspondant")

if __name__ == "__main__":
    main()