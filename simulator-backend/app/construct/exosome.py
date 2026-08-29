"""IV exosome (extracellular-vesicle) delivery designer (Track A/B carrier).

Exosomes are natural lipid nanovesicles (~30–150 nm) that cells use to shuttle
RNA/protein between each other. As an *injectable* carrier they are being studied
because they (a) are low-immunogenicity / self-derived, (b) can be surface-
engineered to home to a tissue, and (c) carry mRNA/protein/small-molecule cargo —
so for the OSK reprogramming payload they sidestep AAV's ~4.7 kb packaging ceiling
entirely (all three factors ride along as mRNA).

This produces a *research delivery spec*, not a validated formulation. Everything
is illustrative — no dose, no clinical claim.
"""
from __future__ import annotations

# Tissue → surface-targeting strategy (all real, literature-reported EV homing).
_TARGETING = {
    "retina": {"ligand": "RGD / intravitreal-tropic peptide",
               "note": "Retina is behind the blood–retina barrier; IV homing is limited — "
                       "local (intravitreal) injection of the exosomes is usually preferred."},
    "cns": {"ligand": "RVG peptide (rabies-virus glycoprotein) on Lamp2b",
            "note": "RVG-displaying exosomes cross the blood–brain barrier after IV dosing "
                    "(the classic Alvarez-Erviti approach)."},
    "systemic": {"ligand": "None (native circulation) + CD47 'don't-eat-me' display",
                 "note": "CD47 extends circulation time for systemic/immune targets."},
    "immune": {"ligand": "None (native uptake by PBMCs/spleen)",
               "note": "Immune cells take up circulating exosomes readily; ex-vivo loading is also common."},
    "joint": {"ligand": "Chondrocyte-affinity peptide (local injection)",
              "note": "Intra-articular injection localises the exosomes to the joint."},
    "liver": {"ligand": "None (native hepatic tropism)",
              "note": "IV exosomes are naturally cleared to the liver — convenient for hepatic targets."},
    "lung": {"ligand": "None (first-pass lung capture) or inhaled",
             "note": "IV exosomes show significant lung uptake; nebulised delivery is an alternative."},
    "heart": {"ligand": "Cardiac-homing peptide (CHP)", "note": "CHP-engineered exosomes enrich in myocardium."},
    "skin": {"ligand": "Local injection", "note": "Local delivery for dermal/cosmetic targets."},
    "pancreas": {"ligand": "GLP-1 / islet-homing peptide", "note": "Islet-targeting ligands under study."},
    "gut": {"ligand": "None (oral/local or IV)", "note": "Gut delivery often uses oral or local routes."},
    "bone": {"ligand": "Bone-targeting (aspartate) peptide", "note": "Aspartate-rich peptides home to bone."},
}

_SOURCE_CELLS = {
    "osk": "HEK293T or autologous MSC producer cells (transfected to secrete OSK-mRNA-loaded exosomes)",
    "molecule": "Autologous/allogeneic MSC-derived exosomes (drug loaded after purification)",
}

_LOADING = {
    "osk": "Endogenous loading — producer cells express OCT4/SOX2/KLF4 mRNA (+ an RNA-packaging tag) "
           "so nascent exosomes encapsulate the transcripts; harvested by ultracentrifugation / TFF.",
    "molecule": "Exogenous loading — small molecule loaded into purified exosomes by sonication / "
                "electroporation / incubation, then re-purified.",
}


def design_exosome_delivery(
    *,
    payload: str = "osk",           # 'osk' (reprogramming) | 'molecule'
    tissue_key: str = "systemic",
    tissue_label: str = "",
    molecule_smiles: str | None = None,
) -> dict:
    tgt = _TARGETING.get(tissue_key, _TARGETING["systemic"])
    is_osk = payload == "osk"

    cargo = (
        "Tri-cistronic OSK mRNA — OCT4 + SOX2 + KLF4 as a single 2A-linked transcript "
        "(transient, non-integrating; expression decays as mRNA is degraded → intrinsically "
        "'partial/pulsed' reprogramming)."
        if is_osk else
        f"Small molecule{f' ({molecule_smiles})' if molecule_smiles else ''} loaded into the exosome lumen."
    )

    advantages = [
        "Low immunogenicity — vesicles can be made from the patient's own (autologous) cells.",
        "Surface-engineerable — display a homing ligand for tissue targeting.",
        "Re-dosable — unlike AAV, no neutralising-antibody problem on repeat IV dosing.",
    ]
    if is_osk:
        advantages.insert(
            0,
            "No packaging-size ceiling — all three OSK factors ride as mRNA, so there is NO "
            "AAV ~4.7 kb limit and NO dual-vector split needed.",
        )
        advantages.append(
            "Transient by design — mRNA cargo is degraded within days, matching the "
            "brief 'dox-on' pulse used for safe partial reprogramming.",
        )

    spec = {
        "carrier": "IV exosome (extracellular vesicle)",
        "payload": "OSK reprogramming (mRNA)" if is_osk else "novel small molecule",
        "route": "Intravenous infusion" if tissue_key not in ("retina", "joint", "skin") else "Local injection",
        "vesicle_size_nm": "30–150",
        "source_cell": _SOURCE_CELLS["osk" if is_osk else "molecule"],
        "cargo": cargo,
        "loading_method": _LOADING["osk" if is_osk else "molecule"],
        "targeting": {
            "tissue": tissue_label or tissue_key,
            "ligand": tgt["ligand"],
            "note": tgt["note"],
        },
        "advantages": advantages,
        "control": (
            "Dose = number of vesicles + cargo copy number; 'pulsing' is achieved by "
            "spaced infusions rather than a dox switch (the mRNA is inherently transient)."
            if is_osk else
            "Dose = vesicle count × drug loading; standard IV pharmacokinetics apply."
        ),
        "disclaimer": (
            "Illustrative research delivery design using established exosome-engineering "
            "concepts — not a validated formulation, not clinical-grade, no dose given, "
            "not medical advice."
        ),
    }
    return spec
