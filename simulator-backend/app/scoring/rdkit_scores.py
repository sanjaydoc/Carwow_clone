"""SMILES scoring via RDKit (D5).

RDKit is optional. When present we compute real medicinal-chemistry metrics;
when absent we return validity-unknown so the pipeline still runs (the
De-Novo-LLM repo's `denovo evaluate` can be used for full metrics instead).
"""
from __future__ import annotations

try:  # pragma: no cover - depends on optional dep
    from rdkit import Chem, RDLogger
    from rdkit.Chem import Crippen, Descriptors, Lipinski, QED

    RDLogger.DisableLog("rdApp.*")
    _HAVE_RDKIT = True
except Exception:  # noqa: BLE001
    _HAVE_RDKIT = False


def rdkit_available() -> bool:
    return _HAVE_RDKIT


def score_smiles(smiles: str) -> dict:
    """Return validity + drug-likeness metrics for one SMILES string."""
    if not _HAVE_RDKIT:
        return {"rdkit": False, "valid": None}
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"rdkit": True, "valid": False}
    mw = Descriptors.MolWt(mol)
    logp = Crippen.MolLogP(mol)
    hbd = Lipinski.NumHDonors(mol)
    hba = Lipinski.NumHAcceptors(mol)
    # Lipinski Rule of Five: at most one violation is acceptable.
    violations = sum([mw > 500, logp > 5, hbd > 5, hba > 10])
    return {
        "rdkit": True,
        "valid": True,
        "canonical": Chem.MolToSmiles(mol),
        "mw": round(mw, 1),
        "logp": round(logp, 2),
        "hbd": hbd,
        "hba": hba,
        "qed": round(QED.qed(mol), 3),          # 0..1 drug-likeness
        "lipinski_violations": violations,
        "lipinski_pass": violations <= 1,
    }
