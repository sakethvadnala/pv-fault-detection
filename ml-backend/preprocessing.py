
import re
import pandas as pd

FEATURES = [
    "Voltage",
    "Current",
    "Power",
    "Irradiance",
    "Temperature",
]

ALIASES = {
    "Voltage": [
        "voltage", "dc voltage", "dc_voltage",
        "pv voltage", "pv_voltage", "ac voltage",
        "ac_voltage", "voltage v", "voltage_v", "v",
    ],
    "Current": [
        "current", "dc current", "dc_current",
        "pv current", "pv_current", "ac current",
        "ac_current", "current a", "current_a", "i",
    ],
    "Power": [
        "power", "pv power", "pv_power",
        "dc power", "dc_power", "ac power",
        "ac_power", "output power", "output_power",
        "power w", "power_w", "power kw", "power_kw", "p",
    ],
    "Irradiance": [
        "irradiance", "solar irradiance", "solar_irradiance",
        "poa", "poa irradiance", "poa_irradiance",
        "ghi", "radiation", "solar radiation", "solar_radiation",
    ],
    "Temperature": [
        "temperature", "temp", "module temp", "module_temp",
        "module temperature", "module_temperature",
        "panel temp", "panel_temp", "panel temperature",
        "panel_temperature", "cell temp", "cell_temp",
        "cell temperature", "cell_temperature",
        "ambient temp", "ambient_temp",
        "ambient temperature", "ambient_temperature",
    ],
}


def normalize_column_name(name):
    """Normalize column names and remove trailing numeric IDs."""
    name = str(name).strip().lower()

    # Supports names such as ac_voltage__2803
    name = re.sub(r"__\d+$", "", name)

    name = re.sub(r"[^a-z0-9]+", " ", name)
    return " ".join(name.split())


def find_feature_columns(df):
    """Return canonical-to-original mappings and ignored columns."""
    normalized_columns = {}

    for col in df.columns:
        normalized = normalize_column_name(col)
        normalized_columns.setdefault(normalized, []).append(col)

    mapping = {}

    for feature, aliases in ALIASES.items():
        normalized_aliases = {
            normalize_column_name(alias) for alias in aliases
        }

        matches = []
        for normalized_name in normalized_aliases:
            matches.extend(normalized_columns.get(normalized_name, []))

        # Avoid silently choosing between multiple matching columns.
        matches = list(dict.fromkeys(matches))

        if len(matches) > 1:
            raise ValueError(
                f"Multiple columns match {feature}: {matches}. "
                "Keep only one matching column or define a clear rule."
            )

        if len(matches) == 1:
            mapping[feature] = matches[0]

    ignored_columns = [
        col for col in df.columns if col not in mapping.values()
    ]

    return mapping, ignored_columns


def map_pv_features(df):
    """
    Map uploaded columns to canonical feature names.
    Returns X, mapping, ignored_columns, missing_features.
    """
    mapping, ignored_columns = find_feature_columns(df)

    missing_features = [
        feature for feature in FEATURES if feature not in mapping
    ]

    X = pd.DataFrame(index=df.index)

    for feature in FEATURES:
        if feature in mapping:
            X[feature] = pd.to_numeric(
                df[mapping[feature]], errors="coerce"
            )
        else:
            X[feature] = float("nan")

    return X[FEATURES], mapping, ignored_columns, missing_features


def validate_mapped_features(X, missing_features):
    """Stop inference when required features or numeric values are invalid."""
    if missing_features:
        raise ValueError(
            f"Missing required PV features: {missing_features}"
        )

    invalid_counts = X[FEATURES].isna().sum()
    invalid_counts = invalid_counts[invalid_counts > 0]

    if not invalid_counts.empty:
        raise ValueError(
            "Missing or non-numeric values found: "
            + ", ".join(
                f"{feature} ({count} rows)"
                for feature, count in invalid_counts.items()
            )
        )

    if not X.empty and not X[FEATURES].map(
        lambda col: col.map(lambda value: abs(value) != float("inf"))
    ).all().all():
        raise ValueError("Infinite values found in the dataset.")

    return X
