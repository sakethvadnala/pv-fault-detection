import re
import pandas as pd

FEATURES = [
    "Voltage",
    "Current",
    "Power",
    "Irradiance",
    "Temperature",
]

# Different names commonly used for the same PV feature
ALIASES = {
    "Voltage": [
        "voltage",
        "dc voltage",
        "dc_voltage",
        "pv voltage",
        "pv_voltage",
        "ac voltage",
        "ac_voltage",
        "voltage v",
        "voltage_v",
        "v",
    ],
    "Current": [
        "current",
        "dc current",
        "dc_current",
        "pv current",
        "pv_current",
        "ac current",
        "ac_current",
        "current a",
        "current_a",
        "i",
    ],
    "Power": [
        "power",
        "pv power",
        "pv_power",
        "dc power",
        "dc_power",
        "ac power",
        "ac_power",
        "output power",
        "output_power",
        "power w",
        "power_w",
        "power kw",
        "power_kw",
        "p",
    ],
    "Irradiance": [
        "irradiance",
        "solar irradiance",
        "solar_irradiance",
        "poa",
        "poa irradiance",
        "poa_irradiance",
        "ghi",
        "radiation",
        "solar radiation",
        "solar_radiation",
    ],
    "Temperature": [
        "temperature",
        "temp",
        "module temp",
        "module_temp",
        "module temperature",
        "module_temperature",
        "panel temp",
        "panel_temp",
        "panel temperature",
        "panel_temperature",
        "cell temp",
        "cell_temp",
        "cell temperature",
        "cell_temperature",
        "ambient temp",
        "ambient_temp",
        "ambient temperature",
        "ambient_temperature",
    ],
}


def normalize_column_name(name: str) -> str:
    """Convert column names into a consistent format."""
    name = str(name).strip().lower()
    name = re.sub(r"[^a-z0-9]+", " ", name)
    return " ".join(name.split())


def find_feature_columns(df: pd.DataFrame):
    """
    Automatically identify PV feature columns from different naming styles.
    Returns:
        mapping: canonical feature -> original column
        ignored_columns: columns not used by the model
    """

    normalized_columns = {
        normalize_column_name(col): col
        for col in df.columns
    }

    mapping = {}

    for feature, aliases in ALIASES.items():
        normalized_aliases = {
            normalize_column_name(alias)
            for alias in aliases
        }

        for normalized_name, original_column in normalized_columns.items():
            if normalized_name in normalized_aliases:
                mapping[feature] = original_column
                break

    ignored_columns = [
        col for col in df.columns
        if col not in mapping.values()
    ]

    return mapping, ignored_columns


def preprocess_dataset(df: pd.DataFrame):
    """
    Preprocess a labelled training dataset.

    Training still requires the canonical feature set and Fault column.
    """

    mapping, ignored_columns = find_feature_columns(df)

    missing_features = [
        feature for feature in FEATURES
        if feature not in mapping
    ]

    if missing_features:
        raise ValueError(
            f"Missing required PV features: {missing_features}"
        )

    if "Fault" not in df.columns:
        raise ValueError("Missing required column: Fault")

    X = df[
        [mapping[feature] for feature in FEATURES]
    ].copy()

    # Rename to the canonical names expected by the model
    X.columns = FEATURES

    y = df["Fault"]

    return X, y


def map_pv_features(df: pd.DataFrame):
    """
    Map an uploaded PV dataset to the model's expected features.

    Returns:
        X
        mapping
        ignored_columns
        missing_features
    """

    mapping, ignored_columns = find_feature_columns(df)

    X = pd.DataFrame(index=df.index)

    for feature in FEATURES:
        if feature in mapping:
            X[feature] = pd.to_numeric(
                df[mapping[feature]],
                errors="coerce"
            )
        else:
            X[feature] = pd.NA

    missing_features = [
        feature for feature in FEATURES
        if feature not in mapping
    ]

    return X, mapping, ignored_columns, missing_features